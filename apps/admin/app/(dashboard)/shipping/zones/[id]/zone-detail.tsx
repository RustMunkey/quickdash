"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { updateZone, deleteZone, removeZoneRate } from "../../actions"

interface ZoneRate {
	id: string
	zoneId: string
	carrierId: string
	rateId: string
	priceOverride: string | null
	isActive: boolean
	carrierName: string
	rateName: string
	flatRate: string | null
	estimatedDays: string | null
}

interface ZoneDetailProps {
	zone: {
		id: string
		name: string
		countries: string[] | null
		regions: string[] | null
		isActive: boolean
		createdAt: Date
		updatedAt: Date
		rates: ZoneRate[]
	}
}

export function ZoneDetail({ zone }: ZoneDetailProps) {
	const router = useRouter()
	const [loading, setLoading] = useState(false)

	useBreadcrumbOverride(zone.id, zone.name)

	const handleToggleActive = async () => {
		setLoading(true)
		try {
			await updateZone(zone.id, { isActive: !zone.isActive })
			toast.success(zone.isActive ? "Zone deactivated" : "Zone activated")
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
			await deleteZone(zone.id)
			toast.success("Zone deleted")
			router.push("/shipping/zones")
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	const handleRemoveRate = async (id: string) => {
		try {
			await removeZoneRate(id)
			toast.success("Rate removed from zone")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to remove")
		}
	}

	return (
		<>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<h2 className="text-lg font-semibold">{zone.name}</h2>
					<Badge
						variant="secondary"
						className={`text-[11px] px-1.5 py-0 border-0 ${
							zone.isActive
								? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
								: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
						}`}
					>
						{zone.isActive ? "Active" : "Inactive"}
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={handleToggleActive} disabled={loading}>
						{zone.isActive ? "Deactivate" : "Activate"}
					</Button>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="destructive" size="sm" disabled={loading}>Delete</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete {zone.name}?</AlertDialogTitle>
								<AlertDialogDescription>
									This will permanently delete this zone and its rate assignments.
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
					<h3 className="text-sm font-medium">Assigned Rates</h3>
					{zone.rates.length === 0 ? (
						<div className="rounded-lg border p-6 text-center">
							<p className="text-sm text-muted-foreground">No rates assigned</p>
							<p className="text-xs text-muted-foreground/60 mt-1">Assign carrier rates to this zone.</p>
						</div>
					) : (
						<div className="space-y-2">
							{zone.rates.map((rate) => (
								<div key={rate.id} className="rounded-lg border p-3 flex items-center justify-between">
									<div>
										<p className="text-sm font-medium">{rate.carrierName} — {rate.rateName}</p>
										<div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
											{rate.priceOverride ? (
												<span>Override: {formatCurrency(rate.priceOverride)}</span>
											) : rate.flatRate ? (
												<span>{formatCurrency(rate.flatRate)}</span>
											) : null}
											{rate.estimatedDays && <span>{rate.estimatedDays} days</span>}
										</div>
									</div>
									<Button
										variant="ghost"
										size="sm"
										className="text-xs text-muted-foreground"
										onClick={() => handleRemoveRate(rate.id)}
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
						<h3 className="text-sm font-medium">Coverage</h3>
						<div className="space-y-2 text-sm">
							<div>
								<span className="text-muted-foreground text-xs">Countries</span>
								<div className="flex flex-wrap gap-1 mt-1">
									{(zone.countries ?? []).length > 0 ? (
										(zone.countries ?? []).map((c) => (
											<Badge key={c} variant="secondary" className="text-[10px] px-1 py-0 border-0">{c}</Badge>
										))
									) : (
										<span className="text-xs text-muted-foreground">All countries</span>
									)}
								</div>
							</div>
							{(zone.regions ?? []).length > 0 && (
								<div>
									<span className="text-muted-foreground text-xs">Regions</span>
									<p className="text-xs mt-0.5">{(zone.regions ?? []).join(", ")}</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
