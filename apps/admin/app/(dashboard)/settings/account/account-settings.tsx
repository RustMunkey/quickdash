"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
	MusicNote03Icon,
	Upload04Icon,
	Delete02Icon,
	PlayIcon,
	PauseIcon,
	Edit02Icon,
	DragDropHorizontalIcon,
	Cancel01Icon,
	CameraAdd01Icon,
	PinIcon,
} from "@hugeicons/core-free-icons"
import { ImagePlus } from "lucide-react"
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core"
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogClose,
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
import { updateProfile, signOutAllSessions, deleteAccount } from "./actions"
import { themePresets } from "@/components/accent-theme-provider"
import { useMusicPlayer, type Track } from "@/components/music-player"
import { upload } from "@vercel/blob/client"
import {
	getUserAudioTracks,
	createAudioTrack,
	updateAudioTrack,
	deleteAudioTrack,
	reorderAudioTracks,
	type UserAudioTrack,
} from "../music/actions"
import { DraftsManagerDialog } from "@/components/drafts-manager"
import { getAllDrafts, deleteDraft as deleteDraftFromStore, type Draft } from "@/lib/use-draft"
import { KeyboardShortcutsSettings } from "@/components/keyboard-shortcuts-settings"
import { ImageCropper } from "@/components/ui/image-cropper"

