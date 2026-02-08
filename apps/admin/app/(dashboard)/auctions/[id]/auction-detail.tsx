"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
	ArrowLeft01Icon,
	PencilEdit01Icon,
	StopIcon,
	Clock01Icon,
	UserIcon,
	StarIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"
import { usePusher } from "@/components/pusher-provider"
import { formatDistanceToNow, format } from "date-fns"
import { cancelAuction, endAuction, publishAuction } from "../actions"
import { toast } from "sonner"
import type { Auction } from "@quickdash/db/schema"

type BidItem = {
	id: string
	amount: string
	isWinning: boolean | null
	createdAt: Date
	bidderName: string | null
	bidderEmail: string | null
}

type Product = {
	id: string
	name: string
	thumbnail: string | null
	price: string
}

interface AuctionDetailProps {
	auction: Auction & {
		product: { id: string; name: string; slug: string; thumbnail: string | null } | null
		currentBidder: { id: string; name: string | null; email: string } | null
		winner: { id: string; name: string | null; email: string } | null
	}
	bidHistory: BidItem[]
	products: Product[]
}

function formatPrice(price: string | null) {
	if (!price) return "—"
	return `$${parseFloat(price).toFixed(2)}`
}

function getStatusBadge(status: string) {
	switch (status) {
		case "draft":
			return <Badge variant="secondary">Draft</Badge>
		case "scheduled":
			return <Badge variant="outline">Scheduled</Badge>
		case "active":
			return <Badge variant="default">Active</Badge>
		case "ended":
			return <Badge variant="secondary">Ended</Badge>
		case "sold":
			return <Badge className="bg-green-600 hover:bg-green-600">Sold</Badge>
		case "unsold":
			return <Badge variant="destructive">Unsold</Badge>
		case "cancelled":
			return <Badge variant="destructive">Cancelled</Badge>
		default:
			return <Badge variant="secondary">{status}</Badge>
	}
}

function CountdownTimer({ endsAt }: { endsAt: Date }) {
	const [timeLeft, setTimeLeft] = React.useState("")

	React.useEffect(() => {
		const update = () => {
			const now = new Date()
			const diff = endsAt.getTime() - now.getTime()

			if (diff <= 0) {
				setTimeLeft("Ended")
				return
			}

			const hours = Math.floor(diff / (1000 * 60 * 60))
			const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
			const seconds = Math.floor((diff % (1000 * 60)) / 1000)

			if (hours > 24) {
				const days = Math.floor(hours / 24)
				setTimeLeft(`${days}d ${hours % 24}h`)
			} else if (hours > 0) {
				setTimeLeft(`${hours}h ${minutes}m`)
			} else {
				setTimeLeft(`${minutes}m ${seconds}s`)
			}
		}

		update()
		const interval = setInterval(update, 1000)
		return () => clearInterval(interval)
	}, [endsAt])

	return <span className="font-mono text-2xl font-bold">{timeLeft}</span>
}

