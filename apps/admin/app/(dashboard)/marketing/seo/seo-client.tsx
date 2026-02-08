"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { DataTable, type Column } from "@/components/data-table"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog"
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select"
import { updateProductSeo, bulkClearProductSeo } from "../actions"

interface ProductSeo {
	id: string
	name: string
	slug: string
	metaTitle: string | null
	metaDescription: string | null
	isActive: boolean | null
}

function getSeoScore(product: ProductSeo): { label: string; color: string } {
	const hasTitle = !!product.metaTitle?.trim()
	const hasDesc = !!product.metaDescription?.trim()
	if (hasTitle && hasDesc) return { label: "Complete", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" }
	if (hasTitle || hasDesc) return { label: "Partial", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" }
	return { label: "Missing", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" }
}

export function SeoClient({ products, totalCount, currentPage }: { products: ProductSeo[]; totalCount: number; currentPage: number }) {
	const router = useRouter()
	const [statusFilter, setStatusFilter] = useState("all")
	const [editOpen, setEditOpen] = useState(false)
	const [selected, setSelected] = useState<ProductSeo | null>(null)
	const [metaTitle, setMetaTitle] = useState("")
	const [metaDescription, setMetaDescription] = useState("")
	const [loading, setLoading] = useState(false)
	const [selectedIds, setSelectedIds] = useState<string[]>([])

	const filtered = statusFilter === "all"
		? products
		: products.filter((p) => {
			const score = getSeoScore(p)
			return score.label.toLowerCase() === statusFilter
		})

	const handleBulkDelete = async () => {
		if (selectedIds.length === 0) return
		setLoading(true)
		try {
			await bulkClearProductSeo(selectedIds)
			setSelectedIds([])
			router.refresh()
			toast.success(`Cleared SEO data for ${selectedIds.length} product(s)`)
		} catch {
			toast.error("Failed to clear SEO data")
		} finally {
			setLoading(false)
		}
	}

	const columns: Column<ProductSeo>[] = [
		{
			key: "product",
			header: "Product",
			cell: (row) => (
				<div>
					<span className="text-sm font-medium">{row.name}</span>
					<p className="text-xs text-muted-foreground">/{row.slug}</p>
				</div>
			),
		},
		{
			key: "metaTitle",
			header: "Meta Title",
			cell: (row) => (
				<span className="text-xs text-muted-foreground truncate max-w-[200px] block">
					{row.metaTitle || <span className="italic text-muted-foreground/50">Not set</span>}
				</span>
			),
		},
		{
			key: "metaDescription",
			header: "Meta Description",
			cell: (row) => (
				<span className="text-xs text-muted-foreground truncate max-w-[200px] block">
					{row.metaDescription || <span className="italic text-muted-foreground/50">Not set</span>}
				</span>
			),
		},
		{
			key: "score",
			header: "SEO",
			cell: (row) => {
				const score = getSeoScore(row)
				return (
					<Badge variant="secondary" className={`text-[11px] px-1.5 py-0 border-0 ${score.color}`}>
						{score.label}
					</Badge>
				)
			},
		},
		{
			key: "actions",
			header: "",
			cell: (row) => (
				<div className="flex justify-end">
					<Button
						variant="ghost"
						size="sm"
						className="h-7 px-2 text-xs"
						onClick={(e) => {
							e.stopPropagation()
							setSelected(row)
							setMetaTitle(row.metaTitle ?? "")
							setMetaDescription(row.metaDescription ?? "")
							setEditOpen(true)
						}}
					>
						Edit
					</Button>
				</div>
			),
		},
	]

	const handleSave = async () => {
		if (!selected) return
		setLoading(true)
		try {
			await updateProductSeo(selected.id, {
				metaTitle: metaTitle.trim() || null,
				metaDescription: metaDescription.trim() || null,
			})
			toast.success("SEO updated")
			setEditOpen(false)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to update")
		} finally {
			setLoading(false)
		}
	}

	const completeCount = products.filter((p) => getSeoScore(p).label === "Complete").length
	const missingCount = products.filter((p) => getSeoScore(p).label === "Missing").length

	return (
		<>
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">Manage meta titles and descriptions for products.</p>
				<div className="text-right text-xs text-muted-foreground">
					<span className="text-green-600 dark:text-green-400">{completeCount} complete</span>
					<span className="mx-1">&middot;</span>
					<span className="text-red-600 dark:text-red-400">{missingCount} missing</span>
				</div>
			</div>

			<DataTable
				columns={columns}
				data={filtered}
				searchPlaceholder="Search products..."
				totalCount={totalCount}
				currentPage={currentPage}
				pageSize={25}
				getId={(row) => row.id}
				selectable
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				bulkActions={
					<Button size="sm" variant="destructive" disabled={loading} onClick={handleBulkDelete}>
						Clear SEO ({selectedIds.length})
					</Button>
				}
				emptyMessage="No products"
				emptyDescription="Products will appear here for SEO management."
				filters={
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="h-9 w-full sm:w-[160px]">
							<SelectValue placeholder="All Products" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Products</SelectItem>
							<SelectItem value="complete">Complete</SelectItem>
							<SelectItem value="partial">Partial</SelectItem>
							<SelectItem value="missing">Missing</SelectItem>
						</SelectContent>
					</Select>
				}
			/>

			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit SEO — {selected?.name}</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Meta Title</Label>
							<Input
								value={metaTitle}
								onChange={(e) => setMetaTitle(e.target.value)}
								placeholder="Page title for search engines"
								maxLength={70}
							/>
							<p className="text-xs text-muted-foreground mt-1">{metaTitle.length}/70 characters</p>
						</div>
						<div>
							<Label>Meta Description</Label>
							<Textarea
								value={metaDescription}
								onChange={(e) => setMetaDescription(e.target.value)}
								placeholder="Brief description for search results"
								maxLength={160}
								rows={3}
							/>
							<p className="text-xs text-muted-foreground mt-1">{metaDescription.length}/160 characters</p>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
						<Button onClick={handleSave} disabled={loading}>Save</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
