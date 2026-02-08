"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import { DataTable, type Column } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
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
import { updateCollection, deleteCollection } from "./actions"

type Collection = {
	id: string
	name: string
	slug: string
	description: string | null
	icon: string | null
	isActive: boolean | null
	sortOrder: number | null
	entryCount: number
	createdAt: Date
}

export function CollectionsTable({ collections }: { collections: Collection[] }) {
	const router = useRouter()
	const [deleteId, setDeleteId] = useState<string | null>(null)

	const handleToggleActive = async (item: Collection) => {
		try {
			await updateCollection(item.id, { isActive: !item.isActive })
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to update")
		}
	}

	const handleDelete = async () => {
		if (!deleteId) return
		try {
			await deleteCollection(deleteId)
			toast.success("Collection deleted")
			setDeleteId(null)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		}
	}

	const columns: Column<Collection>[] = [
		{
			key: "name",
			header: "Name",
			cell: (row) => (
				<Link href={`/content/collections/${row.slug}`} className="font-medium hover:underline">
					{row.name}
				</Link>
			),
		},
		{
			key: "slug",
			header: "Slug",
			cell: (row) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.slug}</code>,
		},
		{
			key: "entryCount",
			header: "Entries",
			cell: (row) => <span className="text-muted-foreground">{row.entryCount}</span>,
		},
		{
			key: "isActive",
			header: "Active",
			cell: (row) => (
				<Switch
					checked={row.isActive ?? false}
					onCheckedChange={() => handleToggleActive(row)}
				/>
			),
		},
		{
			key: "actions",
			header: "",
			cell: (row) => (
				<div className="flex gap-2">
					<Button size="sm" variant="ghost" asChild>
						<Link href={`/content/collections/${row.slug}`}>Manage</Link>
					</Button>
					<Button
						size="sm"
						variant="ghost"
						className="text-destructive"
						onClick={(e) => {
							e.stopPropagation()
							setDeleteId(row.id)
						}}
					>
						Delete
					</Button>
				</div>
			),
		},
	]

	return (
		<>
			<DataTable
				data={collections}
				columns={columns}
				searchPlaceholder="Search collections..."
				getId={(row) => row.id}
				filters={
					<Button size="sm" className="h-9" asChild>
						<Link href="/content/collections/new">New Collection</Link>
					</Button>
				}
			/>

			<AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Collection</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete this collection and all its entries. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
