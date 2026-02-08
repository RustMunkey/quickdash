"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { KeyboardIcon, RefreshIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import {
	getKeybindings,
	setKeybinding,
	resetKeybinding,
	resetAllKeybindings,
	checkConflict,
	formatKeys,
	parseKeyboardEvent,
	DEFAULT_KEYBINDINGS,
	type KeyBinding,
} from "@/lib/keybindings"

const CATEGORY_LABELS: Record<string, string> = {
	navigation: "Navigation",
	actions: "Actions",
	view: "View",
	editing: "Editing",
	widgets: "Widgets",
}

export function KeyboardShortcutsSettings() {
	const [bindings, setBindings] = useState<KeyBinding[]>([])
	const [editingId, setEditingId] = useState<string | null>(null)
	const [recordedKeys, setRecordedKeys] = useState<string[]>([])
	const [isRecording, setIsRecording] = useState(false)
	const [conflict, setConflict] = useState<string | null>(null)

	const loadBindings = useCallback(() => {
		setBindings(getKeybindings())
	}, [])

	useEffect(() => {
		loadBindings()
	}, [loadBindings])

	const handleEdit = (id: string) => {
		setEditingId(id)
		setRecordedKeys([])
		setIsRecording(true)
		setConflict(null)
	}

	const handleKeyDown = useCallback((e: KeyboardEvent) => {
		if (!isRecording || !editingId) return

		e.preventDefault()
		e.stopPropagation()

		// Escape cancels recording
		if (e.key === "Escape") {
			setEditingId(null)
			setIsRecording(false)
			setRecordedKeys([])
			setConflict(null)
			return
		}

		// Backspace/Delete clears the binding
		if (e.key === "Backspace" || e.key === "Delete") {
			setRecordedKeys([])
			setConflict(null)
			return
		}

		const keys = parseKeyboardEvent(e)

		// Need at least a modifier + key for most shortcuts (except single keys like Escape)
		if (keys.length > 0) {
			setRecordedKeys(keys)

			// Check for conflicts
			const conflictName = checkConflict(editingId, keys)
			setConflict(conflictName)
		}
	}, [isRecording, editingId])

	useEffect(() => {
		if (isRecording) {
			window.addEventListener("keydown", handleKeyDown)
			return () => window.removeEventListener("keydown", handleKeyDown)
		}
	}, [isRecording, handleKeyDown])

	const handleSave = () => {
		if (!editingId) return

		if (conflict) {
			toast.error(`Shortcut conflicts with "${conflict}"`)
			return
		}

		const result = setKeybinding(editingId, recordedKeys)
		if (result.success) {
			loadBindings()
			toast.success(recordedKeys.length === 0 ? "Shortcut disabled" : "Shortcut saved")
		} else if (result.conflict) {
			toast.error(`Conflicts with "${result.conflict}"`)
			return
		}

		setEditingId(null)
		setIsRecording(false)
		setRecordedKeys([])
		setConflict(null)
	}

	const handleReset = (id: string) => {
		resetKeybinding(id)
		loadBindings()
		toast.success("Shortcut reset to default")
	}

	const handleResetAll = () => {
		if (!confirm("Reset all keyboard shortcuts to defaults?")) return
		resetAllKeybindings()
		loadBindings()
		toast.success("All shortcuts reset to defaults")
	}

	const isModified = (binding: KeyBinding): boolean => {
		const defaultBinding = DEFAULT_KEYBINDINGS.find((b) => b.id === binding.id)
		if (!defaultBinding) return false

		const currentKeys = binding.keys.sort().join("+")
		const defaultKeys = defaultBinding.keys.sort().join("+")
		return currentKeys !== defaultKeys
	}

	// Group bindings by category
	const groupedBindings = bindings.reduce((acc, binding) => {
		const category = binding.category
		if (!acc[category]) acc[category] = []
		acc[category].push(binding)
		return acc
	}, {} as Record<string, KeyBinding[]>)

	const editingBinding = editingId ? bindings.find((b) => b.id === editingId) : null

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Keyboard Shortcuts</CardTitle>
						<CardDescription>
							Customize keyboard shortcuts. Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘/</kbd> to view all shortcuts.
						</CardDescription>
					</div>
					<Button variant="outline" size="sm" onClick={handleResetAll}>
						<HugeiconsIcon icon={RefreshIcon} size={14} className="mr-2" />
						Reset All
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{Object.entries(groupedBindings).map(([category, categoryBindings]) => (
					<div key={category} className="mb-6 last:mb-0">
						<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
							{CATEGORY_LABELS[category] || category}
						</h4>
						<div className="space-y-1">
							{categoryBindings.map((binding) => (
								<div
									key={binding.id}
									className="flex items-center justify-between px-3 py-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
								>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium">{binding.name}</p>
										<p className="text-xs text-muted-foreground">{binding.description}</p>
									</div>
									<div className="flex items-center gap-2 shrink-0">
										<kbd className={`px-2 py-1 bg-muted rounded text-xs font-mono min-w-[60px] text-center ${binding.keys.length === 0 ? "text-muted-foreground" : ""}`}>
											{formatKeys(binding.keys)}
										</kbd>
										{isModified(binding) && (
											<Button
												variant="ghost"
												size="sm"
												className="h-7 px-2 text-xs"
												onClick={() => handleReset(binding.id)}
												title="Reset to default"
											>
												<HugeiconsIcon icon={RefreshIcon} size={12} />
											</Button>
										)}
										<Button
											variant="outline"
											size="sm"
											className="h-7 px-2 text-xs"
											onClick={() => handleEdit(binding.id)}
										>
											Edit
										</Button>
									</div>
								</div>
							))}
						</div>
					</div>
				))}

				{bindings.length === 0 && (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
							<HugeiconsIcon icon={KeyboardIcon} size={24} className="text-muted-foreground" />
						</div>
						<h3 className="font-medium mb-1">No shortcuts configured</h3>
						<p className="text-sm text-muted-foreground">
							Shortcuts will appear here when available.
						</p>
					</div>
				)}
			</CardContent>

			{/* Edit Shortcut Dialog */}
			<Dialog open={!!editingId} onOpenChange={(open) => {
				if (!open) {
					setEditingId(null)
					setIsRecording(false)
					setRecordedKeys([])
					setConflict(null)
				}
			}}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Shortcut</DialogTitle>
						<DialogDescription>
							{editingBinding?.name}: {editingBinding?.description}
						</DialogDescription>
					</DialogHeader>
					<div className="py-6">
						<div className="flex flex-col items-center gap-4">
							<div
								className={`w-full p-6 rounded-lg border-2 border-dashed text-center transition-colors ${
									isRecording ? "border-primary bg-primary/5" : "border-muted"
								}`}
							>
								{recordedKeys.length > 0 ? (
									<kbd className="text-2xl font-mono">{formatKeys(recordedKeys)}</kbd>
								) : (
									<p className="text-muted-foreground">
										{isRecording ? "Press a key combination..." : "No shortcut set"}
									</p>
								)}
							</div>
							{conflict && (
								<p className="text-sm text-destructive">
									Conflicts with &quot;{conflict}&quot;
								</p>
							)}
							<div className="text-xs text-muted-foreground text-center space-y-1">
								<p>Press <kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> to cancel</p>
								<p>Press <kbd className="px-1 py-0.5 bg-muted rounded">Backspace</kbd> to clear/disable</p>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => {
							setEditingId(null)
							setIsRecording(false)
							setRecordedKeys([])
							setConflict(null)
						}}>
							Cancel
						</Button>
						<Button onClick={handleSave} disabled={!!conflict}>
							{recordedKeys.length === 0 ? "Disable Shortcut" : "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	)
}
