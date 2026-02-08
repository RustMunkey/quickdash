"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { updateProfile, checkUsername } from "./actions"
import { useDebounce } from "@/hooks/use-debounce"
import { Check, X, Loader2, ImagePlus, Pencil, Sun, Moon, Monitor, MapPin, Link2, Briefcase, Calendar, ArrowLeft } from "lucide-react"
import { HugeiconsIcon } from "@hugeicons/react"
import { CameraAdd01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { ImageCropper } from "@/components/ui/image-cropper"
import { useTheme } from "next-themes"
import { themePresets } from "@/components/accent-theme-provider"

const themeOptions = [
	{ id: "neutral", name: "Neutral" },
	{ id: "coffee", name: "Coffee" },
	{ id: "cherry", name: "Cherry" },
	{ id: "rose", name: "Rose" },
	{ id: "peach", name: "Peach" },
	{ id: "sunset", name: "Sunset" },
	{ id: "honey", name: "Honey" },
	{ id: "tea", name: "Tea" },
	{ id: "matcha", name: "Matcha" },
	{ id: "sage", name: "Sage" },
	{ id: "forest", name: "Forest" },
	{ id: "mint", name: "Mint" },
	{ id: "sky", name: "Sky" },
	{ id: "ocean", name: "Ocean" },
	{ id: "midnight", name: "Midnight" },
	{ id: "lavender", name: "Lavender" },
	{ id: "plum", name: "Plum" },
	{ id: "berry", name: "Berry" },
	{ id: "wine", name: "Wine" },
	{ id: "slate", name: "Slate" },
]

interface ProfileStepProps {
	user: {
		id: string
		name: string
		email: string
		image: string | null | undefined
		username: string | null | undefined
		bio: string | null | undefined
		bannerImage: string | null | undefined
		location: string | null | undefined
		website: string | null | undefined
		occupation: string | null | undefined
		birthdate: string | null | undefined
	}
}

export function ProfileStep({ user }: ProfileStepProps) {
	const router = useRouter()
	const { theme, setTheme } = useTheme()
	const [isPending, startTransition] = useTransition()
	const [mounted, setMounted] = useState(false)
	const [accentTheme, setAccentTheme] = useState("neutral")

	// Form state - pre-populate with existing values
	const [displayName, setDisplayName] = useState(user.name)
	const [username, setUsername] = useState(user.username || "")
	const [bio, setBio] = useState(user.bio || "")
	const [location, setLocation] = useState(user.location || "")
	const [website, setWebsite] = useState(user.website || "")
	const [occupation, setOccupation] = useState(user.occupation || "")
	const [birthdate, setBirthdate] = useState(user.birthdate || "")
	const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">(
		user.username ? "available" : "idle"
	)
	const [error, setError] = useState<string | null>(null)

	// Edit mode
	const [editingName, setEditingName] = useState(false)
	const [editingUsername, setEditingUsername] = useState(false)
	const [editingBio, setEditingBio] = useState(false)
	const [editingLocation, setEditingLocation] = useState(false)
	const [editingWebsite, setEditingWebsite] = useState(false)
	const [editingOccupation, setEditingOccupation] = useState(false)
	const nameInputRef = useRef<HTMLInputElement>(null)
	const usernameInputRef = useRef<HTMLInputElement>(null)
	const bioInputRef = useRef<HTMLTextAreaElement>(null)
	const locationInputRef = useRef<HTMLInputElement>(null)
	const websiteInputRef = useRef<HTMLInputElement>(null)
	const occupationInputRef = useRef<HTMLInputElement>(null)

	// Image state - pre-populate with existing values
	const [image, setImage] = useState(user.image || "")
	const [bannerImage, setBannerImage] = useState(user.bannerImage || "")
	const [uploading, setUploading] = useState(false)
	const [uploadingBanner, setUploadingBanner] = useState(false)
	const avatarInputRef = useRef<HTMLInputElement>(null)
	const bannerInputRef = useRef<HTMLInputElement>(null)

	// Cropper state
	const [cropperOpen, setCropperOpen] = useState(false)
	const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null)
	const [bannerCropperOpen, setBannerCropperOpen] = useState(false)
	const [selectedBannerSrc, setSelectedBannerSrc] = useState<string | null>(null)

	const debouncedUsername = useDebounce(username, 500)

	// User-specific theme storage key for multi-tenant isolation
	const themeStorageKey = `quickdash-accent-theme-${user.id}`

	// Mount and load saved theme, set defaults
	useEffect(() => {
		setMounted(true)
		const savedAccent = localStorage.getItem(themeStorageKey)
		if (savedAccent) {
			setAccentTheme(savedAccent)
		} else {
			// Set default accent theme to neutral (user-specific)
			localStorage.setItem(themeStorageKey, "neutral")
			window.dispatchEvent(new CustomEvent("accent-theme-change", { detail: "neutral" }))
		}
		// Set default color mode to light
		const savedTheme = localStorage.getItem("theme")
		if (!savedTheme) {
			setTheme("light")
		}
	}, [setTheme, themeStorageKey])

	// Focus inputs when editing
	useEffect(() => {
		if (editingName && nameInputRef.current) {
			nameInputRef.current.focus()
			nameInputRef.current.select()
		}
	}, [editingName])

	useEffect(() => {
		if (editingUsername && usernameInputRef.current) {
			usernameInputRef.current.focus()
		}
	}, [editingUsername])

	useEffect(() => {
		if (editingBio && bioInputRef.current) {
			bioInputRef.current.focus()
		}
	}, [editingBio])

	useEffect(() => {
		if (editingLocation && locationInputRef.current) {
			locationInputRef.current.focus()
		}
	}, [editingLocation])

	useEffect(() => {
		if (editingWebsite && websiteInputRef.current) {
			websiteInputRef.current.focus()
		}
	}, [editingWebsite])

	useEffect(() => {
		if (editingOccupation && occupationInputRef.current) {
			occupationInputRef.current.focus()
		}
	}, [editingOccupation])

	// Check username availability
	useEffect(() => {
		if (debouncedUsername.length < 3) {
			setUsernameStatus("idle")
			return
		}

		// If it's their current username, it's available
		if (user.username && debouncedUsername.toLowerCase() === user.username.toLowerCase()) {
			setUsernameStatus("available")
			return
		}

		setUsernameStatus("checking")
		checkUsername(debouncedUsername).then((result) => {
			setUsernameStatus(result.available ? "available" : "taken")
		})
	}, [debouncedUsername, user.username])

	const initials = displayName
		.split(" ")
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2)

	// Avatar handlers
	function handleAvatarSelect(file: File) {
		if (!file.type.startsWith("image/")) {
			toast.error("Please select an image file")
			return
		}
		const reader = new FileReader()
		reader.onload = () => {
			setSelectedImageSrc(reader.result as string)
			setCropperOpen(true)
		}
		reader.readAsDataURL(file)
	}

	async function handleCroppedAvatar(croppedBlob: Blob) {
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

	// Banner handlers
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

	// Theme handler (uses user-specific storage key)
	function handleAccentSelect(themeId: string) {
		setAccentTheme(themeId)
		localStorage.setItem(themeStorageKey, themeId)
		window.dispatchEvent(new CustomEvent("accent-theme-change", { detail: themeId }))
	}

	const handleSubmit = async () => {
		setError(null)

		if (!displayName.trim()) {
			setError("Please enter a display name")
			return
		}

		if (usernameStatus !== "available") {
			setError("Please choose an available username")
			return
		}

		const formData = new FormData()
		formData.set("displayName", displayName.trim())
		formData.set("username", username)
		formData.set("bio", bio.trim())
		formData.set("location", location.trim())
		formData.set("website", website.trim())
		formData.set("occupation", occupation.trim())
		if (birthdate) formData.set("birthdate", birthdate)
		if (image) formData.set("image", image)
		if (bannerImage) formData.set("bannerImage", bannerImage)

		startTransition(async () => {
			const result = await updateProfile(formData)
			if (result.error) {
				setError(result.error)
			} else {
				router.push("/onboarding/discover")
			}
		})
	}

	const isValid = displayName.trim() && usernameStatus === "available"

	return (
		<div className="min-h-full flex flex-col">
			{/* Mobile Header */}
			<header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b sm:hidden">
				<div className="relative flex items-center justify-between h-14 px-4">
					<Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
						<a href="/login">
							<ArrowLeft className="size-4 mr-2" />
							Back
						</a>
					</Button>
					<h1 className="font-semibold absolute left-1/2 -translate-x-1/2">Set up your profile</h1>
					<Button
						size="sm"
						className="-mr-2"
						onClick={handleSubmit}
						disabled={isPending || !isValid}
					>
						{isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
					</Button>
				</div>
			</header>

			{/* Desktop Fixed Buttons */}
			<div className="hidden sm:block">
				<Button
					variant="ghost"
					size="sm"
					className="fixed top-4 left-4 text-muted-foreground z-20"
					asChild
				>
					<a href="/login">
						<ArrowLeft className="size-4 mr-2" />
						Back
					</a>
				</Button>
				<Button
					size="sm"
					className="fixed top-4 right-4 z-20"
					onClick={handleSubmit}
					disabled={isPending || !isValid}
				>
					{isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
				</Button>
			</div>

			{/* Content */}
			<main className="flex-1 p-4 sm:py-6 sm:px-8 pb-12">
				<div className="w-full max-w-3xl mx-auto space-y-6">
					<h2 className="text-lg font-semibold text-center hidden sm:block">Setup your profile</h2>

			{/* Profile Preview Card */}
			<div className="rounded-xl border bg-card overflow-hidden">
				{/* Banner */}
				<div className="relative group">
					<div
						className="h-32 sm:h-40 bg-muted"
					>
						{bannerImage ? (
							<img src={bannerImage} alt="Banner" className="w-full h-full object-cover" />
						) : (
							<div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
						)}
						<div className="absolute inset-0 bg-black/20 sm:bg-black/0 sm:group-hover:bg-black/40 flex items-center justify-center gap-4 transition-all">
							{uploadingBanner ? (
								<Loader2 className="size-6 text-white animate-spin" />
							) : (
								<>
									<button
										type="button"
										onClick={() => bannerInputRef.current?.click()}
										className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-3 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40"
									>
										<ImagePlus className="size-6 text-white" />
									</button>
									{bannerImage && (
										<button
											type="button"
											onClick={() => setBannerImage("")}
											className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-3 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40"
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

				{/* Profile Info Section */}
				<div className="px-4 pb-6">
					{/* Avatar - overlapping banner */}
					<div className="relative -mt-12 sm:-mt-16 mb-3">
						<div
							className="relative cursor-pointer group w-fit"
							onClick={() => avatarInputRef.current?.click()}
						>
							<Avatar className="size-24 sm:size-32 border-4 border-card">
								{image && <AvatarImage src={image} alt={displayName} />}
								<AvatarFallback className="text-2xl sm:text-3xl bg-muted">
									{initials || "?"}
								</AvatarFallback>
							</Avatar>
							<div className="absolute inset-0 rounded-full bg-black/20 sm:bg-black/0 sm:group-hover:bg-black/40 flex items-center justify-center transition-all">
								<HugeiconsIcon icon={CameraAdd01Icon} className="size-6 text-white sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
							</div>
							{uploading && (
								<div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
									<Loader2 className="size-6 text-white animate-spin" />
								</div>
							)}
						</div>
						<input
							ref={avatarInputRef}
							type="file"
							accept="image/*"
							className="hidden"
							onChange={(e) => {
								const file = e.target.files?.[0]
								if (file) handleAvatarSelect(file)
								e.target.value = ""
							}}
						/>
					</div>

					{/* Name */}
					<div className="mb-1">
						{editingName ? (
							<Input
								ref={nameInputRef}
								value={displayName}
								onChange={(e) => setDisplayName(e.target.value)}
								onBlur={() => setEditingName(false)}
								onKeyDown={(e) => {
									if (e.key === "Enter") setEditingName(false)
									if (e.key === "Escape") {
										setDisplayName(user.name)
										setEditingName(false)
									}
								}}
								className="text-xl font-bold h-auto py-1 px-2 -ml-2 w-auto max-w-full"
								placeholder="Your name"
							/>
						) : (
							<button
								onClick={() => setEditingName(true)}
								className="group flex items-center gap-2 hover:bg-muted rounded px-2 py-1 -ml-2 transition-colors"
							>
								<span className="text-xl font-bold">
									{displayName || "Your name"}
								</span>
								<Pencil className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
							</button>
						)}
					</div>

					{/* Username */}
					<div>
						{editingUsername ? (
							<div className="flex items-center gap-1">
								<span className="text-muted-foreground">@</span>
								<Input
									ref={usernameInputRef}
									value={username}
									onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
									onBlur={() => {
										if (username.length >= 3) setEditingUsername(false)
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" && username.length >= 3) setEditingUsername(false)
										if (e.key === "Escape") setEditingUsername(false)
									}}
									className="h-auto py-0.5 px-1 w-40 text-muted-foreground"
									placeholder="username"
								/>
								<div className="ml-1">
									{usernameStatus === "checking" && (
										<Loader2 className="size-4 animate-spin text-muted-foreground" />
									)}
									{usernameStatus === "available" && (
										<Check className="size-4 text-green-500" />
									)}
									{usernameStatus === "taken" && (
										<X className="size-4 text-red-500" />
									)}
								</div>
							</div>
						) : (
							<button
								onClick={() => setEditingUsername(true)}
								className="group flex items-center gap-2 hover:bg-muted rounded px-2 py-0.5 -ml-2 transition-colors"
							>
								<span className="text-muted-foreground">
									{username ? `@${username}` : "@username"}
								</span>
								<Pencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
							</button>
						)}
						{usernameStatus === "taken" && (
							<p className="text-sm text-red-500 mt-1 ml-2">Username is taken</p>
						)}
						{username.length > 0 && username.length < 3 && (
							<p className="text-sm text-muted-foreground mt-1 ml-2">At least 3 characters</p>
						)}
					</div>

					{/* Bio */}
					<div className="mt-3">
						{editingBio ? (
							<Textarea
								ref={bioInputRef}
								value={bio}
								onChange={(e) => setBio(e.target.value.slice(0, 160))}
								onBlur={() => setEditingBio(false)}
								onKeyDown={(e) => {
									if (e.key === "Escape") setEditingBio(false)
								}}
								placeholder="Write a short bio..."
								className="resize-none text-sm min-h-[60px]"
								rows={2}
							/>
						) : (
							<button
								onClick={() => setEditingBio(true)}
								className="group flex items-start gap-2 hover:bg-muted rounded px-2 py-1 -ml-2 transition-colors w-full text-left"
							>
								<span className={cn("text-sm break-words min-w-0", bio ? "text-foreground" : "text-muted-foreground")}>
									{bio || "Add a bio..."}
								</span>
								<Pencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
							</button>
						)}
						{editingBio && (
							<p className="text-xs text-muted-foreground mt-1 ml-2">{bio.length}/160</p>
						)}
					</div>

					{/* Additional Info Row */}
					<div className="mt-4 pt-4 border-t flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-3 text-sm">
						{/* Location */}
						<div className="relative flex items-center gap-1 min-w-[140px]">
							<MapPin className="size-4 text-muted-foreground shrink-0" />
							{editingLocation ? (
								<Input
									ref={locationInputRef}
									value={location}
									onChange={(e) => setLocation(e.target.value)}
									onBlur={() => setEditingLocation(false)}
									onKeyDown={(e) => {
										if (e.key === "Enter") setEditingLocation(false)
										if (e.key === "Escape") {
											setLocation("")
											setEditingLocation(false)
										}
									}}
									className="h-6 py-0 px-1 flex-1 bg-transparent"
									placeholder="City, Country"
								/>
							) : (
								<button
									onClick={() => setEditingLocation(true)}
									className="group flex items-center gap-1 hover:bg-muted rounded px-1 py-0.5 transition-colors flex-1 text-left"
								>
									<span className={location ? "text-foreground" : "text-muted-foreground"}>
										{location || "Add location"}
									</span>
								</button>
							)}
						</div>

						{/* Website */}
						<div className="relative flex items-center gap-1 min-w-[160px]">
							<Link2 className="size-4 text-muted-foreground shrink-0" />
							{editingWebsite ? (
								<Input
									ref={websiteInputRef}
									value={website}
									onChange={(e) => setWebsite(e.target.value)}
									onBlur={() => setEditingWebsite(false)}
									onKeyDown={(e) => {
										if (e.key === "Enter") setEditingWebsite(false)
										if (e.key === "Escape") {
											setWebsite("")
											setEditingWebsite(false)
										}
									}}
									className="h-6 py-0 px-1 flex-1 bg-transparent"
									placeholder="yoursite.com"
								/>
							) : (
								<button
									onClick={() => setEditingWebsite(true)}
									className="group flex items-center gap-1 hover:bg-muted rounded px-1 py-0.5 transition-colors flex-1 text-left"
								>
									<span className={website ? "text-primary hover:underline" : "text-muted-foreground"}>
										{website || "Add website"}
									</span>
								</button>
							)}
						</div>

						{/* Occupation */}
						<div className="relative flex items-center gap-1 min-w-[150px]">
							<Briefcase className="size-4 text-muted-foreground shrink-0" />
							{editingOccupation ? (
								<Input
									ref={occupationInputRef}
									value={occupation}
									onChange={(e) => setOccupation(e.target.value)}
									onBlur={() => setEditingOccupation(false)}
									onKeyDown={(e) => {
										if (e.key === "Enter") setEditingOccupation(false)
										if (e.key === "Escape") {
											setOccupation("")
											setEditingOccupation(false)
										}
									}}
									className="h-6 py-0 px-1 flex-1 bg-transparent"
									placeholder="Your role"
								/>
							) : (
								<button
									onClick={() => setEditingOccupation(true)}
									className="group flex items-center gap-1 hover:bg-muted rounded px-1 py-0.5 transition-colors flex-1 text-left"
								>
									<span className={occupation ? "text-foreground" : "text-muted-foreground"}>
										{occupation || "Add occupation"}
									</span>
								</button>
							)}
						</div>

						{/* Birthdate */}
						<div className="flex items-center gap-1">
							<Calendar className="size-4 text-muted-foreground shrink-0" />
							<Input
								type="date"
								value={birthdate}
								onChange={(e) => setBirthdate(e.target.value)}
								className="h-7 py-0 px-1 w-36 text-sm"
								max={new Date().toISOString().split("T")[0]}
							/>
						</div>

						{/* Joined Date - Display only */}
						<div className="flex items-center gap-1 text-muted-foreground px-1 py-0.5">
							<Calendar className="size-4 shrink-0" />
							<span>Joined {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
						</div>
					</div>
				</div>
			</div>

			{/* Theme Switcher */}
			<div className="rounded-xl border bg-card p-4 space-y-4">
				<div>
					<h3 className="font-medium mb-1">Appearance</h3>
					<p className="text-sm text-muted-foreground">Choose your color mode and theme</p>
				</div>

				{/* Color Mode */}
				<div className="flex gap-2">
					<Button
						type="button"
						variant={mounted && theme === "light" ? "default" : "outline"}
						size="sm"
						className="flex-1 px-2 sm:px-3"
						onClick={() => setTheme("light")}
						disabled={!mounted}
					>
						<Sun className="size-4 sm:mr-2" />
						<span className="hidden sm:inline">Light</span>
					</Button>
					<Button
						type="button"
						variant={mounted && theme === "dark" ? "default" : "outline"}
						size="sm"
						className="flex-1 px-2 sm:px-3"
						onClick={() => setTheme("dark")}
						disabled={!mounted}
					>
						<Moon className="size-4 sm:mr-2" />
						<span className="hidden sm:inline">Dark</span>
					</Button>
					<Button
						type="button"
						variant={mounted && theme === "system" ? "default" : "outline"}
						size="sm"
						className="flex-1 px-2 sm:px-3"
						onClick={() => setTheme("system")}
						disabled={!mounted}
					>
						<Monitor className="size-4 sm:mr-2" />
						<span className="hidden sm:inline">System</span>
					</Button>
				</div>

				{/* Accent Theme */}
				<div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-1.5">
					{themeOptions.map((option) => (
						<button
							key={option.id}
							type="button"
							onClick={() => handleAccentSelect(option.id)}
							className={cn(
								"aspect-square rounded-full border-2 transition-all hover:scale-110",
								accentTheme === option.id
									? "border-foreground scale-110"
									: "border-transparent"
							)}
							style={{ backgroundColor: themePresets[option.id]?.light.primary }}
							title={option.name}
						/>
					))}
				</div>
			</div>

			{error && (
				<p className="text-sm text-red-500 text-center">{error}</p>
			)}

			{/* Bottom Navigation */}
			<div className="flex flex-col items-center gap-4 pt-6">
				<Button
					variant="ghost"
					size="sm"
					className="text-muted-foreground"
					onClick={() => router.push("/onboarding/discover")}
					disabled={isPending}
				>
					Skip for now
				</Button>

				{/* Pagination Dots */}
				<div className="flex items-center gap-2">
					<div className="size-2 rounded-full bg-primary" />
					<div className="size-2 rounded-full bg-muted" />
					<div className="size-2 rounded-full bg-muted" />
				</div>
			</div>
				</div>
			</main>

			{/* Avatar Image Cropper */}
			{selectedImageSrc && (
				<ImageCropper
					open={cropperOpen}
					onOpenChange={(open) => {
						setCropperOpen(open)
						if (!open) setSelectedImageSrc(null)
					}}
					imageSrc={selectedImageSrc}
					onCropComplete={handleCroppedAvatar}
					cropShape="round"
					aspectRatio={1}
					title="Crop Profile Photo"
					description="Drag to reposition and use the slider to zoom."
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
