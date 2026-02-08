"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { formatCurrency } from "@/lib/format"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"
import { updateCarrier, deleteCarrier, createRate, deleteRate } from "../actions"

interface Rate {
	id: string
	carrierId: string
	name: string
	minWeight: string | null
	maxWeight: string | null
	flatRate: string | null
	perKgRate: string | null
	estimatedDays: string | null
	isActive: boolean
	createdAt: Date
}

interface CarrierDetailProps {
	carrier: {
		id: string
		name: string
		code: string
		trackingUrlTemplate: string | null
		isActive: boolean
		createdAt: Date
		updatedAt: Date
		rates: Rate[]
	}
}

export function CarrierDetail({ carrier }: CarrierDetailProps) {
	const router = useRouter()
	const [rateOpen, setRateOpen] = useState(false)
	const [rateName, setRateName] = useState("")
	const [flatRate, setFlatRate] = useState("")
	const [perKg, setPerKg] = useState("")
	const [minWeight, setMinWeight] = useState("")
	const [maxWeight, setMaxWeight] = useState("")
	const [estimatedDays, setEstimatedDays] = useState("")
	const [loading, setLoading] = useState(false)

	useBreadcrumbOverride(carrier.id, carrier.name)

	const handleToggleActive = async () => {
		setLoading(true)
		try {
			await updateCarrier(carrier.id, { isActive: !carrier.isActive })
			toast.success(carrier.isActive ? "Carrier deactivated" : "Carrier activated")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to update")
		} finally {
			setLoading(false)
		}
	}

	const handleDelete = async () => {
		setLoading(true)
		try {
			await deleteCarrier(carrier.id)
			toast.success("Carrier deleted")
			router.push("/shipping")
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	const handleCreateRate = async () => {
		if (!rateName.trim()) return
		setLoading(true)
		try {
			await createRate({
				carrierId: carrier.id,
				name: rateName.trim(),
				flatRate: flatRate || undefined,
				perKgRate: perKg || undefined,
				minWeight: minWeight || undefined,
				maxWeight: maxWeight || undefined,
				estimatedDays: estimatedDays || undefined,
			})
			toast.success("Rate added")
			setRateOpen(false)
			setRateName("")
			setFlatRate("")
			setPerKg("")
			setMinWeight("")
			setMaxWeight("")
			setEstimatedDays("")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to add rate")
		} finally {
			setLoading(false)
		}
	}

	const handleDeleteRate = async (id: string) => {
		try {
			await deleteRate(id)
			toast.success("Rate removed")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to remove rate")
		}
	}

	return (
		<>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<h2 className="text-lg font-semibold">{carrier.name}</h2>
					<Badge
						variant="secondary"
						className={`text-[11px] px-1.5 py-0 border-0 ${
							carrier.isActive
								? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
								: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
						}`}
					>
						{carrier.isActive ? "Active" : "Inactive"}
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={handleToggleActive} disabled={loading}>
						{carrier.isActive ? "Deactivate" : "Activate"}
					</Button>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="destructive" size="sm" disabled={loading}>Delete</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete {carrier.name}?</AlertDialogTitle>
								<AlertDialogDescription>
									This will permanently delete this carrier and all its rates.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>

			<div className="grid gap-4 sm:gap-6 md:grid-cols-3">
				<div className="md:col-span-2 space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-medium">Rates</h3>
						<Button size="sm" variant="outline" onClick={() => setRateOpen(true)}>
							Add Rate
						</Button>
					</div>

					{carrier.rates.length === 0 ? (
						<div className="rounded-lg border p-6 text-center">
							<p className="text-sm text-muted-foreground">No rates configured</p>
							<p className="text-xs text-muted-foreground/60 mt-1">Add shipping rates for this carrier.</p>
						</div>
					) : (
						<div className="space-y-2">
							{carrier.rates.map((rate) => (
								<div key={rate.id} className="rounded-lg border p-3 flex items-center justify-between">
									<div>
										<p className="text-sm font-medium">{rate.name}</p>
										<div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
											{rate.flatRate && <span>Flat: {formatCurrency(rate.flatRate)}</span>}
											{rate.perKgRate && <span>{formatCurrency(rate.perKgRate)}/kg</span>}
											{rate.estimatedDays && <span>{rate.estimatedDays} days</span>}
											{rate.minWeight && <span>Min: {rate.minWeight}kg</span>}
											{rate.maxWeight && <span>Max: {rate.maxWeight}kg</span>}
										</div>
									</div>
									<Button
										variant="ghost"
										size="sm"
										className="text-xs text-muted-foreground"
										onClick={() => handleDeleteRate(rate.id)}
									>
										Remove
									</Button>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="space-y-4">
					<div className="rounded-lg border p-4 space-y-3">
						<h3 className="text-sm font-medium">Details</h3>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Code</span>
								<span className="font-mono">{carrier.code}</span>
							</div>
							{carrier.trackingUrlTemplate && (
								<div>
									<span className="text-muted-foreground text-xs">Tracking URL</span>
									<p className="text-xs font-mono break-all mt-0.5">{carrier.trackingUrlTemplate}</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			<Dialog open={rateOpen} onOpenChange={setRateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Rate</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Name</Label>
							<Input value={rateName} onChange={(e) => setRateName(e.target.value)} placeholder="e.g. Standard Shipping" />
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label>Flat Rate ($)</Label>
								<Input value={flatRate} onChange={(e) => setFlatRate(e.target.value)} placeholder="5.99" />
							</div>
							<div>
								<Label>Per Kg Rate ($)</Label>
								<Input value={perKg} onChange={(e) => setPerKg(e.target.value)} placeholder="1.50" />
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label>Min Weight (kg)</Label>
								<Input value={minWeight} onChange={(e) => setMinWeight(e.target.value)} placeholder="0" />
							</div>
							<div>
								<Label>Max Weight (kg)</Label>
								<Input value={maxWeight} onChange={(e) => setMaxWeight(e.target.value)} placeholder="30" />
							</div>
						</div>
						<div>
							<Label>Estimated Days</Label>
							<Input value={estimatedDays} onChange={(e) => setEstimatedDays(e.target.value)} placeholder="3-5" />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRateOpen(false)}>Cancel</Button>
						<Button onClick={handleCreateRate} disabled={loading || !rateName.trim()}>Add Rate</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
