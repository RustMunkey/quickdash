"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { useBreadcrumbOverride } from "@/components/breadcrumb-context"
import { updateSegment, removeSegmentMember, addSegmentMember } from "../actions"

interface SegmentDetailProps {
	segment: {
		id: string
		name: string

		description: string | null
		type: string
		rules: unknown
		color: string | null
		createdAt: Date
		members: Array<{
			userId: string
			addedAt: Date | null
			userName: string
			userEmail: string
		}>
	}
}

export function SegmentDetail({ segment }: SegmentDetailProps) {
	const router = useRouter()
	useBreadcrumbOverride(segment.id, segment.name)
	const [editing, setEditing] = useState(false)
	const [name, setName] = useState(segment.name)
	const [description, setDescription] = useState(segment.description || "")
	const [saving, setSaving] = useState(false)
	const [addOpen, setAddOpen] = useState(false)
	const [userId, setUserId] = useState("")

	async function handleSave() {
		if (!name.trim()) {
			toast.error("Name is required")
			return
		}
		setSaving(true)
		try {
			await updateSegment(segment.id, { name: name.trim(), description })
			toast.success("Segment updated")
			setEditing(false)
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to update")
		} finally {
			setSaving(false)
		}
	}

	async function handleRemoveMember(memberId: string, memberName: string) {
		if (!confirm(`Remove ${memberName} from this segment?`)) return
		try {
			await removeSegmentMember(segment.id, memberId)
			toast.success("Member removed")
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to remove")
		}
	}

	async function handleAddMember() {
		if (!userId.trim()) {
			toast.error("User ID is required")
			return
		}
		try {
			await addSegmentMember(segment.id, userId.trim())
			toast.success("Member added")
			setAddOpen(false)
			setUserId("")
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to add member")
		}
	}

	return (
		<>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div
						className="w-4 h-4 rounded-full"
						style={{ backgroundColor: segment.color || "#888" }}
					/>
					<div>
						<h2 className="text-lg font-semibold">{segment.name}</h2>
						{segment.description && (
							<p className="text-sm text-muted-foreground">{segment.description}</p>
						)}
					</div>
					<Badge variant="secondary" className="text-[10px] ml-2">
						{segment.type}
					</Badge>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setEditing(!editing)}
				>
					{editing ? "Cancel" : "Edit"}
				</Button>
			</div>

			{/* Edit form */}
			{editing && (
				<div className="rounded-lg border px-4 py-4 space-y-3 max-w-md">
					<div className="space-y-1.5">
						<Label>Name</Label>
						<Input value={name} onChange={(e) => setName(e.target.value)} />
					</div>
					<div className="space-y-1.5">
						<Label>Description</Label>
						<Input
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional"
						/>
					</div>
					<Button onClick={handleSave} disabled={saving} size="sm">
						{saving ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			)}

			{/* Members */}
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-medium">
					Members ({segment.members.length})
				</h3>
				<Dialog open={addOpen} onOpenChange={setAddOpen}>
					<DialogTrigger asChild>
						<Button size="sm" variant="outline">
							Add Member
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Add Member</DialogTitle>
						</DialogHeader>
						<div className="space-y-4 pt-2">
							<div className="space-y-1.5">
								<Label>User ID</Label>
								<Input
									value={userId}
									onChange={(e) => setUserId(e.target.value)}
									placeholder="Enter user ID"
								/>
							</div>
							<div className="flex justify-end gap-2">
								<Button variant="outline" onClick={() => setAddOpen(false)}>
									Cancel
								</Button>
								<Button onClick={handleAddMember}>Add</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>

			{segment.members.length === 0 ? (
				<div className="rounded-lg border px-4 py-8 text-center">
					<p className="text-sm text-muted-foreground">No members in this segment</p>
				</div>
			) : (
				<div className="rounded-lg border divide-y">
					{segment.members.map((member) => (
						<div
							key={member.userId}
							className="flex items-center justify-between px-4 py-3"
						>
							<div>
								<span className="text-sm font-medium">{member.userName}</span>
								<p className="text-xs text-muted-foreground">{member.userEmail}</p>
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="text-xs text-destructive hover:text-destructive"
								onClick={() => handleRemoveMember(member.userId, member.userName)}
							>
								Remove
							</Button>
						</div>
					))}
				</div>
			)}
		</>
	)
}
