"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
	PinIcon,
	Cancel01Icon,
	Calendar03Icon,
	Mail01Icon,
	UserAdd01Icon,
	Tick01Icon,
	Clock01Icon,
	LinkSquare01Icon,
} from "@hugeicons/core-free-icons"
import { Loader2 } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
import {
	sendFriendRequest,
	acceptFriendRequest,
	declineFriendRequest,
	removeFriend,
	getOrCreateConversation,
} from "@/app/(dashboard)/discover/actions"
import { useTeamPresence } from "@/hooks/use-team-presence"
import { StatusDot } from "@/components/presence/status-indicator"
import type { UserSocials } from "@quickdash/db/schema"

type Profile = {
	id: string
	name: string
	username: string | null
	image: string | null
	bannerImage: string | null
	bannerGradient: string | null
	bio: string | null
	location: string | null
	website: string | null
	occupation: string | null
	socials: UserSocials | null
	createdAt: Date
}

type FriendshipStatus = {
	status: string
	isRequester?: boolean
}

type MutualFriend = {
	id: string
	name: string
	image: string | null
}

interface ProfileClientProps {
	profile: Profile
	currentUserId: string
	friendshipStatus: FriendshipStatus
	mutualFriends: MutualFriend[]
	isOwnProfile: boolean
}

