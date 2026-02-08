"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { moveDeal, createDeal, updateDeal, deleteDeal } from "./actions"

interface Stage {
	id: string
	name: string
	order: number
	color: string
	isWon: boolean | null
	isLost: boolean | null
}

interface Deal {
	id: string
	title: string
	value: string | null
	stageId: string | null
	contactName: string | null
	contactLastName: string | null
	companyName: string | null
	expectedCloseDate: Date | null
	notes?: string | null
	createdAt: Date
}

interface PipelineBoardProps {
	stages: Stage[]
	deals: Deal[]
}

export function PipelineBoard({ stages, deals: initialDeals }: PipelineBoardProps) {
	const router = useRouter()
	const [deals, setDeals] = useState(initialDeals)
	useEffect(() => { setDeals(initialDeals) }, [initialDeals])
	const [draggedDeal, setDraggedDeal] = useState<string | null>(null)
	const [dragOverStage, setDragOverStage] = useState<string | null>(null)

	// Create dialog
	const [createOpen, setCreateOpen] = useState(false)
	const [addToStage, setAddToStage] = useState<string | null>(null)
	const [createTitle, setCreateTitle] = useState("")
	const [createValue, setCreateValue] = useState("")
	const [saving, setSaving] = useState(false)

	// Edit dialog
	const [editOpen, setEditOpen] = useState(false)
	const [editDeal, setEditDeal] = useState<Deal | null>(null)
	const [editTitle, setEditTitle] = useState("")
	const [editValue, setEditValue] = useState("")
	const [editStageId, setEditStageId] = useState("")
	const [editCloseDate, setEditCloseDate] = useState("")
	const [editNotes, setEditNotes] = useState("")
	const [updating, setUpdating] = useState(false)

	// Delete confirmation
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [deleteDealId, setDeleteDealId] = useState<string | null>(null)
	const [deleting, setDeleting] = useState(false)

	function getDealsForStage(stageId: string) {
		return deals.filter((d) => d.stageId === stageId)
	}

	function getStageTotal(stageId: string) {
		return getDealsForStage(stageId).reduce(
			(sum, d) => sum + (d.value ? parseFloat(d.value) : 0),
			0,
		)
	}

	function openEdit(deal: Deal) {
		setEditDeal(deal)
		setEditTitle(deal.title)
		setEditValue(deal.value ?? "")
		setEditStageId(deal.stageId ?? "")
		setEditCloseDate(deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toISOString().split("T")[0] : "")
		setEditNotes(deal.notes ?? "")
		setEditOpen(true)
	}

	async function handleDrop(stageId: string) {
		if (!draggedDeal) return
		const deal = deals.find((d) => d.id === draggedDeal)
		if (!deal || deal.stageId === stageId) {
			setDraggedDeal(null)
			setDragOverStage(null)
			return
		}

		setDeals((prev) =>
			prev.map((d) => (d.id === draggedDeal ? { ...d, stageId } : d)),
		)
		setDraggedDeal(null)
		setDragOverStage(null)

		try {
			await moveDeal(draggedDeal, stageId)
		} catch {
			setDeals(initialDeals)
			toast.error("Failed to move deal")
		}
	}

	async function handleCreate() {
		if (!createTitle.trim() || !addToStage) {
			toast.error("Title is required")
			return
		}
		setSaving(true)
		try {
			await createDeal({
				title: createTitle.trim(),
				value: createValue || undefined,
				stageId: addToStage,
			})
			toast.success("Deal created")
			setCreateOpen(false)
			setCreateTitle("")
			setCreateValue("")
			setAddToStage(null)
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to create")
		} finally {
			setSaving(false)
		}
	}

	async function handleUpdate() {
		if (!editDeal || !editTitle.trim()) return
		setUpdating(true)
		try {
			await updateDeal(editDeal.id, {
				title: editTitle.trim(),
				value: editValue.trim() || null,
				stageId: editStageId || undefined,
				expectedCloseDate: editCloseDate || null,
				notes: editNotes.trim() || null,
			})
			toast.success("Deal updated")
			setEditOpen(false)
			setEditDeal(null)
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to update")
		} finally {
			setUpdating(false)
		}
	}

	async function handleDelete() {
		if (!deleteDealId) return
		setDeleting(true)
		try {
			await deleteDeal(deleteDealId)
			toast.success("Deal deleted")
			setDeleteOpen(false)
			setDeleteDealId(null)
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to delete")
		} finally {
			setDeleting(false)
		}
	}

	function formatCloseDate(d: Date) {
		const date = new Date(d)
		const now = new Date()
		const diff = date.getTime() - now.getTime()
		const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
		if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: "text-red-500" }
		if (days <= 7) return { label: `${days}d left`, color: "text-yellow-600" }
		return { label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: "text-muted-foreground" }
	}

	return (
		<>
			<div className="flex gap-3 overflow-x-auto pb-4 h-[calc(100vh-180px)] snap-x snap-mandatory sm:snap-none -mx-4 px-4 sm:mx-0 sm:px-0">
				{stages.map((stage) => {
					const stageDeals = getDealsForStage(stage.id)
					const total = getStageTotal(stage.id)
					const isDragOver = dragOverStage === stage.id

					return (
						<div
							key={stage.id}
							className={`flex flex-col min-w-[85vw] w-[85vw] sm:min-w-[380px] sm:w-[380px] rounded-lg border bg-muted/30 snap-center ${isDragOver ? "ring-2 ring-primary/50" : ""}`}
							onDragOver={(e) => {
								e.preventDefault()
								setDragOverStage(stage.id)
							}}
							onDragLeave={() => setDragOverStage(null)}
							onDrop={(e) => {
								e.preventDefault()
								handleDrop(stage.id)
							}}
						>
							{/* Column Header */}
							<div className="flex items-center justify-between px-3 py-2.5 border-b">
								<div className="flex items-center gap-2 min-w-0">
									<div
										className="size-3 rounded-full shrink-0"
										style={{ backgroundColor: stage.color }}
									/>
									<span className="text-sm font-medium truncate">{stage.name}</span>
									<span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 shrink-0">
										{stageDeals.length}
									</span>
								</div>
								{total > 0 && (
									<span className="text-xs text-muted-foreground shrink-0">
										${total.toLocaleString()}
									</span>
								)}
							</div>

							{/* Cards */}
							<div className="flex-1 p-2 space-y-2 overflow-y-auto">
								{stageDeals.map((deal) => {
									const closeInfo = deal.expectedCloseDate ? formatCloseDate(deal.expectedCloseDate) : null
									return (
										<div
											key={deal.id}
											draggable
											onDragStart={() => setDraggedDeal(deal.id)}
											onDragEnd={() => {
												setDraggedDeal(null)
												setDragOverStage(null)
											}}
											onClick={() => openEdit(deal)}
											className={`rounded-md border bg-background px-3 py-2.5 cursor-grab active:cursor-grabbing hover:border-foreground/20 transition-colors ${draggedDeal === deal.id ? "opacity-50" : ""}`}
										>
											<div className="flex items-center justify-between gap-3">
												<div className="min-w-0">
													<p className="text-sm font-medium truncate">{deal.title}</p>
													{(deal.contactName || deal.companyName) && (
														<p className="text-[11px] text-muted-foreground truncate">
															{deal.contactName
																? `${deal.contactName} ${deal.contactLastName || ""}`
																: deal.companyName}
														</p>
													)}
												</div>
												<div className="shrink-0 flex items-center gap-2">
													{closeInfo && (
														<span className={`text-[10px] ${closeInfo.color}`}>
															{closeInfo.label}
														</span>
													)}
													{deal.value && (
														<span className="text-xs font-medium text-green-600">
															${parseFloat(deal.value).toLocaleString()}
														</span>
													)}
												</div>
											</div>
										</div>
									)
								})}
							</div>

							{/* Add Deal Button */}
							<div className="p-2 border-t">
								<button
									onClick={() => {
										setAddToStage(stage.id)
										setCreateOpen(true)
									}}
									className="w-full text-xs text-muted-foreground hover:text-foreground py-1.5 rounded hover:bg-muted transition-colors"
								>
									+ Add deal
								</button>
							</div>
						</div>
					)
				})}
			</div>

			{/* Create Dialog */}
			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>New Deal</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 pt-2">
						<div className="space-y-1.5">
							<Label>Deal Title</Label>
							<Input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="Website redesign project" />
						</div>
						<div className="space-y-1.5">
							<Label>Value ($)</Label>
							<Input type="number" step="0.01" value={createValue} onChange={(e) => setCreateValue(e.target.value)} placeholder="10000" />
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
							<Button onClick={handleCreate} disabled={saving}>
								{saving ? "Creating..." : "Create"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Edit Dialog */}
			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Deal</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Title</Label>
							<Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label>Value ($)</Label>
								<Input type="number" step="0.01" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="0.00" />
							</div>
							<div>
								<Label>Stage</Label>
								<Select value={editStageId} onValueChange={setEditStageId}>
									<SelectTrigger><SelectValue /></SelectTrigger>
									<SelectContent>
										{stages.map((s) => (
											<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div>
							<Label>Expected Close Date</Label>
							<Input type="date" value={editCloseDate} onChange={(e) => setEditCloseDate(e.target.value)} />
						</div>
						<div>
							<Label>Notes</Label>
							<Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Deal notes..." rows={3} />
						</div>
					</div>
					<DialogFooter className="flex items-center justify-between sm:justify-between">
						<Button
							variant="ghost"
							className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
							onClick={() => {
								setEditOpen(false)
								setDeleteDealId(editDeal?.id ?? null)
								setDeleteOpen(true)
							}}
						>
							Delete
						</Button>
						<div className="flex gap-2">
							<Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
							<Button onClick={handleUpdate} disabled={updating || !editTitle.trim()}>
								{updating ? "Saving..." : "Save"}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation */}
			<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Deal</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						Are you sure you want to delete this deal? This action cannot be undone.
					</p>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
						<Button variant="destructive" onClick={handleDelete} disabled={deleting}>
							{deleting ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
