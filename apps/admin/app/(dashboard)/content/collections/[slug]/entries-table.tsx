"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DataTable, type Column } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FieldRenderer } from "./field-renderer"
import { SchemaEditor } from "./schema-editor"
import { createEntry, updateEntry, deleteEntry, bulkDeleteEntries, bulkToggleEntries } from "../actions"
import type { CollectionSchema, CollectionField } from "@quickdash/db/schema"

type EntryRow = {
	id: string
	collectionId: string
	workspaceId: string
	data: Record<string, unknown>
	isActive: boolean | null
	sortOrder: number | null
	createdAt: Date
	updatedAt: Date
	updatedBy: string | null
}

type CollectionData = {
	id: string
	name: string
	slug: string
	description: string | null
	icon: string | null
	schema: CollectionSchema
	allowPublicSubmit: boolean | null
	publicSubmitStatus: string | null
	isActive: boolean | null
	sortOrder: number | null
	createdAt: Date
	updatedAt: Date
}

interface EntriesTableProps {
	collection: CollectionData
	entries: EntryRow[]
	totalCount: number
	currentPage: number
}

export function EntriesTable({ collection, entries, totalCount, currentPage }: EntriesTableProps) {
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [editItem, setEditItem] = useState<EntryRow | null>(null)
	const [formData, setFormData] = useState<Record<string, unknown>>({})
	const [loading, setLoading] = useState(false)
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [settingsOpen, setSettingsOpen] = useState(false)

	const schema = collection.schema as CollectionSchema
	const fields = schema.fields

	const openCreate = () => {
		setEditItem(null)
		// Set default values
		const defaults: Record<string, unknown> = {}
		for (const field of fields) {
			if (field.defaultValue !== undefined) {
				defaults[field.key] = field.defaultValue
			}
		}
		setFormData(defaults)
		setOpen(true)
	}

	const openEdit = (entry: EntryRow) => {
		setEditItem(entry)
		setFormData({ ...(entry.data || {}) })
		setOpen(true)
	}

	const handleSave = async () => {
		setLoading(true)
		try {
			if (editItem) {
				await updateEntry(editItem.id, { data: formData })
				toast.success("Entry updated")
			} else {
				await createEntry(collection.id, formData)
				toast.success("Entry created")
			}
			setOpen(false)
			setEditItem(null)
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to save")
		} finally {
			setLoading(false)
		}
	}

	const handleDelete = async (id: string) => {
		try {
			await deleteEntry(id)
			toast.success("Entry deleted")
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		}
	}

	const handleToggleActive = async (entry: EntryRow) => {
		try {
			await updateEntry(entry.id, { isActive: !entry.isActive })
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to update")
		}
	}

	const handleBulkDelete = async () => {
		try {
			await bulkDeleteEntries(selectedIds)
			toast.success(`${selectedIds.length} entries deleted`)
			setSelectedIds([])
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to delete")
		}
	}

	const handleBulkToggle = async (active: boolean) => {
		try {
			await bulkToggleEntries(selectedIds, active)
			toast.success(`${selectedIds.length} entries ${active ? "activated" : "deactivated"}`)
			setSelectedIds([])
			router.refresh()
		} catch (e: any) {
			toast.error(e.message || "Failed to update")
		}
	}

	// Build dynamic columns from schema
	const columns: Column<EntryRow>[] = []

	// Show up to 4 data fields as columns
	const visibleFields = fields.slice(0, 4)
	for (const field of visibleFields) {
		columns.push({
			key: field.key,
			header: field.label,
			cell: (row) => {
				const val = row.data?.[field.key]
				if (val === undefined || val === null) return <span className="text-muted-foreground">-</span>

				// Title field is bold
				const isTitleField = field.key === schema.settings.titleField

				if (field.type === "boolean") {
					return <Badge variant={val ? "default" : "outline"}>{val ? "Yes" : "No"}</Badge>
				}
				if (field.type === "select") {
					return <Badge variant="outline">{String(val)}</Badge>
				}
				if (field.type === "rating") {
					const n = Number(val)
					return <span>{"★".repeat(n)}{"☆".repeat(Math.max(0, 5 - n))}</span>
				}
				if (field.type === "color") {
					return (
						<div className="flex items-center gap-2">
							<div className="w-4 h-4 rounded border" style={{ backgroundColor: String(val) }} />
							<span className="text-xs">{String(val)}</span>
						</div>
					)
				}

				const text = String(val)
				return (
					<span className={isTitleField ? "font-medium" : "line-clamp-1 max-w-[250px]"}>
						{text.length > 80 ? text.slice(0, 80) + "..." : text}
					</span>
				)
			},
		})
	}

	// Active toggle column
	columns.push({
		key: "isActive",
		header: "Active",
		cell: (row) => (
			<Switch
				checked={row.isActive ?? false}
				onCheckedChange={() => handleToggleActive(row)}
			/>
		),
	})

	// Actions column
	columns.push({
		key: "actions",
		header: "",
		cell: (row) => (
			<div className="flex gap-1">
				<Button
					size="sm"
					variant="ghost"
					onClick={(e) => {
						e.stopPropagation()
						openEdit(row)
					}}
				>
					Edit
				</Button>
				<Button
					size="sm"
					variant="ghost"
					className="text-destructive"
					onClick={(e) => {
						e.stopPropagation()
						handleDelete(row.id)
					}}
				>
					Delete
				</Button>
			</div>
		),
	})

	return (
		<>
			<DataTable
				data={entries}
				columns={columns}
				searchPlaceholder={`Search ${collection.name.toLowerCase()}...`}
				getId={(row) => row.id}
				totalCount={totalCount}
				pageSize={25}
				currentPage={currentPage}
				selectable
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				bulkActions={
					<>
						<Button size="sm" variant="outline" onClick={() => handleBulkToggle(true)}>Activate</Button>
						<Button size="sm" variant="outline" onClick={() => handleBulkToggle(false)}>Deactivate</Button>
						<Button size="sm" variant="destructive" onClick={handleBulkDelete}>Delete</Button>
					</>
				}
				filters={
					<div className="flex gap-2">
						<Button size="sm" variant="outline" className="h-9" onClick={() => setSettingsOpen(true)}>
							Settings
						</Button>
						<Button size="sm" className="h-9" onClick={openCreate}>
							New Entry
						</Button>
					</div>
				}
			/>

			{/* Create/Edit Dialog */}
			<Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditItem(null) }}>
				<DialogContent className="max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{editItem ? "Edit Entry" : `New ${collection.name} Entry`}</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						{fields.map((field) => (
							<FieldRenderer
								key={field.key}
								field={field}
								value={formData[field.key]}
								onChange={(val) => setFormData((prev) => ({ ...prev, [field.key]: val }))}
							/>
						))}
						<Button onClick={handleSave} disabled={loading} className="w-full">
							{editItem ? "Update" : "Create"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Schema Editor */}
			<SchemaEditor
				collection={collection}
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
			/>
		</>
	)
}
