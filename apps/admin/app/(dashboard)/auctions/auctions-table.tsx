"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
	MoreHorizontalIcon,
	ViewIcon,
	PencilEdit01Icon,
	Delete02Icon,
	PlayIcon,
	StopIcon,
	Clock01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { DataTable, Column } from "@/components/data-table"
import { formatDistanceToNow, format } from "date-fns"
import { cancelAuction, deleteAuction, endAuction, publishAuction, bulkDeleteAuctions } from "./actions"
import { toast } from "sonner"
import { usePusher } from "@/components/pusher-provider"

type AuctionItem = {
	id: string
	title: string
	type: "reserve" | "no_reserve"
	status: string
	startingPrice: string
	currentBid: string | null
	bidCount: number
	reserveMet: boolean | null
	startsAt: Date | null
	endsAt: Date | null
	createdAt: Date
	images: string[] | null
}

interface AuctionsTableProps {
	auctions: AuctionItem[]
	totalCount: number
	view: "active" | "drafts" | "closed"
}

function formatPrice(price: string | null) {
	if (!price) return "—"
	return `$${parseFloat(price).toFixed(2)}`
}

function getStatusBadge(status: string, reserveMet: boolean | null) {
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

function TimeDisplay({ date, label }: { date: Date | null; label: string }) {
	if (!date) return <span className="text-muted-foreground">—</span>

	const now = new Date()
	const isPast = date < now
	const isSoon = !isPast && date.getTime() - now.getTime() < 60 * 60 * 1000 // within 1 hour

	return (
		<div className="flex flex-col">
			<span className={isSoon ? "text-orange-500 font-medium" : ""}>
				{formatDistanceToNow(date, { addSuffix: true })}
			</span>
			<span className="text-xs text-muted-foreground">
				{format(date, "MMM d, h:mm a")}
			</span>
		</div>
	)
}

export function AuctionsTable({ auctions: initialAuctions, totalCount, view }: AuctionsTableProps) {
	const router = useRouter()
	const { pusher, isConnected, workspaceId } = usePusher()
	const [auctions, setAuctions] = React.useState(initialAuctions)
	const [deleteId, setDeleteId] = React.useState<string | null>(null)
	const [cancelId, setCancelId] = React.useState<string | null>(null)
	const [endId, setEndId] = React.useState<string | null>(null)
	const [loading, setLoading] = React.useState(false)
	const [selectedIds, setSelectedIds] = React.useState<string[]>([])

	const handleBulkDelete = async () => {
		if (selectedIds.length === 0) return
		setLoading(true)
		try {
			await bulkDeleteAuctions(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`Deleted ${selectedIds.length} auction(s)`)
		} catch (err: any) {
			toast.error(err.message || "Failed to delete auctions")
		} finally {
			setLoading(false)
		}
	}

	// Real-time updates
	React.useEffect(() => {
		if (!pusher || !isConnected || !workspaceId) return

		const channelName = `private-workspace-${workspaceId}-auctions`
		const channel = pusher.subscribe(channelName)

		channel.bind("auction:bid-placed", (data: { auctionId: string; amount: string; bidCount: number; reserveMet: boolean }) => {
			setAuctions((prev) =>
				prev.map((a) =>
					a.id === data.auctionId
						? { ...a, currentBid: data.amount, bidCount: data.bidCount, reserveMet: data.reserveMet }
						: a
				)
			)
		})

		channel.bind("auction:ended", (data: { auctionId: string; status: string }) => {
			if (view === "active") {
				setAuctions((prev) => prev.filter((a) => a.id !== data.auctionId))
			}
		})

		channel.bind("auction:created", (data: { auctionId: string }) => {
			// Refresh to get new auction
			router.refresh()
		})

		return () => {
			channel.unbind_all()
			pusher.unsubscribe(channelName)
		}
	}, [pusher, isConnected, workspaceId, view, router])

	// Sync with server data
	React.useEffect(() => {
		setAuctions(initialAuctions)
	}, [initialAuctions])

	const handleDelete = async () => {
		if (!deleteId) return
		setLoading(true)
		try {
			await deleteAuction(deleteId)
			setAuctions((prev) => prev.filter((a) => a.id !== deleteId))
			router.refresh()
		} catch (err) {
			console.error("Failed to delete auction:", err)
		} finally {
			setLoading(false)
			setDeleteId(null)
		}
	}

	const handleCancel = async () => {
		if (!cancelId) return
		setLoading(true)
		try {
			await cancelAuction(cancelId)
			router.refresh()
		} catch (err) {
			console.error("Failed to cancel auction:", err)
		} finally {
			setLoading(false)
			setCancelId(null)
		}
	}

	const handleEnd = async () => {
		if (!endId) return
		setLoading(true)
		try {
			await endAuction(endId)
			router.refresh()
		} catch (err) {
			console.error("Failed to end auction:", err)
		} finally {
			setLoading(false)
			setEndId(null)
		}
	}

	const handlePublish = async (id: string) => {
		setLoading(true)
		try {
			await publishAuction(id)
			router.refresh()
		} catch (err) {
			console.error("Failed to publish auction:", err)
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<AuctionItem>[] = [
		{
			key: "title",
			header: "Auction",
			cell: (auction) => (
				<div className="flex items-center gap-3">
					{auction.images?.[0] ? (
						<img
							src={auction.images[0]}
							alt={auction.title}
							className="size-10 rounded object-cover"
						/>
					) : (
						<div className="size-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
							No img
						</div>
					)}
					<div>
						<p className="font-medium">{auction.title}</p>
						<p className="text-xs text-muted-foreground capitalize">
							{auction.type === "no_reserve" ? "No Reserve" : "Reserve"}
						</p>
					</div>
				</div>
			),
		},
		{
			key: "status",
			header: "Status",
			cell: (auction) => getStatusBadge(auction.status, auction.reserveMet),
		},
		{
			key: "currentBid",
			header: "Current Bid",
			cell: (auction) => (
				<div>
					<p className="font-medium">{formatPrice(auction.currentBid)}</p>
					<p className="text-xs text-muted-foreground">
						{auction.bidCount} bid{auction.bidCount !== 1 ? "s" : ""}
						{auction.reserveMet && auction.type === "reserve" && (
							<span className="ml-1 text-green-600">(Reserve met)</span>
						)}
					</p>
				</div>
			),
		},
		{
			key: "timing",
			header: view === "closed" ? "Ended" : "Ends",
			cell: (auction) => (
				<TimeDisplay
					date={view === "closed" ? auction.endsAt : auction.endsAt}
					label={view === "closed" ? "Ended" : "Ends"}
				/>
			),
		},
		{
			key: "actions",
			header: "",
			cell: (auction) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="size-8">
							<HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => router.push(`/auctions/${auction.id}`)}>
							<HugeiconsIcon icon={ViewIcon} size={14} className="mr-2" />
							View Details
						</DropdownMenuItem>
						{auction.status === "draft" && (
							<>
								<DropdownMenuItem onClick={() => router.push(`/auctions/${auction.id}?edit=true`)}>
									<HugeiconsIcon icon={PencilEdit01Icon} size={14} className="mr-2" />
									Edit
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => handlePublish(auction.id)}>
									<HugeiconsIcon icon={PlayIcon} size={14} className="mr-2" />
									Publish
								</DropdownMenuItem>
							</>
						)}
						{auction.status === "active" && (
							<DropdownMenuItem onClick={() => setEndId(auction.id)}>
								<HugeiconsIcon icon={StopIcon} size={14} className="mr-2" />
								End Early
							</DropdownMenuItem>
						)}
						{["draft", "scheduled", "active"].includes(auction.status) && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() => setCancelId(auction.id)}
									className="text-destructive focus:text-destructive"
								>
									<HugeiconsIcon icon={StopIcon} size={14} className="mr-2" />
									Cancel Auction
								</DropdownMenuItem>
							</>
						)}
						{["draft", "cancelled", "unsold"].includes(auction.status) && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() => setDeleteId(auction.id)}
									className="text-destructive focus:text-destructive"
								>
									<HugeiconsIcon icon={Delete02Icon} size={14} className="mr-2" />
									Delete
								</DropdownMenuItem>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	]

	return (
		<>
			<DataTable
				columns={columns}
				data={auctions}
				totalCount={totalCount}
				searchPlaceholder="Search auctions..."
				getId={(row) => row.id}
				onRowClick={(auction) => router.push(`/auctions/${auction.id}`)}
				selectable
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				bulkActions={<Button size="sm" variant="destructive" disabled={loading} onClick={() => handleBulkDelete()}>Delete</Button>}
				emptyMessage={
					view === "active"
						? "No active auctions. Create one to get started."
						: view === "drafts"
						? "No draft auctions."
						: "No closed auctions yet."
				}
				filters={
					<Button size="sm" className="h-9 hidden sm:flex" onClick={() => router.push("/auctions/new")}>
						Create Auction
					</Button>
				}
			/>

			{/* Delete Confirmation */}
			<AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete auction?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete this auction. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={loading}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{loading ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Cancel Confirmation */}
			<AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel auction?</AlertDialogTitle>
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

			{/* End Early Confirmation */}
			<AlertDialog open={!!endId} onOpenChange={() => setEndId(null)}>
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
		</>
	)
}
