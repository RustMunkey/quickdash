"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { DataTable, type Column } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { bulkDeleteBlogPosts } from "./actions"

type BlogPost = {
	id: string
	title: string
	slug: string
	status: string
	publishedAt: Date | null
	tags: string[] | null
	createdAt: Date
}

interface BlogPostsTableProps {
	posts: BlogPost[]
	totalCount: number
	currentPage: number
	currentStatus?: string
}

export function BlogPostsTable({ posts, totalCount, currentPage, currentStatus }: BlogPostsTableProps) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [loading, setLoading] = useState(false)

	const handleBulkDelete = async () => {
		setLoading(true)
		try {
			await bulkDeleteBlogPosts(selectedIds)
			toast.success(`Deleted ${selectedIds.length} post(s)`)
			setSelectedIds([])
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		} finally {
			setLoading(false)
		}
	}

	function handleFilterChange(status: string) {
		const params = new URLSearchParams(searchParams.toString())
		if (status === "all") {
			params.delete("status")
		} else {
			params.set("status", status)
		}
		params.delete("page")
		router.push(`/content?${params.toString()}`)
	}

	const columns: Column<BlogPost>[] = [
		{
			key: "title",
			header: "Title",
			cell: (row) => (
				<span className="font-medium">{row.title}</span>
			),
		},
		{
			key: "status",
			header: "Status",
			cell: (row) => <StatusBadge status={row.status} type="content" />,
		},
		{
			key: "tags",
			header: "Tags",
			cell: (row) => (
				<div className="flex gap-1 flex-wrap">
					{(row.tags || []).slice(0, 3).map((tag) => (
						<Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
					))}
				</div>
			),
		},
		{
			key: "publishedAt",
			header: "Published",
			cell: (row) => row.publishedAt
				? new Date(row.publishedAt).toLocaleDateString("en-US")
				: "—",
		},
		{
			key: "createdAt",
			header: "Created",
			cell: (row) => new Date(row.createdAt).toLocaleDateString("en-US"),
		},
	]

	return (
		<DataTable
			data={posts}
			columns={columns}
			searchKey="title"
			searchPlaceholder="Search posts..."
			selectable
			selectedIds={selectedIds}
			onSelectionChange={setSelectedIds}
			getId={(row) => row.id}
			bulkActions={<Button size="sm" variant="destructive" disabled={loading} onClick={() => handleBulkDelete()}>Delete</Button>}
			onRowClick={(row) => router.push(`/content/${row.id}`)}
			totalCount={totalCount}
			currentPage={currentPage}
			filters={
				<>
					<Select value={currentStatus || "all"} onValueChange={handleFilterChange}>
						<SelectTrigger className="h-9 w-full sm:w-[140px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							<SelectItem value="draft">Draft</SelectItem>
							<SelectItem value="published">Published</SelectItem>
							<SelectItem value="archived">Archived</SelectItem>
						</SelectContent>
					</Select>
					<Button size="sm" className="h-9 hidden sm:flex" onClick={() => router.push("/content/new")}>New Post</Button>
				</>
			}
		/>
	)
}
