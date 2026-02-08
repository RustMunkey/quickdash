"use client"

import { useState, useCallback, useMemo, useTransition } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
	Calendar01Icon,
	Clock01Icon,
	Add01Icon,
	Delete02Icon,
	Call02Icon,
	Video01Icon,
	UserGroupIcon,
	ArrowLeft01Icon,
	ArrowRight01Icon,
	CheckmarkCircle02Icon,
	PlayIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable, type Column } from "@/components/data-table"
import { cn } from "@/lib/utils"
import { useCall } from "@/components/calls"
import {
	getEvents,
	createEvent,
	updateEvent,
	deleteEvent,
	bulkDeleteEvents,
} from "./actions"
import type {
	SchedulingEvent,
	CreateEventInput,
	EventType,
	ViewMode,
	TeamMember,
	CallType,
	RecurrenceType,
} from "./types"
import { EVENT_COLORS, getEventColorClass } from "./types"

// ─── Helpers ──────────────────────────────────────────────────────

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2)
}

function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
}

function formatDatetime(iso: string): string {
	return new Date(iso).toLocaleDateString([], {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	})
}

const EVENT_TYPE_ICONS: Record<EventType, typeof Calendar01Icon> = {
	meeting: UserGroupIcon,
	call: Call02Icon,
	appointment: Calendar01Icon,
	task: CheckmarkCircle02Icon,
	reminder: Clock01Icon,
}

function EventTypeBadge({ type }: { type: EventType }) {
	const colors: Record<EventType, string> = {
		meeting: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
		call: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
		appointment: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800",
		task: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800",
		reminder: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800",
	}
	return (
		<Badge variant="outline" className={cn("capitalize", colors[type])}>
			<HugeiconsIcon icon={EVENT_TYPE_ICONS[type]} size={12} className="mr-1" />
			{type}
		</Badge>
	)
}

function StatusBadge({ status }: { status: string }) {
	const colors: Record<string, string> = {
		scheduled: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
		completed: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
		cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800",
	}
	return (
		<Badge variant="outline" className={cn("capitalize", colors[status] ?? "")}>
			{status}
		</Badge>
	)
}

function rruleToRecurrence(rrule: string | null): RecurrenceType {
	if (!rrule) return "none"
	if (rrule.includes("FREQ=DAILY")) return "daily"
	if (rrule.includes("FREQ=WEEKLY")) return "weekly"
	if (rrule.includes("FREQ=MONTHLY")) return "monthly"
	return "none"
}

function recurrenceToRrule(type: RecurrenceType): string | undefined {
	switch (type) {
		case "daily": return "FREQ=DAILY"
		case "weekly": return "FREQ=WEEKLY"
		case "monthly": return "FREQ=MONTHLY"
		default: return undefined
	}
}

// ─── Month View ───────────────────────────────────────────────────