function getInitials(name: string) {
	return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

const SOCIAL_LINKS: { key: keyof UserSocials; label: string; urlPrefix: string }[] = [
	{ key: "twitter", label: "Twitter", urlPrefix: "https://twitter.com/" },
	{ key: "instagram", label: "Instagram", urlPrefix: "https://instagram.com/" },
	{ key: "linkedin", label: "LinkedIn", urlPrefix: "https://linkedin.com/in/" },
	{ key: "github", label: "GitHub", urlPrefix: "https://github.com/" },
	{ key: "youtube", label: "YouTube", urlPrefix: "https://youtube.com/@" },
	{ key: "tiktok", label: "TikTok", urlPrefix: "https://tiktok.com/@" },
]

export function ProfileClient({
	profile,
	currentUserId,
	friendshipStatus: initialStatus,
	mutualFriends,
	isOwnProfile,
}: ProfileClientProps) {
	const router = useRouter()
	const { getStatus } = useTeamPresence()
	const [status, setStatus] = useState(initialStatus)
	const [loading, setLoading] = useState(false)
	const [removeDialogOpen, setRemoveDialogOpen] = useState(false)

	const handleAddFriend = async () => {
		setLoading(true)
		try {
			await sendFriendRequest(profile.id)
			setStatus({ status: "pending", isRequester: true })
		} catch (err: any) {
			console.error(err.message)
		} finally {
			setLoading(false)
		}
	}

	const handleAccept = async () => {
		setLoading(true)
		try {
			await acceptFriendRequest(profile.id)
			setStatus({ status: "accepted" })
		} finally {
			setLoading(false)
		}
	}

	const handleDecline = async () => {
		setLoading(true)
		try {
			await declineFriendRequest(profile.id)
			setStatus({ status: "none" })
		} finally {
			setLoading(false)
		}
	}

	const handleRemove = async () => {
		setLoading(true)
		try {
			await removeFriend(profile.id)
			setStatus({ status: "none" })
			setRemoveDialogOpen(false)
		} finally {
			setLoading(false)
		}
	}

	const handleMessage = async () => {
		setLoading(true)
		try {
			const conversation = await getOrCreateConversation(profile.id)
			router.push(`/messages?dm=${conversation.id}`)
		} finally {
			setLoading(false)
		}
	}

	const joinedDate = new Date(profile.createdAt).toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	})

	const socials = profile.socials || {}
	const hasSocials = SOCIAL_LINKS.some(s => socials[s.key])

	return (
		<div className="flex-1 max-w-3xl mx-auto w-full">
			{/* Banner */}
			<div className="relative rounded-t-xl overflow-hidden">
				<div className="h-36 sm:h-52 bg-muted">
					{profile.bannerImage ? (
						<img
							src={profile.bannerImage}
							alt=""
							className="w-full h-full object-cover"
						/>
					) : (
						<div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
					)}
				</div>
			</div>

			{/* Profile Info */}
			<div className="px-6 pb-6">
				{/* Avatar + Actions Row */}
				<div className="flex items-end justify-between -mt-12 sm:-mt-16 mb-4">
					<div className="relative">
						<Avatar className="size-24 sm:size-32 border-4 border-background">
							{profile.image && <AvatarImage src={profile.image} alt={profile.name} />}
							<AvatarFallback className="text-2xl sm:text-3xl bg-muted">
								{getInitials(profile.name)}
							</AvatarFallback>
						</Avatar>
						{!isOwnProfile && (
							<StatusDot status={getStatus(profile.id)} size="md" />
						)}
					</div>

					{/* Action buttons */}
					<div className="flex items-center gap-2 pt-14 sm:pt-18">
						{isOwnProfile ? (
							<Button variant="outline" size="sm" asChild>
								<Link href="/settings/account">Edit Profile</Link>
							</Button>
						) : status.status === "none" ? (
							<Button size="sm" onClick={handleAddFriend} disabled={loading}>
								{loading ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<>
										<HugeiconsIcon icon={UserAdd01Icon} size={16} className="mr-1.5" />
										Add Friend
									</>
								)}
							</Button>
						) : status.status === "pending" && status.isRequester ? (
							<Button variant="outline" size="sm" disabled>
								<HugeiconsIcon icon={Clock01Icon} size={16} className="mr-1.5" />
								Request Sent
							</Button>
						) : status.status === "pending" && !status.isRequester ? (
							<div className="flex gap-1.5">
								<Button size="sm" onClick={handleAccept} disabled={loading}>
									{loading ? <Loader2 className="size-4 animate-spin" /> : (
										<>
											<HugeiconsIcon icon={Tick01Icon} size={16} className="mr-1.5" />
											Accept
										</>
									)}
								</Button>
								<Button variant="outline" size="sm" onClick={handleDecline} disabled={loading}>
									<HugeiconsIcon icon={Cancel01Icon} size={16} />
								</Button>
							</div>
						) : status.status === "accepted" ? (
							<div className="flex gap-1.5">
								<Button variant="outline" size="sm" onClick={handleMessage} disabled={loading}>
									<HugeiconsIcon icon={Mail01Icon} size={16} className="mr-1.5" />
									Message
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="text-destructive hover:text-destructive"
									onClick={() => setRemoveDialogOpen(true)}
								>
									Unfriend
								</Button>
							</div>
						) : null}
					</div>
				</div>

				{/* Name + Username */}
				<div className="mb-3">
					<h1 className="text-2xl font-bold">{profile.name}</h1>
					{profile.username && (
						<p className="text-muted-foreground">@{profile.username}</p>
					)}
				</div>

				{/* Bio */}
				{profile.bio && (
					<p className="text-sm mb-3">{profile.bio}</p>
				)}

				{/* Meta info */}
				<div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-4">
					{profile.occupation && (
						<span>{profile.occupation}</span>
					)}
					{profile.location && (
						<span className="flex items-center gap-1">
							<HugeiconsIcon icon={PinIcon} size={14} />
							{profile.location}
						</span>
					)}
					{profile.website && (
						<a
							href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1 text-primary hover:underline"
						>
							<HugeiconsIcon icon={LinkSquare01Icon} size={14} />
							{profile.website.replace(/^https?:\/\//, "")}
						</a>
					)}
					<span className="flex items-center gap-1">
						<HugeiconsIcon icon={Calendar03Icon} size={14} />
						Joined {joinedDate}
					</span>
				</div>

				{/* Socials */}
				{hasSocials && (
					<div className="flex flex-wrap gap-2 mb-4">
						{SOCIAL_LINKS.map(({ key, label, urlPrefix }) => {
							const value = socials[key]
							if (!value) return null
							const url = value.startsWith("http") ? value : `${urlPrefix}${value}`
							return (
								<a
									key={key}
									href={url}
									target="_blank"
									rel="noopener noreferrer"
								>
									<Badge variant="secondary" className="text-xs hover:bg-muted">
										{label}
									</Badge>
								</a>
							)
						})}
					</div>
				)}

				{/* Mutual Friends */}
				{!isOwnProfile && mutualFriends.length > 0 && (
					<>
						<Separator className="my-4" />
						<div>
							<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
								Mutual Friends ({mutualFriends.length})
							</h3>
							<div className="flex flex-wrap gap-2">
								{mutualFriends.map((friend) => (
									<Link
										key={friend.id}
										href={`/profile/${friend.id}`}
										className="flex items-center gap-2 px-2 py-1.5 rounded-lg border hover:bg-muted/50 transition-colors"
									>
										<Avatar className="size-6">
											{friend.image && <AvatarImage src={friend.image} alt={friend.name} />}
											<AvatarFallback className="text-[10px]">
												{getInitials(friend.name)}
											</AvatarFallback>
										</Avatar>
										<span className="text-sm">{friend.name}</span>
									</Link>
								))}
							</div>
						</div>
					</>
				)}
			</div>

			{/* Remove friend dialog */}
			<AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove {profile.name} as a friend?</AlertDialogTitle>
						<AlertDialogDescription>
							You can always send them a new friend request later.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={handleRemove}
							disabled={loading}
						>
							{loading ? "Removing..." : "Remove Friend"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
