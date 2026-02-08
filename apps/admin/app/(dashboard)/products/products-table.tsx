"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { DataTable, type Column } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/format"
import { useLiveProducts, type LiveProduct } from "@/hooks/use-live-products"
import { useProductsParams } from "@/hooks/use-table-params"
import { cn } from "@/lib/utils"
import { bulkUpdateProducts } from "./actions"

interface Category {
	id: string
	name: string
	slug: string
}

interface ProductsTableProps {
	products: LiveProduct[]
	categories: Category[]
	totalCount: number
}

export function ProductsTable({
	products: initialProducts,
	categories,
	totalCount,
}: ProductsTableProps) {
	const router = useRouter()
	const [params, setParams] = useProductsParams()
	const { products } = useLiveProducts({ initialProducts })
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)

	const columns: Column<LiveProduct>[] = [
		{
			key: "thumbnail",
			header: "",
			className: "w-10",
			cell: (row) => (
				<div className={cn(
					"w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden",
					row.isNew && "ring-2 ring-stat-up ring-offset-1"
				)}>
					{row.thumbnail ? (
						<img src={row.thumbnail} alt="" className="w-full h-full object-cover" />
					) : (
						<span className="text-xs text-muted-foreground">—</span>
					)}
				</div>
			),
		},
		{
			key: "name",
			header: "Name",
			cell: (row) => (
				<div className="flex items-center gap-2">
					<span className="font-medium">{row.name}</span>
					{row.isNew && (
						<span className="text-[10px] px-1.5 py-0.5 rounded bg-stat-up/10 text-stat-up font-medium animate-pulse">
							NEW
						</span>
					)}
					{row.isFeatured && (
						<span className="text-[10px] text-amber-600 dark:text-amber-400">Featured</span>
					)}
				</div>
			),
		},
		{
			key: "price",
			header: "Price",
			cell: (row) => formatCurrency(row.price),
		},
		{
			key: "category",
			header: "Category",
			cell: (row) => (
				<span className="text-muted-foreground">
					{row.categoryName ?? "—"}
				</span>
			),
		},
		{
			key: "status",
			header: "Status",
			cell: (row) => (
				<StatusBadge
					status={row.isActive ? "active" : "inactive"}
					type="product"
				/>
			),
		},
		{
			key: "createdAt",
			header: "Created",
			cell: (row) => (
				<span className="text-muted-foreground text-xs">
					{formatDate(row.createdAt)}
				</span>
			),
		},
	]

	const handleBulkAction = async (action: "activate" | "deactivate" | "delete") => {
		setLoading(true)
		try {
			await bulkUpdateProducts(selectedIds, action)
			setSelectedIds([])
			router.refresh()
			toast.success(
				action === "delete"
					? `${selectedIds.length} product(s) deleted`
					: `${selectedIds.length} product(s) ${action}d`
			)
		} catch (e: any) {
			toast.error(e.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<DataTable
			columns={columns}
			data={products}
			searchPlaceholder="Search products..."
			totalCount={totalCount}
			currentPage={params.page}
			pageSize={25}
			onPageChange={(page) => setParams({ page })}
			selectable
			selectedIds={selectedIds}
			onSelectionChange={setSelectedIds}
			getId={(row) => row.id}
			onRowClick={(row) => router.push(`/products/${row.id}`)}
			emptyMessage="No products yet"
			emptyDescription="Create your first product to get started."
			filters={
				<>
					<div className="flex gap-2 w-full sm:w-auto">
						<Select
							value={params.category}
							onValueChange={(value) => {
								setParams({ category: value, page: 1 })
							}}
						>
							<SelectTrigger className="h-9 flex-1 sm:flex-initial sm:w-[140px]">
								<SelectValue placeholder="All Categories" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Categories</SelectItem>
								{categories.map((cat) => (
									<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select
							value={params.status}
							onValueChange={(value) => {
								setParams({ status: value as typeof params.status, page: 1 })
							}}
						>
							<SelectTrigger className="h-9 flex-1 sm:flex-initial sm:w-[130px]">
								<SelectValue placeholder="All Statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="inactive">Inactive</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<Link href="/products/new" className="hidden sm:block">
						<Button size="sm" className="h-9">Add Product</Button>
					</Link>
				</>
			}
			bulkActions={
				<div className="flex gap-2 w-full sm:w-auto">
					<Button size="sm" variant="outline" className="flex-1 sm:flex-initial" disabled={loading} onClick={() => handleBulkAction("activate")}>
						Activate
					</Button>
					<Button size="sm" variant="outline" className="flex-1 sm:flex-initial" disabled={loading} onClick={() => handleBulkAction("deactivate")}>
						Deactivate
					</Button>
					<Button size="sm" variant="destructive" className="flex-1 sm:flex-initial" disabled={loading} onClick={() => handleBulkAction("delete")}>
						Delete
					</Button>
				</div>
			}
		/>
	)
}