function MonthView({
	events,
	currentDate,
	onDayClick,
	onEventClick,
}: {
	events: SchedulingEvent[]
	currentDate: Date
	onDayClick: (date: Date) => void
	onEventClick: (event: SchedulingEvent) => void
}) {
	const year = currentDate.getFullYear()
	const month = currentDate.getMonth()
	const firstDay = new Date(year, month, 1).getDay()
	const daysInMonth = new Date(year, month + 1, 0).getDate()
	const today = new Date()

	// Build grid: 6 rows x 7 cols
	const cells: (number | null)[] = []
	for (let i = 0; i < firstDay; i++) cells.push(null)
	for (let d = 1; d <= daysInMonth; d++) cells.push(d)
	while (cells.length < 42) cells.push(null)

	// Index events by day
	const eventsByDay: Record<number, SchedulingEvent[]> = {}
	for (const ev of events) {
		const d = new Date(ev.startsAt)
		if (d.getFullYear() === year && d.getMonth() === month) {
			const day = d.getDate()
			if (!eventsByDay[day]) eventsByDay[day] = []
			eventsByDay[day].push(ev)
		}
	}

	const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

	return (
		<div className="border rounded-lg overflow-hidden">
			{/* Header */}
			<div className="grid grid-cols-7 border-b bg-muted/30">
				{weekdays.map((d) => (
					<div key={d} className="px-2 py-1.5 text-xs font-medium text-muted-foreground text-center">
						{d}
					</div>
				))}
			</div>

			{/* Grid */}
			<div className="grid grid-cols-7">
				{cells.map((day, i) => {
					const isToday = day !== null && today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
					const dayEvents = day ? eventsByDay[day] ?? [] : []

					return (
						<div
							key={i}
							className={cn(
								"min-h-[5.5rem] border-b border-r p-1 cursor-pointer hover:bg-muted/30 transition-colors",
								day === null && "bg-muted/10",
								i % 7 === 6 && "border-r-0"
							)}
							onClick={() => day && onDayClick(new Date(year, month, day))}
						>
							{day && (
								<>
									<div className={cn(
										"text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full",
										isToday && "bg-primary text-primary-foreground"
									)}>
										{day}
									</div>
									<div className="space-y-0.5">
										{dayEvents.slice(0, 3).map((ev) => (
											<button
												key={ev.id}
												onClick={(e) => { e.stopPropagation(); onEventClick(ev) }}
												className={cn(
													"w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white",
													getEventColorClass(ev.color)
												)}
											>
												{ev.isAllDay ? ev.title : `${formatTime(ev.startsAt)} ${ev.title}`}
											</button>
										))}
										{dayEvents.length > 3 && (
											<div className="text-[10px] text-muted-foreground px-1">
												+{dayEvents.length - 3} more
											</div>
										)}
									</div>
								</>
							)}
						</div>
					)
				})}
			</div>
		</div>
	)
}

// ─── Week View ────────────────────────────────────────────────────