export function AuctionDetail({ auction: initialAuction, bidHistory: initialBidHistory, products }: AuctionDetailProps) {
	const router = useRouter()
	const { pusher, isConnected, workspaceId } = usePusher()

	const [auction, setAuction] = React.useState(initialAuction)
	const [bids, setBids] = React.useState(initialBidHistory)
	const [cancelOpen, setCancelOpen] = React.useState(false)
	const [endOpen, setEndOpen] = React.useState(false)
	const [loading, setLoading] = React.useState(false)

	useBreadcrumbOverride(auction.id, auction.title)

	// Real-time updates
	React.useEffect(() => {
		if (!pusher || !isConnected || !workspaceId) return

		const channelName = `private-workspace-${workspaceId}-auctions`
		const channel = pusher.subscribe(channelName)

		channel.bind("auction:bid-placed", (data: {
			auctionId: string
			bidId: string
			amount: string
			bidderName: string
			bidCount: number
			reserveMet: boolean
		}) => {
			if (data.auctionId !== auction.id) return

			// Update auction state
			setAuction((prev) => ({
				...prev,
				currentBid: data.amount,
				bidCount: data.bidCount,
				reserveMet: data.reserveMet,
			}))

			// Add bid to history
			setBids((prev) => [
				{
					id: data.bidId,
					amount: data.amount,
					isWinning: false,
					createdAt: new Date(),
					bidderName: data.bidderName,
					bidderEmail: null,
				},
				...prev,
			])
		})

		channel.bind("auction:extended", (data: { auctionId: string; newEndsAt: string }) => {
			if (data.auctionId !== auction.id) return

			setAuction((prev) => ({
				...prev,
				endsAt: new Date(data.newEndsAt),
			}))

			toast.info("Auction extended due to late bid!")
		})

		channel.bind("auction:ended", (data: { auctionId: string; status: "ended" | "sold" | "unsold"; winnerId?: string; winningBid?: string }) => {
			if (data.auctionId !== auction.id) return

			setAuction((prev) => ({
				...prev,
				status: data.status,
				winnerId: data.winnerId ?? null,
				winningBid: data.winningBid ?? null,
			}))

			router.refresh()
		})

		return () => {
			channel.unbind_all()
			pusher.unsubscribe(channelName)
		}
	}, [pusher, isConnected, workspaceId, auction.id, router])

	const handleCancel = async () => {
		setLoading(true)
		try {
			await cancelAuction(auction.id)
			toast.success("Auction cancelled")
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to cancel")
		} finally {
			setLoading(false)
			setCancelOpen(false)
		}
	}

	const handleEnd = async () => {
		setLoading(true)
		try {
			await endAuction(auction.id)
			toast.success("Auction ended")
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to end")
		} finally {
			setLoading(false)
			setEndOpen(false)
		}
	}

	const handlePublish = async () => {
		setLoading(true)
		try {
			await publishAuction(auction.id)
			toast.success("Auction published!")
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to publish")
		} finally {
			setLoading(false)
		}
	}

	const isActive = auction.status === "active"
	const isDraft = auction.status === "draft"
	const isScheduled = auction.status === "scheduled"
	const isClosed = ["ended", "sold", "unsold", "cancelled"].includes(auction.status)

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => router.push("/auctions")}
					>
						<HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
					</Button>
					<div>
						<div className="flex items-center gap-2">
							<h2 className="text-lg font-semibold">{auction.title}</h2>
							{getStatusBadge(auction.status)}
						</div>
						<p className="text-sm text-muted-foreground capitalize">
							{auction.type === "no_reserve" ? "No Reserve" : "Reserve"} Auction
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{isDraft && (
						<>
							<Button
								variant="outline"
								onClick={() => router.push(`/auctions/${auction.id}?edit=true`)}
							>
								<HugeiconsIcon icon={PencilEdit01Icon} size={14} className="mr-1" />
								Edit
							</Button>
							<Button onClick={handlePublish} disabled={loading}>
								Publish
							</Button>
						</>
					)}
					{isScheduled && (
						<Button
							variant="outline"
							onClick={() => router.push(`/auctions/${auction.id}?edit=true`)}
						>
							<HugeiconsIcon icon={PencilEdit01Icon} size={14} className="mr-1" />
							Edit
						</Button>
					)}
					{isActive && (
						<Button variant="destructive" onClick={() => setEndOpen(true)}>
							<HugeiconsIcon icon={StopIcon} size={14} className="mr-1" />
							End Early
						</Button>
					)}
					{(isDraft || isScheduled || isActive) && (
						<Button variant="ghost" onClick={() => setCancelOpen(true)}>
							Cancel
						</Button>
					)}
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Current Bid Card */}
					<Card>
						<CardContent className="pt-6">
							<div className="grid gap-6 md:grid-cols-2">
								<div>
									<p className="text-sm text-muted-foreground mb-1">Current Bid</p>
									<p className="text-3xl font-bold">
										{auction.currentBid ? formatPrice(auction.currentBid) : formatPrice(auction.startingPrice)}
									</p>
									<p className="text-sm text-muted-foreground mt-1">
										{auction.bidCount} bid{auction.bidCount !== 1 ? "s" : ""}
										{auction.reserveMet && auction.type === "reserve" && (
											<span className="ml-2 text-green-600 font-medium">Reserve met</span>
										)}
									</p>
								</div>

								{isActive && auction.endsAt && (
									<div>
										<p className="text-sm text-muted-foreground mb-1">Time Remaining</p>
										<CountdownTimer endsAt={new Date(auction.endsAt)} />
										<p className="text-xs text-muted-foreground mt-1">
											Ends {format(new Date(auction.endsAt), "MMM d, yyyy 'at' h:mm a")}
										</p>
									</div>
								)}

								{isClosed && auction.status === "sold" && (
									<div>
										<p className="text-sm text-muted-foreground mb-1">Winning Bid</p>
										<p className="text-3xl font-bold text-green-600">
											{formatPrice(auction.winningBid)}
										</p>
										{auction.winner && (
											<p className="text-sm text-muted-foreground mt-1">
												Won by {auction.winner.name || auction.winner.email}
											</p>
										)}
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Description */}
					{auction.description && (
						<Card>
							<CardHeader>
								<CardTitle>Description</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="whitespace-pre-wrap">{auction.description}</p>
							</CardContent>
						</Card>
					)}

					{/* Bid History */}
					<Card>
						<CardHeader>
							<CardTitle>Bid History</CardTitle>
							<CardDescription>
								{bids.length} bid{bids.length !== 1 ? "s" : ""} placed
							</CardDescription>
						</CardHeader>
						<CardContent>
							{bids.length === 0 ? (
								<p className="text-muted-foreground text-center py-8">
									No bids yet
								</p>
							) : (
								<div className="space-y-3">
									{bids.map((bid, index) => (
										<div
											key={bid.id}
											className={`flex items-center justify-between p-3 rounded-lg ${
												index === 0 ? "bg-primary/5 border border-primary/20" : "bg-muted/50"
											}`}
										>
											<div className="flex items-center gap-3">
												<div className="size-8 rounded-full bg-muted flex items-center justify-center">
													{bid.isWinning ? (
														<HugeiconsIcon icon={StarIcon} size={14} className="text-yellow-500" />
													) : (
														<HugeiconsIcon icon={UserIcon} size={14} />
													)}
												</div>
												<div>
													<p className="font-medium">
														{bid.bidderName || bid.bidderEmail || "Anonymous"}
													</p>
													<p className="text-xs text-muted-foreground">
														{formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true })}
													</p>
												</div>
											</div>
											<p className="font-bold">{formatPrice(bid.amount)}</p>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Auction Info */}
					<Card>
						<CardHeader>
							<CardTitle>Auction Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<p className="text-sm text-muted-foreground">Starting Price</p>
								<p className="font-medium">{formatPrice(auction.startingPrice)}</p>
							</div>

							{auction.type === "reserve" && (
								<div>
									<p className="text-sm text-muted-foreground">Reserve Price</p>
									<p className="font-medium">
										{auction.reservePrice ? formatPrice(auction.reservePrice) : "Not set"}
									</p>
								</div>
							)}

							<div>
								<p className="text-sm text-muted-foreground">Minimum Increment</p>
								<p className="font-medium">{formatPrice(auction.minimumIncrement)}</p>
							</div>

							<Separator />

							{auction.startsAt && (
								<div>
									<p className="text-sm text-muted-foreground">Starts</p>
									<p className="font-medium">
										{format(new Date(auction.startsAt), "MMM d, yyyy 'at' h:mm a")}
									</p>
								</div>
							)}

							{auction.endsAt && (
								<div>
									<p className="text-sm text-muted-foreground">Ends</p>
									<p className="font-medium">
										{format(new Date(auction.endsAt), "MMM d, yyyy 'at' h:mm a")}
									</p>
								</div>
							)}

							{auction.autoExtend && (
								<div>
									<p className="text-sm text-muted-foreground">Auto-Extend</p>
									<p className="font-medium">
										{auction.autoExtendMinutes} minutes if bid near end
									</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Linked Product */}
					{auction.product && (
						<Card>
							<CardHeader>
								<CardTitle>Linked Product</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex items-center gap-3">
									{auction.product.thumbnail ? (
										<img
											src={auction.product.thumbnail}
											alt={auction.product.name}
											className="size-12 rounded object-cover"
										/>
									) : (
										<div className="size-12 rounded bg-muted" />
									)}
									<div>
										<p className="font-medium">{auction.product.name}</p>
										<Button
											variant="link"
											className="h-auto p-0 text-xs"
											onClick={() => router.push(`/products/${auction.product!.id}`)}
										>
											View Product
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Current High Bidder */}
					{auction.currentBidder && isActive && (
						<Card>
							<CardHeader>
								<CardTitle>High Bidder</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex items-center gap-3">
									<div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
										<HugeiconsIcon icon={UserIcon} size={18} className="text-primary" />
									</div>
									<div>
										<p className="font-medium">
											{auction.currentBidder.name || auction.currentBidder.email}
										</p>
										<p className="text-xs text-muted-foreground">
											{auction.currentBidder.email}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</div>

			{/* Cancel Dialog */}
			<AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel this auction?</AlertDialogTitle>
						<AlertDialogDescription>
							This will cancel the auction and notify all bidders. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep Auction</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleCancel}
							disabled={loading}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{loading ? "Cancelling..." : "Cancel Auction"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* End Early Dialog */}
			<AlertDialog open={endOpen} onOpenChange={setEndOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>End auction early?</AlertDialogTitle>
						<AlertDialogDescription>
							This will immediately end the auction and determine the winner based on current bids.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep Running</AlertDialogCancel>
						<AlertDialogAction onClick={handleEnd} disabled={loading}>
							{loading ? "Ending..." : "End Auction"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
