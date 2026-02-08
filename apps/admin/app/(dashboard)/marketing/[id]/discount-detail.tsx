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
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/format"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"
import { updateDiscount, deleteDiscount, toggleDiscount } from "../actions"

interface DiscountDetailProps {
	discount: {
		id: string
		name: string
		code: string | null
		discountType: string | null
		valueType: string
		value: string
		minimumOrderAmount: string | null
		maxUses: number | null
		currentUses: number | null
		maxUsesPerUser: number | null
		applicableCategories: string[] | null
		isActive: boolean | null
		isStackable: boolean | null
		startsAt: Date | null
		expiresAt: Date | null
		createdAt: Date
	}
}

export function DiscountDetail({ discount }: DiscountDetailProps) {
	const router = useRouter()
	const [editOpen, setEditOpen] = useState(false)
	const [name, setName] = useState(discount.name)
	const [code, setCode] = useState(discount.code ?? "")
	const [valueType, setValueType] = useState(discount.valueType)
	const [value, setValue] = useState(discount.value)
	const [minOrder, setMinOrder] = useState(discount.minimumOrderAmount ?? "")
	const [maxUses, setMaxUses] = useState(discount.maxUses ? String(discount.maxUses) : "")
	const [expiresAt, setExpiresAt] = useState(discount.expiresAt ? new Date(discount.expiresAt).toISOString().split("T")[0] : "")
	const [loading, setLoading] = useState(false)

	useBreadcrumbOverride(discount.id, discount.code ?? discount.name)

	function getStatus(): string {
		if (!discount.isActive) return "inactive"
		if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) return "expired"
		if (discount.maxUses && discount.currentUses && discount.currentUses >= discount.maxUses) return "exhausted"
		return "active"
	}

	const status = getStatus()
	const statusColors: Record<string, string> = {
		active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
		inactive: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
		expired: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
		exhausted: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
	}

	const handleEdit = async () => {
		setLoading(true)
		try {
			await updateDiscount(discount.id, {
				name: name.trim(),
				code: code.trim().toUpperCase(),
				valueType,
				value,
				minimumOrderAmount: minOrder.trim() || null,
				maxUses: maxUses ? parseInt(maxUses) : null,
				expiresAt: expiresAt || null,
			})
			toast.success("Discount updated")
			setEditOpen(false)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to update")
		} finally {
			setLoading(false)
		}
	}

	const handleToggle = async () => {
		try {
			await toggleDiscount(discount.id, !discount.isActive)
			toast.success(discount.isActive ? "Deactivated" : "Activated")
			router.refresh()
		} catch {
			toast.error("Failed to update")
		}
	}

	const handleDelete = async () => {
		try {
			await deleteDiscount(discount.id)
			toast.success("Discount deleted")
			router.push("/marketing")
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		}
	}

	return (
		<>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<h2 className="text-lg font-semibold font-mono">{discount.code || discount.name}</h2>
					<Badge variant="secondary" className={`text-[11px] px-1.5 py-0 border-0 ${statusColors[status]}`}>
						{status.charAt(0).toUpperCase() + status.slice(1)}
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
						Edit
					</Button>
					<Button variant="outline" size="sm" onClick={handleToggle}>
						{discount.isActive ? "Deactivate" : "Activate"}
					</Button>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="destructive" size="sm">Delete</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete "{discount.code || discount.name}"?</AlertDialogTitle>
								<AlertDialogDescription>
									This will permanently delete this discount.
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
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
						<div className="rounded-lg border p-3">
							<p className="text-xs text-muted-foreground">Discount</p>
							<p className="text-lg font-semibold">
								{discount.valueType === "percentage" ? `${discount.value}%` : formatCurrency(discount.value)}
							</p>
						</div>
						<div className="rounded-lg border p-3">
							<p className="text-xs text-muted-foreground">Uses</p>
							<p className="text-lg font-semibold">
								{discount.currentUses ?? 0}
								{discount.maxUses ? ` / ${discount.maxUses}` : ""}
							</p>
						</div>
						<div className="rounded-lg border p-3">
							<p className="text-xs text-muted-foreground">Min Order</p>
							<p className="text-lg font-semibold">
								{discount.minimumOrderAmount ? formatCurrency(discount.minimumOrderAmount) : "None"}
							</p>
						</div>
					</div>
				</div>

				<div className="space-y-4">
					<div className="rounded-lg border p-4 space-y-3">
						<h3 className="text-sm font-medium">Details</h3>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Name</span>
								<span>{discount.name}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Type</span>
								<span className="capitalize">{discount.valueType}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Stackable</span>
								<span>{discount.isStackable ? "Yes" : "No"}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Per User</span>
								<span>{discount.maxUsesPerUser ?? 1}x</span>
							</div>
							{discount.startsAt && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Starts</span>
									<span>{formatDate(discount.startsAt)}</span>
								</div>
							)}
							<div className="flex justify-between">
								<span className="text-muted-foreground">Expires</span>
								<span>{discount.expiresAt ? formatDate(discount.expiresAt) : "Never"}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Created</span>
								<span>{formatDate(discount.createdAt)}</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Discount</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Name</Label>
							<Input value={name} onChange={(e) => setName(e.target.value)} />
						</div>
						<div>
							<Label>Code</Label>
							<Input value={code} onChange={(e) => setCode(e.target.value)} className="font-mono" />
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label>Type</Label>
								<Select value={valueType} onValueChange={setValueType}>
									<SelectTrigger><SelectValue /></SelectTrigger>
									<SelectContent>
										<SelectItem value="percentage">Percentage</SelectItem>
										<SelectItem value="fixed">Fixed Amount</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label>Value</Label>
								<Input value={value} onChange={(e) => setValue(e.target.value)} />
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label>Min Order ($)</Label>
								<Input value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="None" />
							</div>
							<div>
								<Label>Max Uses</Label>
								<Input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" />
							</div>
						</div>
						<div>
							<Label>Expires</Label>
							<Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
						<Button onClick={handleEdit} disabled={loading || !name.trim()}>Save</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