function formatFileSize(bytes: number | null): string {
	if (!bytes) return "Unknown"
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number | null): string {
	if (!seconds) return "--:--"
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${mins}:${secs.toString().padStart(2, "0")}`
}

const themeOptions = [
	// Row 1: Warm tones
	{ id: "coffee", name: "Coffee", description: "Warm brown classic" },
	{ id: "cherry", name: "Cherry", description: "Bold red warmth" },
	{ id: "rose", name: "Rose", description: "Soft pink blush" },
	{ id: "peach", name: "Peach", description: "Gentle coral glow" },
	{ id: "sunset", name: "Sunset", description: "Amber orange hues" },
	// Row 2: Earth & nature
	{ id: "honey", name: "Honey", description: "Golden amber light" },
	{ id: "tea", name: "Tea", description: "Yellow-green zen" },
	{ id: "matcha", name: "Matcha", description: "Fresh green energy" },
	{ id: "sage", name: "Sage", description: "Earthy green calm" },
	{ id: "forest", name: "Forest", description: "Deep woodland" },
	// Row 3: Cool tones
	{ id: "mint", name: "Mint", description: "Crisp aqua fresh" },
	{ id: "sky", name: "Sky", description: "Light azure blue" },
	{ id: "ocean", name: "Ocean", description: "Deep sea depths" },
	{ id: "midnight", name: "Midnight", description: "Rich indigo night" },
	{ id: "lavender", name: "Lavender", description: "Soft purple mist" },
	// Row 4: Rich & neutral
	{ id: "plum", name: "Plum", description: "Deep violet luxury" },
	{ id: "berry", name: "Berry", description: "Vibrant magenta" },
	{ id: "wine", name: "Wine", description: "Rich burgundy" },
	{ id: "slate", name: "Slate", description: "Cool gray minimal" },
	{ id: "neutral", name: "Neutral", description: "Pure grayscale" },
]

type User = {
	id: string
	name: string
	email: string
	image: string | null
	role: string | null
	phone: string | null
	username: string | null
	bio: string | null
	bannerImage: string | null
	location: string | null
	website: string | null
	occupation: string | null
	birthdate: string | null
	createdAt: Date
}

const DRAFT_KEY_LABELS: Record<string, string> = {
	note: "Developer Notes",
	"blog-post": "Blog Posts",
	product: "Products",
	"email-template": "Email Templates",
	"site-page": "Site Pages",
	category: "Categories",
}

// Drafts card component
function DraftsCard() {
	const [drafts, setDrafts] = useState<Draft[]>([])

	useEffect(() => {
		setDrafts(getAllDrafts())
	}, [])

	const handleDeleteDraft = (id: string) => {
		deleteDraftFromStore(id)
		setDrafts(getAllDrafts())
	}

	const handleClearAll = () => {
		if (!confirm("Are you sure you want to clear all drafts? This cannot be undone.")) return
		drafts.forEach((d) => deleteDraftFromStore(d.id))
		setDrafts([])
	}

	// Group drafts by key
	const groupedDrafts = drafts.reduce((acc, draft) => {
		if (!acc[draft.key]) acc[draft.key] = []
		acc[draft.key].push(draft)
		return acc
	}, {} as Record<string, Draft[]>)

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Saved Drafts</CardTitle>
						<CardDescription>
							Unsaved work is automatically saved as drafts. {drafts.length > 0 && `(${drafts.length} drafts)`}
						</CardDescription>
					</div>
					{drafts.length > 0 && (
						<Button variant="outline" size="sm" onClick={handleClearAll}>
							Clear All
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent>
				{drafts.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
							<HugeiconsIcon icon={Edit02Icon} size={24} className="text-muted-foreground" />
						</div>
						<h3 className="font-medium mb-1">No drafts saved</h3>
						<p className="text-sm text-muted-foreground">
							When you start typing in forms, your work will be saved automatically.
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{Object.entries(groupedDrafts).map(([key, keyDrafts]) => (
							<div key={key}>
								<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
									{DRAFT_KEY_LABELS[key] || key}
								</h4>
								<div className="space-y-1">
									{keyDrafts.map((draft) => (
										<div
											key={draft.id}
											className="flex items-center justify-between px-3 py-2 rounded-lg border bg-background hover:bg-muted/50"
										>
											<div className="min-w-0">
												<p className="text-sm font-medium truncate">{draft.title || "Untitled"}</p>
												<p className="text-xs text-muted-foreground">
													{new Date(draft.updatedAt).toLocaleDateString("en-US", {
														month: "short",
														day: "numeric",
														hour: "numeric",
														minute: "2-digit",
													})}
												</p>
											</div>
											<Button
												variant="ghost"
												size="sm"
												className="text-destructive shrink-0"
												onClick={() => handleDeleteDraft(draft.id)}
											>
												<HugeiconsIcon icon={Delete02Icon} size={14} />
											</Button>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}

// Sortable track row component
function SortableTrackRow({
	track,
	isCurrentlyPlaying,
	onTogglePlay,
	onEdit,
	onDelete,
}: {
	track: UserAudioTrack
	isCurrentlyPlaying: boolean
	onTogglePlay: () => void
	onEdit: (track: UserAudioTrack) => void
	onDelete: (id: string) => void
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: track.id })

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	}

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`flex items-center gap-3 px-3 py-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors ${isCurrentlyPlaying ? "ring-1 ring-primary/50 bg-primary/5" : ""}`}
		>
			{/* Drag handle */}
			<button
				{...attributes}
				{...listeners}
				className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
			>
				<HugeiconsIcon icon={DragDropHorizontalIcon} size={16} />
			</button>

			{/* Play button */}
			<Button
				variant={isCurrentlyPlaying ? "default" : "ghost"}
				size="icon"
				className="size-8 shrink-0"
				onClick={onTogglePlay}
			>
				<HugeiconsIcon
					icon={isCurrentlyPlaying ? PauseIcon : PlayIcon}
					size={16}
				/>
			</Button>

			{/* Track info - wide layout */}
			<div className="flex-1 min-w-0 flex items-center gap-4">
				<div className="flex-1 min-w-0">
					<p className="font-medium text-sm truncate">{track.name}</p>
					{track.artist && (
						<p className="text-xs text-muted-foreground truncate">{track.artist}</p>
					)}
				</div>
				<div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
					<span className="w-12 text-right">{formatDuration(track.duration)}</span>
					<span className="w-16 text-right">{formatFileSize(track.fileSize)}</span>
					<span className="w-20 text-right">
						{new Date(track.createdAt).toLocaleDateString("en-US")}
					</span>
				</div>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-1 shrink-0">
				<Button
					variant="ghost"
					size="icon"
					className="size-7"
					onClick={() => onEdit(track)}
					title="Edit track"
				>
					<HugeiconsIcon icon={Edit02Icon} size={14} />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="size-7 text-destructive hover:text-destructive"
					onClick={() => onDelete(track.id)}
					title="Delete track"
				>
					<HugeiconsIcon icon={Delete02Icon} size={14} />
				</Button>
			</div>
		</div>
	)
}

export function AccountSettings({ user }: { user: User }) {
	const router = useRouter()
	const { theme, setTheme, resolvedTheme } = useTheme()
	const [name, setName] = useState(user.name)
	const [phone, setPhone] = useState(user.phone || "")
	const [image, setImage] = useState(user.image || "")
	const [bannerImage, setBannerImage] = useState(user.bannerImage || "")
	const [username, setUsername] = useState(user.username || "")
	const [bio, setBio] = useState(user.bio || "")
	const [location, setLocation] = useState(user.location || "")
	const [website, setWebsite] = useState(user.website || "")
	const [occupation, setOccupation] = useState(user.occupation || "")
	const [birthdate, setBirthdate] = useState(user.birthdate || "")
	const [saving, setSaving] = useState(false)
	const [uploading, setUploading] = useState(false)
	const [uploadingBanner, setUploadingBanner] = useState(false)
	const [mounted, setMounted] = useState(false)
	const [accentTheme, setAccentTheme] = useState("neutral")
	const fileInputRef = useRef<HTMLInputElement>(null)
	const bannerInputRef = useRef<HTMLInputElement>(null)
	const [cropperOpen, setCropperOpen] = useState(false)
	const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null)
	const [bannerCropperOpen, setBannerCropperOpen] = useState(false)
	const [selectedBannerSrc, setSelectedBannerSrc] = useState<string | null>(null)

	// Music library state
	const [tracks, setTracks] = useState<UserAudioTrack[]>([])
	const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
	const [editDialogOpen, setEditDialogOpen] = useState(false)
	const [editingTrack, setEditingTrack] = useState<UserAudioTrack | null>(null)
	const [uploadingTrack, setUploadingTrack] = useState(false)

	const { setTracks: setMusicPlayerTracks, playTrack, currentTrack, isPlaying, toggle } = useMusicPlayer()

	const MAX_TRACKS = 50

	// Danger zone state
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("")
	const [deleting, setDeleting] = useState(false)
	const [signingOutAll, setSigningOutAll] = useState(false)

	// DnD sensors
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	)

	// User-specific theme storage key for multi-tenant isolation
	const themeStorageKey = `quickdash-accent-theme-${user.id}`

	useEffect(() => {
		setMounted(true)
		// Load saved accent theme from localStorage (user-specific)
		const savedAccent = localStorage.getItem(themeStorageKey)
		if (savedAccent) {
			setAccentTheme(savedAccent)
		}
		// Load music tracks
		getUserAudioTracks().then(setTracks).catch(() => {})
	}, [themeStorageKey])

	// Sync tracks with music player
	useEffect(() => {
		const uploadedTracks: Track[] = tracks.map((t) => ({
			id: t.id,
			name: t.name,
			url: t.url,
			artist: t.artist || undefined,
			duration: t.duration || undefined,
			type: "uploaded" as const,
		}))
		setMusicPlayerTracks(uploadedTracks)
	}, [tracks, setMusicPlayerTracks])

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event

		if (over && active.id !== over.id) {
			const oldIndex = tracks.findIndex((t) => t.id === active.id)
			const newIndex = tracks.findIndex((t) => t.id === over.id)

			const newTracks = arrayMove(tracks, oldIndex, newIndex)
			setTracks(newTracks)

			// Persist the new order
			try {
				await reorderAudioTracks(newTracks.map((t) => t.id))
			} catch {
				// Revert on error
				setTracks(tracks)
				toast.error("Failed to save track order")
			}
		}
	}

	const handleTrackUpload = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		const formData = new FormData(e.currentTarget)

		const file = formData.get("file") as File
		const trackName = formData.get("name") as string
		const artist = formData.get("artist") as string | null

		if (!file || !file.size) {
			toast.error("Please select a file")
			return
		}

		if (!trackName) {
			toast.error("Please enter a track name")
			return
		}

		// Validate file type
		if (!file.type.startsWith("audio/")) {
			toast.error("Please select an audio file")
			return
		}

		// Validate file size (50MB)
		if (file.size > 50 * 1024 * 1024) {
			toast.error("File too large (max 50MB)")
			return
		}

		// Check track limit
		if (tracks.length >= MAX_TRACKS) {
			toast.error(`Maximum ${MAX_TRACKS} tracks allowed. Delete some tracks to upload more.`)
			return
		}

		setUploadingTrack(true)
		try {
			// Use Vercel Blob client upload to bypass Next.js body size limits
			const blob = await upload(`audio/${Date.now()}-${file.name}`, file, {
				access: "public",
				handleUploadUrl: "/api/upload-audio",
			})

			// Create the database record after successful upload
			const newTrack = await createAudioTrack({
				name: trackName,
				artist: artist || null,
				url: blob.url,
				fileSize: file.size,
				mimeType: file.type,
			})

			setTracks((prev) => [...prev, newTrack])
			setUploadDialogOpen(false)
			;(e.target as HTMLFormElement).reset()
			toast.success("Track uploaded successfully")
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to upload track")
		} finally {
			setUploadingTrack(false)
		}
	}

	const handleTrackEdit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		if (!editingTrack) return

		const formData = new FormData(e.currentTarget)
		const trackName = formData.get("name") as string
		const artist = formData.get("artist") as string

		try {
			const updated = await updateAudioTrack(editingTrack.id, { name: trackName, artist: artist || null })
			setTracks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
			setEditDialogOpen(false)
			setEditingTrack(null)
			toast.success("Track updated")
		} catch {
			toast.error("Failed to update track")
		}
	}

	const handleTrackDelete = async (id: string) => {
		if (!confirm("Are you sure you want to delete this track?")) return

		try {
			await deleteAudioTrack(id)
			setTracks((prev) => prev.filter((t) => t.id !== id))
			toast.success("Track deleted")
		} catch {
			toast.error("Failed to delete track")
		}
	}

	const handleTogglePlay = (track: UserAudioTrack) => {
		// If this track is already playing, toggle pause/play
		if (currentTrack?.id === track.id) {
			toggle()
		} else {
			// Play this track in the global music player
			playTrack({
				id: track.id,
				name: track.name,
				url: track.url,
				artist: track.artist || undefined,
				duration: track.duration || undefined,
				type: "uploaded",
			})
		}
	}

	const initials = name
		.split(" ")
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2)

	function handleFileSelect(file: File) {
		// Validate file type
		if (!file.type.startsWith("image/")) {
			toast.error("Please select an image file")
			return
		}

		// Create a URL for the cropper
		const reader = new FileReader()
		reader.onload = () => {
			setSelectedImageSrc(reader.result as string)
			setCropperOpen(true)
		}
		reader.readAsDataURL(file)
	}

	async function handleCroppedImage(croppedBlob: Blob) {
		setUploading(true)
		try {
			const formData = new FormData()
			formData.append("file", croppedBlob, "avatar.jpg")
			const res = await fetch("/api/upload", { method: "POST", body: formData })
			if (!res.ok) throw new Error("Upload failed")
			const { url } = await res.json()
			setImage(url)
			toast.success("Photo uploaded")
		} catch {
			toast.error("Failed to upload photo")
		} finally {
			setUploading(false)
			setSelectedImageSrc(null)
		}
	}

	function handleBannerSelect(file: File) {
		if (!file.type.startsWith("image/")) {
			toast.error("Please select an image file")
			return
		}
		const reader = new FileReader()
		reader.onload = () => {
			setSelectedBannerSrc(reader.result as string)
			setBannerCropperOpen(true)
		}
		reader.readAsDataURL(file)
	}

	async function handleCroppedBanner(croppedBlob: Blob) {
		setUploadingBanner(true)
		try {
			const formData = new FormData()
			formData.append("file", croppedBlob, "banner.jpg")
			const res = await fetch("/api/upload", { method: "POST", body: formData })
			if (!res.ok) throw new Error("Upload failed")
			const { url } = await res.json()
			setBannerImage(url)
			toast.success("Banner uploaded")
		} catch {
			toast.error("Failed to upload banner")
		} finally {
			setUploadingBanner(false)
			setSelectedBannerSrc(null)
		}
	}

	async function handleSave() {
		if (!name.trim()) {
			toast.error("Name is required")
			return
		}
		setSaving(true)
		try {
			await updateProfile({
				name: name.trim(),
				phone: phone.trim() || undefined,
				image: image || undefined,
				bannerImage: bannerImage || undefined,
				username: username.trim() || undefined,
				bio: bio.trim() || undefined,
				location: location.trim() || undefined,
				website: website.trim() || undefined,
				occupation: occupation.trim() || undefined,
				birthdate: birthdate || undefined,
			})
			toast.success("Profile updated")
			// Refresh server components to update sidebar, header, etc.
			router.refresh()
		} catch {
			toast.error("Failed to update profile")
		} finally {
			setSaving(false)
		}
	}

	async function handleSignOutAllSessions() {
		setSigningOutAll(true)
		try {
			await signOutAllSessions()
			toast.success("Signed out of all other sessions")
		} catch {
			toast.error("Failed to sign out of other sessions")
		} finally {
			setSigningOutAll(false)
		}
	}

	async function handleDeleteAccount() {
		if (deleteConfirmEmail.toLowerCase() !== user.email.toLowerCase()) {
			toast.error("Email does not match")
			return
		}
		setDeleting(true)
		try {
			await deleteAccount(deleteConfirmEmail)
			// The redirect happens server-side
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to delete account")
			setDeleting(false)
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<p className="text-muted-foreground text-sm">Manage your profile and account settings.</p>
				<Button onClick={handleSave} disabled={saving}>
					{saving ? "Saving..." : "Save Changes"}
				</Button>
			</div>

			{/* Profile Header with Banner */}
			<Card className="overflow-hidden p-0 py-0 gap-0">
				{/* Banner */}
				<div className="relative group">
					<div className="h-32 sm:h-48 bg-muted">
							{bannerImage ? (
								<img src={bannerImage} alt="Banner" className="w-full h-full object-cover" />
							) : (
								<div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
							)}
							<div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center gap-4 transition-all">
								{uploadingBanner ? (
									<div className="size-10 rounded-full bg-white/20 flex items-center justify-center">
										<div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
									</div>
								) : (
									<>
										<button
											type="button"
											onClick={() => bannerInputRef.current?.click()}
											className="opacity-0 group-hover:opacity-100 transition-opacity p-3 rounded-full bg-white/20 hover:bg-white/30"
										>
											<ImagePlus className="size-6 text-white" />
										</button>
										{bannerImage && (
											<button
												type="button"
												onClick={() => setBannerImage("")}
												className="opacity-0 group-hover:opacity-100 transition-opacity p-3 rounded-full bg-white/20 hover:bg-white/30"
											>
												<HugeiconsIcon icon={Cancel01Icon} className="size-6 text-white" />
											</button>
										)}
									</>
								)}
							</div>
						</div>
						<input
							ref={bannerInputRef}
							type="file"
							accept="image/*"
							className="hidden"
							onChange={(e) => {
								const file = e.target.files?.[0]
								if (file) handleBannerSelect(file)
								e.target.value = ""
							}}
						/>
				</div>
				<CardContent className="pb-6">
					{/* Avatar overlapping banner */}
					<div className="relative -mt-12 sm:-mt-16 mb-4">
						<div
							className="relative cursor-pointer group w-fit"
							onClick={() => fileInputRef.current?.click()}
						>
							<Avatar className="size-24 sm:size-32 border-4 border-card">
								{image && <AvatarImage src={image} alt={name} />}
								<AvatarFallback className="text-2xl sm:text-3xl bg-muted">
									{initials || "?"}
								</AvatarFallback>
							</Avatar>
							<div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
								{uploading ? (
									<div className="size-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
								) : (
									<HugeiconsIcon
										icon={CameraAdd01Icon}
										className="size-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
									/>
								)}
							</div>
						</div>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							className="hidden"
							onChange={(e) => {
								const file = e.target.files?.[0]
								if (file) handleFileSelect(file)
								e.target.value = ""
							}}
						/>
					</div>

					{/* Profile display */}
					<div className="space-y-4">
						<div>
							<h3 className="text-xl font-bold">{name || "Your Name"}</h3>
							{username && <p className="text-muted-foreground">@{username}</p>}
						</div>

						{bio && <p className="text-sm">{bio}</p>}

						<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
							{occupation && <span>{occupation}</span>}
							{location && <span className="flex items-center gap-1"><HugeiconsIcon icon={PinIcon} size={14} />{location}</span>}
							{website && (
								<a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
									{website.replace(/^https?:\/\//, "")}
								</a>
							)}
							<span>Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
						</div>
					</div>

					<Separator className="my-6" />

					{/* Personal Info Form */}
					<div className="space-y-6">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Your name"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="username">Username</Label>
								<Input
									id="username"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									placeholder="username"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									value={user.email}
									readOnly
									className="text-muted-foreground"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="phone">Phone</Label>
								<Input
									id="phone"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									placeholder="+1 555-0000"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="bio">Bio</Label>
							<Input
								id="bio"
								value={bio}
								onChange={(e) => setBio(e.target.value)}
								placeholder="Tell us about yourself"
							/>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="occupation">Occupation</Label>
								<Input
									id="occupation"
									value={occupation}
									onChange={(e) => setOccupation(e.target.value)}
									placeholder="What do you do?"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="location">Location</Label>
								<Input
									id="location"
									value={location}
									onChange={(e) => setLocation(e.target.value)}
									placeholder="Where are you based?"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="website">Website</Label>
								<Input
									id="website"
									value={website}
									onChange={(e) => setWebsite(e.target.value)}
									placeholder="yoursite.com"
								/>
							</div>
							<div className="space-y-2">
								<Label>Role</Label>
								<div className="pt-2">
									<Badge variant="secondary" className="capitalize">
										{user.role || "member"}
									</Badge>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Appearance</CardTitle>
					<CardDescription>Customize how the dashboard looks for you.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-3">
						<Label>Color Mode</Label>
						<div className="flex gap-2">
							<Button
								variant={mounted && theme === "light" ? "default" : "outline"}
								size="sm"
								onClick={() => setTheme("light")}
								disabled={!mounted}
							>
								Light
							</Button>
							<Button
								variant={mounted && theme === "dark" ? "default" : "outline"}
								size="sm"
								onClick={() => setTheme("dark")}
								disabled={!mounted}
							>
								Dark
							</Button>
							<Button
								variant={mounted && theme === "system" ? "default" : "outline"}
								size="sm"
								onClick={() => setTheme("system")}
								disabled={!mounted}
							>
								System
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">
							{mounted
								? theme === "system"
									? `Follows your device's color scheme (currently ${resolvedTheme})`
									: `Currently using ${theme} mode`
								: "Loading..."}
						</p>
					</div>

					<Separator />

					<div className="space-y-3">
						<Label>Theme</Label>
						<p className="text-sm text-muted-foreground">Choose a color palette for the interface.</p>
						<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
							{themeOptions.map((option) => (
								<button
									key={option.id}
									type="button"
									onClick={() => {
										setAccentTheme(option.id)
										localStorage.setItem(themeStorageKey, option.id)
										window.dispatchEvent(new CustomEvent("accent-theme-change", { detail: option.id }))
										toast.success(`${option.name} theme applied`)
									}}
									className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
										accentTheme === option.id
											? "border-primary bg-muted"
											: "border-transparent hover:border-muted-foreground/20 hover:bg-muted/50"
									}`}
								>
									<div
										className="size-8 rounded-full border-2 border-white shadow-sm"
										style={{ backgroundColor: themePresets[option.id]?.light.primary }}
									/>
									<div className="text-center">
										<p className="text-xs font-medium">{option.name}</p>
										<p className="text-[10px] text-muted-foreground">{option.description}</p>
									</div>
								</button>
							))}
						</div>
						<p className="text-xs text-muted-foreground">
							Your accent theme preference is saved to this browser.
						</p>
					</div>
				</CardContent>
			</Card>

			<KeyboardShortcutsSettings />

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Music Library</CardTitle>
							<CardDescription>
								Upload and manage your personal music collection. Drag to reorder tracks.
								<span className="ml-2 text-xs">({tracks.length}/{MAX_TRACKS} tracks)</span>
							</CardDescription>
						</div>
						<Button
							size="sm"
							onClick={() => setUploadDialogOpen(true)}
							disabled={tracks.length >= MAX_TRACKS}
						>
							<HugeiconsIcon icon={Upload04Icon} size={16} className="mr-2" />
							Upload
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{tracks.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
								<HugeiconsIcon icon={MusicNote03Icon} size={24} className="text-muted-foreground" />
							</div>
							<h3 className="font-medium mb-1">No tracks uploaded</h3>
							<p className="text-sm text-muted-foreground mb-4">
								Upload MP3 files to add them to your music player.
							</p>
							<Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(true)}>
								Upload your first track
							</Button>
						</div>
					) : (
						<div className="space-y-1">
							{/* Header row */}
							<div className="hidden sm:flex items-center gap-3 px-3 py-1 text-xs text-muted-foreground font-medium">
								<div className="w-4" /> {/* Drag handle space */}
								<div className="w-8" /> {/* Play button space */}
								<div className="flex-1 flex items-center gap-4">
									<span className="flex-1">Track</span>
									<span className="w-12 text-right">Duration</span>
									<span className="w-16 text-right">Size</span>
									<span className="w-20 text-right">Added</span>
								</div>
								<div className="w-24" /> {/* Actions space */}
							</div>

							{/* Sortable tracks */}
							<DndContext
								sensors={sensors}
								collisionDetection={closestCenter}
								onDragEnd={handleDragEnd}
							>
								<SortableContext
									items={tracks.map((t) => t.id)}
									strategy={verticalListSortingStrategy}
								>
									{tracks.map((track) => (
										<SortableTrackRow
											key={track.id}
											track={track}
											isCurrentlyPlaying={currentTrack?.id === track.id && isPlaying}
											onTogglePlay={() => handleTogglePlay(track)}
											onEdit={(t) => {
												setEditingTrack(t)
												setEditDialogOpen(true)
											}}
											onDelete={handleTrackDelete}
										/>
									))}
								</SortableContext>
							</DndContext>
						</div>
					)}
				</CardContent>
			</Card>

			<DraftsCard />

			{/* Danger Zone */}
			<Card className="border-destructive/50">
				<CardHeader>
					<CardTitle className="text-destructive">Danger Zone</CardTitle>
					<CardDescription>
						Irreversible and destructive actions. Please be careful.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Sign out all sessions */}
					<div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border">
						<div className="space-y-1">
							<p className="font-medium">Sign out all other sessions</p>
							<p className="text-sm text-muted-foreground">
								This will sign you out of all devices and browsers except this one.
							</p>
						</div>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="outline" disabled={signingOutAll}>
									{signingOutAll ? "Signing out..." : "Sign out all"}
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Sign out all other sessions?</AlertDialogTitle>
									<AlertDialogDescription>
										This will invalidate all your other active sessions. You will remain signed in on this device.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction onClick={handleSignOutAllSessions}>
										Sign out all
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>

					{/* Delete account */}
					<div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
						<div className="space-y-1">
							<p className="font-medium text-destructive">Delete account</p>
							<p className="text-sm text-muted-foreground">
								Permanently delete your account and all associated data. This action cannot be undone.
							</p>
						</div>
						<Button
							variant="destructive"
							onClick={() => setDeleteDialogOpen(true)}
						>
							Delete account
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Delete Account Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="text-destructive">Delete your account</DialogTitle>
						<DialogDescription>
							This action is irreversible. All your data, workspaces you own (that have no other members), and settings will be permanently deleted.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="rounded-lg bg-destructive/10 p-4 text-sm">
							<p className="font-medium text-destructive mb-2">This will permanently delete:</p>
							<ul className="list-disc list-inside space-y-1 text-muted-foreground">
								<li>Your profile and account settings</li>
								<li>Workspaces you own (if you're the only member)</li>
								<li>All your uploaded files and music</li>
								<li>Your activity history and drafts</li>
							</ul>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirm-email">
								To confirm, type your email: <span className="font-mono text-muted-foreground">{user.email}</span>
							</Label>
							<Input
								id="confirm-email"
								value={deleteConfirmEmail}
								onChange={(e) => setDeleteConfirmEmail(e.target.value)}
								placeholder="Enter your email"
								autoComplete="off"
							/>
						</div>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline" disabled={deleting}>
								Cancel
							</Button>
						</DialogClose>
						<Button
							variant="destructive"
							onClick={handleDeleteAccount}
							disabled={deleting || deleteConfirmEmail.toLowerCase() !== user.email.toLowerCase()}
						>
							{deleting ? "Deleting..." : "Delete my account"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Upload Track Dialog */}
			<Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Upload Track</DialogTitle>
						<DialogDescription>
							Upload an audio file (max 50MB) to your library. You can store up to {MAX_TRACKS} tracks.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleTrackUpload}>
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<Label htmlFor="file">Audio File</Label>
								<Input
									id="file"
									name="file"
									type="file"
									accept="audio/*"
									required
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="track-name">Track Name</Label>
								<Input
									id="track-name"
									name="name"
									placeholder="My awesome track"
									required
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="artist">Artist (optional)</Label>
								<Input
									id="artist"
									name="artist"
									placeholder="Artist name"
								/>
							</div>
						</div>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={uploadingTrack}>
								{uploadingTrack ? "Uploading..." : "Upload"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Edit Track Dialog */}
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Track</DialogTitle>
						<DialogDescription>
							Update the track details.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleTrackEdit}>
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-name">Track Name</Label>
								<Input
									id="edit-name"
									name="name"
									defaultValue={editingTrack?.name}
									required
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-artist">Artist (optional)</Label>
								<Input
									id="edit-artist"
									name="artist"
									defaultValue={editingTrack?.artist || ""}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
								Cancel
							</Button>
							<Button type="submit">Save Changes</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Avatar Image Cropper */}
			{selectedImageSrc && (
				<ImageCropper
					open={cropperOpen}
					onOpenChange={(open) => {
						setCropperOpen(open)
						if (!open) setSelectedImageSrc(null)
					}}
					imageSrc={selectedImageSrc}
					onCropComplete={handleCroppedImage}
					cropShape="round"
					aspectRatio={1}
					title="Crop Profile Photo"
					description="Drag to reposition and use the slider to zoom. Your photo will be cropped to a circle."
					recommendedSize="512x512"
				/>
			)}

			{/* Banner Image Cropper */}
			{selectedBannerSrc && (
				<ImageCropper
					open={bannerCropperOpen}
					onOpenChange={(open) => {
						setBannerCropperOpen(open)
						if (!open) setSelectedBannerSrc(null)
					}}
					imageSrc={selectedBannerSrc}
					onCropComplete={handleCroppedBanner}
					cropShape="rect"
					aspectRatio={3}
					title="Crop Banner Image"
					description="Drag to reposition and use the slider to zoom."
					recommendedSize="1200x400"
					outputWidth={1200}
					outputHeight={400}
				/>
			)}
		</div>
	)
}
