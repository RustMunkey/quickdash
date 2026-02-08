"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, Calendar01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"
import { MediaUploader, type MediaItem } from "@/components/media-uploader"
import { createAuction, updateAuction, publishAuction } from "../actions"
import { toast } from "sonner"
import type { Auction } from "@quickdash/db/schema"

type Product = {
	id: string
	name: string
	thumbnail: string | null
	price: string
}

interface AuctionFormProps {
	auction?: Auction & {
		product: { id: string; name: string; slug: string; thumbnail: string | null } | null
	}
	products: Product[]
}

export function AuctionForm({ auction, products }: AuctionFormProps) {
	const router = useRouter()
	const isEditing = !!auction

	// Form state
	const [title, setTitle] = React.useState(auction?.title ?? "")
	const [description, setDescription] = React.useState(auction?.description ?? "")
	const [type, setType] = React.useState<"reserve" | "no_reserve">(auction?.type ?? "reserve")
	const [startingPrice, setStartingPrice] = React.useState(auction?.startingPrice ?? "")
	const [reservePrice, setReservePrice] = React.useState(auction?.reservePrice ?? "")
	const [minimumIncrement, setMinimumIncrement] = React.useState(auction?.minimumIncrement ?? "1.00")
	const [productId, setProductId] = React.useState<string | undefined>(auction?.productId ?? undefined)
	const [autoExtend, setAutoExtend] = React.useState(auction?.autoExtend ?? true)
	const [autoExtendMinutes, setAutoExtendMinutes] = React.useState(auction?.autoExtendMinutes ?? 5)

	// Images state
	const [mediaItems, setMediaItems] = React.useState<MediaItem[]>(() => {
		const items: MediaItem[] = []
		for (const url of auction?.images ?? []) {
			items.push({
				id: crypto.randomUUID(),
				url,
				type: /\.(mp4|webm|mov|avi)(\?|$)/i.test(url) ? "video" : "image",
			})
		}
		return items
	})

	// Date/time state
	const [startsAt, setStartsAt] = React.useState(() => {
		if (auction?.startsAt) {
			return new Date(auction.startsAt).toISOString().slice(0, 16)
		}
		return ""
	})
	const [endsAt, setEndsAt] = React.useState(() => {
		if (auction?.endsAt) {
			return new Date(auction.endsAt).toISOString().slice(0, 16)
		}
		return ""
	})

	const [loading, setLoading] = React.useState(false)

	useBreadcrumbOverride(isEditing ? auction.id : "new", isEditing ? auction.title : "New Auction")

	const handleSubmit = async (e: React.FormEvent, publish = false) => {
		e.preventDefault()

		if (!title.trim()) {
			toast.error("Title is required")
			return
		}
		if (!startingPrice) {
			toast.error("Starting price is required")
			return
		}
		if (publish && (!startsAt || !endsAt)) {
			toast.error("Start and end times are required to publish")
			return
		}

		setLoading(true)
		try {
			const data = {
				title: title.trim(),
				description: description.trim() || undefined,
				type,
				startingPrice,
				reservePrice: type === "reserve" ? reservePrice || undefined : undefined,
				minimumIncrement,
				productId: productId || undefined,
				images: mediaItems.map((i) => i.url),
				autoExtend,
				autoExtendMinutes,
				startsAt: startsAt ? new Date(startsAt) : undefined,
				endsAt: endsAt ? new Date(endsAt) : undefined,
			}

			if (isEditing) {
				await updateAuction(auction.id, data)
				if (publish) {
					await publishAuction(auction.id)
					toast.success("Auction published!")
				} else {
					toast.success("Auction updated!")
				}
			} else {
				const newAuction = await createAuction(data)
				if (publish) {
					await publishAuction(newAuction.id)
					toast.success("Auction created and published!")
				} else {
					toast.success("Auction saved as draft!")
				}
				router.push(`/auctions/${newAuction.id}`)
				return
			}

			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to save auction")
		} finally {
			setLoading(false)
		}
	}

	return (
		<form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => router.back()}
					>
						<HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
					</Button>
					<div>
						<h2 className="text-lg font-semibold">
							{isEditing ? "Edit Auction" : "Create Auction"}
						</h2>
						<p className="text-sm text-muted-foreground">
							{isEditing ? "Update auction details" : "Set up a new auction"}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button type="submit" variant="outline" disabled={loading}>
						{loading ? "Saving..." : "Save Draft"}
					</Button>
					<Button
						type="button"
						onClick={(e) => handleSubmit(e, true)}
						disabled={loading}
					>
						{loading ? "Publishing..." : "Publish"}
					</Button>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Auction Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="title">Title</Label>
								<Input
									id="title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="e.g., Rare Blue Sapphire 2.5ct"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="description">Description</Label>
								<Textarea
									id="description"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Describe the item being auctioned..."
									rows={4}
								/>
							</div>

							<div className="space-y-2">
								<Label>Media</Label>
								<MediaUploader items={mediaItems} onChange={setMediaItems} />
								<p className="text-xs text-muted-foreground">
									Add photos and videos of the auction item
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="product">Link to Product (optional)</Label>
								<Select value={productId} onValueChange={setProductId}>
									<SelectTrigger>
										<SelectValue placeholder="Select a product..." />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">No product linked</SelectItem>
										{products.map((product) => (
											<SelectItem key={product.id} value={product.id}>
												{product.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-xs text-muted-foreground">
									Link to an existing product for inventory tracking
								</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Pricing</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="type">Auction Type</Label>
								<Select value={type} onValueChange={(v) => setType(v as "reserve" | "no_reserve")}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="reserve">Reserve Auction</SelectItem>
										<SelectItem value="no_reserve">No Reserve Auction</SelectItem>
									</SelectContent>
								</Select>
								<p className="text-xs text-muted-foreground">
									{type === "reserve"
										? "Item won't sell unless bidding reaches the reserve price"
										: "Item sells to the highest bidder regardless of price"}
								</p>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="startingPrice">Starting Price</Label>
									<div className="relative">
										<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
											$
										</span>
										<Input
											id="startingPrice"
											type="number"
											step="0.01"
											min="0"
											value={startingPrice}
											onChange={(e) => setStartingPrice(e.target.value)}
											className="pl-7"
											placeholder="0.00"
										/>
									</div>
								</div>

								{type === "reserve" && (
									<div className="space-y-2">
										<Label htmlFor="reservePrice">Reserve Price</Label>
										<div className="relative">
											<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
												$
											</span>
											<Input
												id="reservePrice"
												type="number"
												step="0.01"
												min="0"
												value={reservePrice}
												onChange={(e) => setReservePrice(e.target.value)}
												className="pl-7"
												placeholder="0.00"
											/>
										</div>
										<p className="text-xs text-muted-foreground">
											Minimum price for the item to sell (hidden from bidders)
										</p>
									</div>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="minimumIncrement">Minimum Bid Increment</Label>
								<div className="relative">
									<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
										$
									</span>
									<Input
										id="minimumIncrement"
										type="number"
										step="0.01"
										min="0.01"
										value={minimumIncrement}
										onChange={(e) => setMinimumIncrement(e.target.value)}
										className="pl-7"
										placeholder="1.00"
									/>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Schedule</CardTitle>
							<CardDescription>When does the auction run?</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="startsAt">Start Time</Label>
								<Input
									id="startsAt"
									type="datetime-local"
									value={startsAt}
									onChange={(e) => setStartsAt(e.target.value)}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="endsAt">End Time</Label>
								<Input
									id="endsAt"
									type="datetime-local"
									value={endsAt}
									onChange={(e) => setEndsAt(e.target.value)}
								/>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Auto-Extend</CardTitle>
							<CardDescription>
								Prevent sniping by extending the auction
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center justify-between">
								<Label htmlFor="autoExtend">Enable Auto-Extend</Label>
								<Switch
									id="autoExtend"
									checked={autoExtend}
									onCheckedChange={setAutoExtend}
								/>
							</div>
							{autoExtend && (
								<div className="space-y-2">
									<Label htmlFor="autoExtendMinutes">
										Extend by (minutes)
									</Label>
									<Input
										id="autoExtendMinutes"
										type="number"
										min="1"
										max="30"
										value={autoExtendMinutes}
										onChange={(e) => setAutoExtendMinutes(parseInt(e.target.value) || 5)}
									/>
									<p className="text-xs text-muted-foreground">
										If a bid is placed in the last {autoExtendMinutes} minutes,
										the auction extends by {autoExtendMinutes} minutes
									</p>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</form>
	)
}