function WeekView({
	events,
	currentDate,
	onEventClick,
}: {
	events: SchedulingEvent[]
	currentDate: Date
	onEventClick: (event: SchedulingEvent) => void
}) {
	const day = currentDate.getDay()
	const weekStart = new Date(currentDate)
	weekStart.setDate(currentDate.getDate() - day)
	weekStart.setHours(0, 0, 0, 0)

	const days: Date[] = []
	for (let i = 0; i < 7; i++) {
		const d = new Date(weekStart)
		d.setDate(weekStart.getDate() + i)
		days.push(d)
	}

	const hours = Array.from({ length: 24 }, (_, i) => i)
	const today = new Date()

	// Index events
	const eventsByDayHour: Record<string, SchedulingEvent[]> = {}
	for (const ev of events) {
		const d = new Date(ev.startsAt)
		const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
		if (!eventsByDayHour[key]) eventsByDayHour[key] = []
		eventsByDayHour[key].push(ev)
	}

	return (
		<div className="border rounded-lg overflow-auto max-h-[calc(100vh-14rem)]">
			{/* Day headers */}
			<div className="grid grid-cols-[3rem_repeat(7,1fr)] border-b bg-muted/30 sticky top-0 z-10">
				<div className="border-r" />
				{days.map((d, i) => {
					const isToday = d.toDateString() === today.toDateString()
					return (
						<div key={i} className={cn("px-2 py-1.5 text-center border-r last:border-r-0", isToday && "bg-primary/5")}>
							<div className="text-[10px] text-muted-foreground uppercase">
								{d.toLocaleDateString([], { weekday: "short" })}
							</div>
							<div className={cn(
								"text-sm font-medium",
								isToday && "text-primary"
							)}>
								{d.getDate()}
							</div>
						</div>
					)
				})}
			</div>

			{/* Time grid */}
			{hours.map((hour) => (
				<div key={hour} className="grid grid-cols-[3rem_repeat(7,1fr)] border-b last:border-b-0">
					<div className="text-[10px] text-muted-foreground text-right pr-1.5 pt-0.5 border-r">
						{hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
					</div>
					{days.map((d, di) => {
						const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${hour}`
						const slotEvents = eventsByDayHour[key] ?? []
						return (
							<div key={di} className="min-h-[2.5rem] border-r last:border-r-0 p-0.5 relative">
								{slotEvents.map((ev) => (
									<button
										key={ev.id}
										onClick={() => onEventClick(ev)}
										className={cn(
											"w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white mb-0.5",
											getEventColorClass(ev.color)
										)}
									>
										{ev.title}
									</button>
								))}
							</div>
						)
					})}
				</div>
			))}
		</div>
	)
}

// ─── List View ────────────────────────────────────────────────────

function ListView({
	events,
	selectedIds,
	onSelectionChange,
	onEventClick,
	onStartCall,
}: {
	events: SchedulingEvent[]
	selectedIds: string[]
	onSelectionChange: (ids: string[]) => void
	onEventClick: (event: SchedulingEvent) => void
	onStartCall: (eventId: string) => void
}) {
	const columns: Column<SchedulingEvent>[] = [
		{
			key: "title",
			header: "Title",
			cell: (row) => (
				<div className="flex items-center gap-2">
					<div className={cn("w-2 h-2 rounded-full shrink-0", getEventColorClass(row.color))} />
					<span className="font-medium truncate">{row.title}</span>
				</div>
			),
		},
		{
			key: "type",
			header: "Type",
			cell: (row) => <EventTypeBadge type={row.type} />,
		},
		{
			key: "datetime",
			header: "Date & Time",
			cell: (row) => (
				<div className="text-sm">
					{row.isAllDay ? (
						<span>{formatDate(row.startsAt)} (All day)</span>
					) : (
						<span>{formatDatetime(row.startsAt)}</span>
					)}
				</div>
			),
		},
		{
			key: "attendees",
			header: "Attendees",
			cell: (row) => (
				<div className="flex -space-x-1.5">
					{row.attendees.slice(0, 4).map((a) => (
						<Avatar key={a.id} className="h-6 w-6 border-2 border-background">
							{a.image && <AvatarImage src={a.image} alt={a.name} />}
							<AvatarFallback className="text-[8px]">{getInitials(a.name)}</AvatarFallback>
						</Avatar>
					))}
					{row.attendees.length > 4 && (
						<div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-medium">
							+{row.attendees.length - 4}
						</div>
					)}
				</div>
			),
		},
		{
			key: "status",
			header: "Status",
			cell: (row) => <StatusBadge status={row.status} />,
		},
		{
			key: "actions",
			header: "",
			className: "w-10",
			cell: (row) => (
				<div className="flex items-center gap-1">
					{row.type === "call" && row.status === "scheduled" && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={(e) => { e.stopPropagation(); onStartCall(row.id) }}
						>
							<HugeiconsIcon icon={PlayIcon} size={14} />
						</Button>
					)}
				</div>
			),
		},
	]

	return (
		<DataTable
			columns={columns}
			data={events}
			searchPlaceholder="Search events..."
			selectable
			selectedIds={selectedIds}
			onSelectionChange={onSelectionChange}
			getId={(row) => row.id}
			onRowClick={onEventClick}
			emptyMessage="No events found"
			emptyDescription="Create your first event to get started"
		/>
	)
}

// ─── Create/Edit Sheet ───────────────────────────────────────────

function EventSheet({
	open,
	onOpenChange,
	event,
	teamMembers,
	onSave,
	onDelete,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	event: SchedulingEvent | null
	teamMembers: TeamMember[]
	onSave: (data: CreateEventInput) => Promise<void>
	onDelete: (id: string) => Promise<void>
}) {
	const isEditing = !!event
	const [saving, setSaving] = useState(false)

	// Form state
	const [title, setTitle] = useState("")
	const [description, setDescription] = useState("")
	const [type, setType] = useState<EventType>("meeting")
	const [startsAt, setStartsAt] = useState("")
	const [endsAt, setEndsAt] = useState("")
	const [isAllDay, setIsAllDay] = useState(false)
	const [location, setLocation] = useState("")
	const [callType, setCallType] = useState<CallType>("video")
	const [recurrence, setRecurrence] = useState<RecurrenceType>("none")
	const [color, setColor] = useState("blue")
	const [reminderMinutes, setReminderMinutes] = useState("15")
	const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])

	// Reset form when event changes
	const resetForm = useCallback((ev: SchedulingEvent | null) => {
		if (ev) {
			setTitle(ev.title)
			setDescription(ev.description ?? "")
			setType(ev.type)
			setStartsAt(ev.startsAt.slice(0, 16)) // datetime-local format
			setEndsAt(ev.endsAt?.slice(0, 16) ?? "")
			setIsAllDay(ev.isAllDay)
			setLocation(ev.location ?? "")
			setCallType(ev.callType ?? "video")
			setRecurrence(rruleToRecurrence(ev.rrule))
			setColor(ev.color ?? "blue")
			setReminderMinutes(String(ev.reminderMinutes ?? 15))
			setSelectedAttendees(ev.attendees.map((a) => a.userId))
		} else {
			// Default for new event
			const now = new Date()
			now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0)
			const end = new Date(now.getTime() + 60 * 60 * 1000)
			setTitle("")
			setDescription("")
			setType("meeting")
			setStartsAt(toLocalISO(now))
			setEndsAt(toLocalISO(end))
			setIsAllDay(false)
			setLocation("")
			setCallType("video")
			setRecurrence("none")
			setColor("blue")
			setReminderMinutes("15")
			setSelectedAttendees([])
		}
	}, [])

	// When opening, populate form
	const handleOpenChange = useCallback(
		(isOpen: boolean) => {
			if (isOpen) resetForm(event)
			onOpenChange(isOpen)
		},
		[event, onOpenChange, resetForm]
	)

	// Sync form when event changes while sheet is open
	useState(() => { if (open) resetForm(event) })

	const handleSubmit = async () => {
		if (!title.trim() || !startsAt) return
		setSaving(true)
		try {
			await onSave({
				title: title.trim(),
				description: description.trim() || undefined,
				type,
				startsAt: new Date(startsAt).toISOString(),
				endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
				isAllDay,
				location: location.trim() || undefined,
				callType: type === "call" ? callType : undefined,
				rrule: recurrenceToRrule(recurrence),
				color,
				reminderMinutes: parseInt(reminderMinutes) || 15,
				attendeeIds: selectedAttendees,
			})
			onOpenChange(false)
		} finally {
			setSaving(false)
		}
	}

	const toggleAttendee = (userId: string) => {
		setSelectedAttendees((prev) =>
			prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
		)
	}

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
				<SheetHeader>
					<SheetTitle>{isEditing ? "Edit Event" : "New Event"}</SheetTitle>
				</SheetHeader>

				<div className="space-y-5 py-4 px-1">
					{/* Title */}
					<div className="space-y-1.5">
						<Label>Title</Label>
						<Input
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Event title"
						/>
					</div>

					{/* Type */}
					<div className="space-y-1.5">
						<Label>Type</Label>
						<Select value={type} onValueChange={(v) => setType(v as EventType)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{(["meeting", "call", "appointment", "task", "reminder"] as const).map((t) => (
									<SelectItem key={t} value={t}>
										<div className="flex items-center gap-2 capitalize">
											<HugeiconsIcon icon={EVENT_TYPE_ICONS[t]} size={14} />
											{t}
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Call type (only for call events) */}
					{type === "call" && (
						<div className="space-y-1.5">
							<Label>Call Type</Label>
							<div className="flex gap-2">
								<Button
									variant={callType === "video" ? "default" : "outline"}
									size="sm"
									onClick={() => setCallType("video")}
								>
									<HugeiconsIcon icon={Video01Icon} size={14} className="mr-1" />
									Video
								</Button>
								<Button
									variant={callType === "voice" ? "default" : "outline"}
									size="sm"
									onClick={() => setCallType("voice")}
								>
									<HugeiconsIcon icon={Call02Icon} size={14} className="mr-1" />
									Voice
								</Button>
							</div>
						</div>
					)}

					{/* All-day toggle */}
					<div className="flex items-center gap-2">
						<Switch checked={isAllDay} onCheckedChange={setIsAllDay} />
						<Label>All day</Label>
					</div>

					{/* Date/Time */}
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label>Start</Label>
							<Input
								type={isAllDay ? "date" : "datetime-local"}
								value={isAllDay ? startsAt.split("T")[0] : startsAt}
								onChange={(e) => setStartsAt(e.target.value)}
							/>
						</div>
						{type !== "reminder" && (
							<div className="space-y-1.5">
								<Label>End</Label>
								<Input
									type={isAllDay ? "date" : "datetime-local"}
									value={isAllDay ? endsAt.split("T")[0] : endsAt}
									onChange={(e) => setEndsAt(e.target.value)}
								/>
							</div>
						)}
					</div>

					{/* Location (meeting/appointment only) */}
					{(type === "meeting" || type === "appointment") && (
						<div className="space-y-1.5">
							<Label>Location</Label>
							<Input
								value={location}
								onChange={(e) => setLocation(e.target.value)}
								placeholder="Physical address or URL"
							/>
						</div>
					)}

					{/* Recurrence */}
					<div className="space-y-1.5">
						<Label>Recurrence</Label>
						<Select value={recurrence} onValueChange={(v) => setRecurrence(v as RecurrenceType)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">None</SelectItem>
								<SelectItem value="daily">Daily</SelectItem>
								<SelectItem value="weekly">Weekly</SelectItem>
								<SelectItem value="monthly">Monthly</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Description */}
					<div className="space-y-1.5">
						<Label>Description</Label>
						<Textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional description..."
							rows={3}
						/>
					</div>

					{/* Attendees */}
					<div className="space-y-1.5">
						<Label>Attendees</Label>
						<div className="border rounded-md max-h-40 overflow-y-auto">
							{teamMembers.map((member) => (
								<button
									key={member.id}
									type="button"
									onClick={() => toggleAttendee(member.id)}
									className={cn(
										"flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors",
										selectedAttendees.includes(member.id) && "bg-muted/50"
									)}
								>
									<Checkbox checked={selectedAttendees.includes(member.id)} />
									<Avatar className="h-5 w-5">
										{member.image && <AvatarImage src={member.image} alt={member.name ?? ""} />}
										<AvatarFallback className="text-[8px]">
											{getInitials(member.name ?? member.email)}
										</AvatarFallback>
									</Avatar>
									<span className="truncate">{member.name ?? member.email}</span>
								</button>
							))}
						</div>
					</div>

					{/* Color */}
					<div className="space-y-1.5">
						<Label>Color</Label>
						<div className="flex gap-1.5 flex-wrap">
							{EVENT_COLORS.map((c) => (
								<button
									key={c.value}
									onClick={() => setColor(c.value)}
									className={cn(
										"w-6 h-6 rounded-full transition-all",
										c.class,
										color === c.value
											? "ring-2 ring-offset-2 ring-primary"
											: "opacity-60 hover:opacity-100"
									)}
									title={c.label}
								/>
							))}
						</div>
					</div>

					{/* Reminder */}
					<div className="space-y-1.5">
						<Label>Reminder</Label>
						<Select value={reminderMinutes} onValueChange={setReminderMinutes}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="5">5 minutes before</SelectItem>
								<SelectItem value="15">15 minutes before</SelectItem>
								<SelectItem value="30">30 minutes before</SelectItem>
								<SelectItem value="60">1 hour before</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Actions */}
					<div className="flex items-center gap-2 pt-2">
						<Button onClick={handleSubmit} disabled={saving || !title.trim()}>
							{saving ? "Saving..." : isEditing ? "Update Event" : "Create Event"}
						</Button>
						{isEditing && event && (
							<Button
								variant="destructive"
								onClick={async () => {
									await onDelete(event.id)
									onOpenChange(false)
								}}
							>
								<HugeiconsIcon icon={Delete02Icon} size={14} className="mr-1" />
								Delete
							</Button>
						)}
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	)
}

function toLocalISO(date: Date): string {
	const pad = (n: number) => n.toString().padStart(2, "0")
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// ─── Main Component ──────────────────────────────────────────────

export function SchedulingClient({
	initialEvents,
	teamMembers,
}: {
	initialEvents: SchedulingEvent[]
	teamMembers: TeamMember[]
}) {
	const [events, setEvents] = useState<SchedulingEvent[]>(initialEvents)
	const [view, setView] = useState<ViewMode>("month")
	const [currentDate, setCurrentDate] = useState(new Date())
	const [typeFilter, setTypeFilter] = useState("all")
	const [sheetOpen, setSheetOpen] = useState(false)
	const [editingEvent, setEditingEvent] = useState<SchedulingEvent | null>(null)
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [isPending, startTransition] = useTransition()
	const call = useCall()

	const refreshEvents = useCallback(
		(date?: Date, v?: ViewMode) => {
			const d = date ?? currentDate
			const viewMode = v ?? view
			startTransition(async () => {
				const data = await getEvents({
					view: viewMode === "month" ? "month" : viewMode === "week" ? "week" : "list",
					date: d.toISOString(),
					type: typeFilter !== "all" ? typeFilter : undefined,
				})
				setEvents(data)
			})
		},
		[currentDate, view, typeFilter]
	)

	const navigateMonth = useCallback(
		(dir: -1 | 1) => {
			const next = new Date(currentDate)
			if (view === "week") {
				next.setDate(next.getDate() + dir * 7)
			} else {
				next.setMonth(next.getMonth() + dir)
			}
			setCurrentDate(next)
			refreshEvents(next)
		},
		[currentDate, view, refreshEvents]
	)

	const goToToday = useCallback(() => {
		const today = new Date()
		setCurrentDate(today)
		refreshEvents(today)
	}, [refreshEvents])

	const handleViewChange = useCallback(
		(v: ViewMode) => {
			setView(v)
			refreshEvents(currentDate, v)
		},
		[currentDate, refreshEvents]
	)

	const handleDayClick = useCallback((date: Date) => {
		setEditingEvent(null)
		setSheetOpen(true)
	}, [])

	const handleEventClick = useCallback((event: SchedulingEvent) => {
		setEditingEvent(event)
		setSheetOpen(true)
	}, [])

	const handleSave = useCallback(
		async (data: CreateEventInput) => {
			if (editingEvent) {
				await updateEvent(editingEvent.id, data)
			} else {
				await createEvent(data)
			}
			refreshEvents()
		},
		[editingEvent, refreshEvents]
	)

	const handleDelete = useCallback(
		async (id: string) => {
			await deleteEvent(id)
			refreshEvents()
		},
		[refreshEvents]
	)

	const handleBulkDelete = useCallback(async () => {
		if (selectedIds.length === 0) return
		await bulkDeleteEvents(selectedIds)
		setSelectedIds([])
		refreshEvents()
	}, [selectedIds, refreshEvents])

	const handleStartCall = useCallback(async (eventId: string) => {
		try {
			const event = events.find((e) => e.id === eventId)
			if (!event) return
			const participantIds = event.attendees
				.filter((a) => a.userId !== event.createdBy)
				.map((a) => a.userId)
			await call.startCall(
				participantIds,
				(event.callType as "voice" | "video") || "video"
			)
		} catch (err) {
			console.error("Failed to start scheduled call:", err)
		}
	}, [call, events])

	const monthLabel = currentDate.toLocaleDateString([], {
		month: "long",
		year: "numeric",
	})

	const weekLabel = useMemo(() => {
		if (view !== "week") return ""
		const day = currentDate.getDay()
		const start = new Date(currentDate)
		start.setDate(currentDate.getDate() - day)
		const end = new Date(start)
		end.setDate(start.getDate() + 6)
		return `${start.toLocaleDateString([], { month: "short", day: "numeric" })} - ${end.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`
	}, [currentDate, view])

	return (
		<div className="flex-1 p-6 space-y-4">
			{/* Toolbar */}
			<div className="flex flex-col sm:flex-row sm:items-center gap-3">
				{/* Navigation */}
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={goToToday}>
						Today
					</Button>
					<div className="flex items-center gap-0.5">
						<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(-1)}>
							<HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
						</Button>
						<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(1)}>
							<HugeiconsIcon icon={ArrowRight01Icon} size={16} />
						</Button>
					</div>
					<h2 className="text-base font-semibold">
						{view === "week" ? weekLabel : monthLabel}
					</h2>
				</div>

				<div className="flex items-center gap-2 sm:ml-auto">
					{/* Type filter */}
					<Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); refreshEvents() }}>
						<SelectTrigger className="w-[130px] h-8 text-xs">
							<SelectValue placeholder="All types" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Types</SelectItem>
							<SelectItem value="meeting">Meetings</SelectItem>
							<SelectItem value="call">Calls</SelectItem>
							<SelectItem value="appointment">Appointments</SelectItem>
							<SelectItem value="task">Tasks</SelectItem>
							<SelectItem value="reminder">Reminders</SelectItem>
						</SelectContent>
					</Select>

					{/* View toggle */}
					<div className="flex items-center border rounded-md">
						{(["month", "week", "list"] as const).map((v) => (
							<Button
								key={v}
								variant={view === v ? "secondary" : "ghost"}
								size="sm"
								className="h-7 px-2.5 text-xs capitalize rounded-none first:rounded-l-md last:rounded-r-md"
								onClick={() => handleViewChange(v)}
							>
								{v}
							</Button>
						))}
					</div>

					{/* Create button */}
					<Button size="sm" className="h-8" onClick={() => { setEditingEvent(null); setSheetOpen(true) }}>
						<HugeiconsIcon icon={Add01Icon} size={14} className="mr-1" />
						New Event
					</Button>
				</div>
			</div>

			{/* Bulk actions */}
			{selectedIds.length > 0 && view === "list" && (
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
					<Button variant="destructive" size="sm" onClick={handleBulkDelete}>
						<HugeiconsIcon icon={Delete02Icon} size={14} className="mr-1" />
						Delete Selected
					</Button>
				</div>
			)}

			{/* View content */}
			{view === "month" && (
				<MonthView
					events={events}
					currentDate={currentDate}
					onDayClick={handleDayClick}
					onEventClick={handleEventClick}
				/>
			)}
			{view === "week" && (
				<WeekView
					events={events}
					currentDate={currentDate}
					onEventClick={handleEventClick}
				/>
			)}
			{view === "list" && (
				<ListView
					events={events}
					selectedIds={selectedIds}
					onSelectionChange={setSelectedIds}
					onEventClick={handleEventClick}
					onStartCall={handleStartCall}
				/>
			)}

			{/* Create/Edit Sheet */}
			<EventSheet
				open={sheetOpen}
				onOpenChange={setSheetOpen}
				event={editingEvent}
				teamMembers={teamMembers}
				onSave={handleSave}
				onDelete={handleDelete}
			/>
		</div>
	)
}
