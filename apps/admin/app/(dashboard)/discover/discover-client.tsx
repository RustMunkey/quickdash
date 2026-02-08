"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon, Cancel01Icon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useDebounce } from "@/hooks/use-debounce"
import {
	searchAllUsers,
	sendFriendRequest,
	acceptFriendRequest,
	declineFriendRequest,
	removeFriend,
} from "./actions"
import { usePusher } from "@/components/pusher-provider"
import { useTeamPresence } from "@/hooks/use-team-presence"
import { StatusDot } from "@/components/presence/status-indicator"

interface User {
	id: string
	name: string
	username: string | null
	image: string | null
	bio?: string | null
	location?: string | null
}

interface DiscoverClientProps {
	currentUser: { id: string; name: string; image: string | null }
	initialUsers: User[]
	initialFriends: User[]
	initialPendingRequests: {
		incoming: any[]
		outgoing: any[]
	}
}

function getInitials(name: string) {
	return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

export function DiscoverClient({
	currentUser,
	initialUsers,
	initialFriends,
	initialPendingRequests,
}: DiscoverClientProps) {
	const router = useRouter()
	const { pusher } = usePusher()
	const { getStatus } = useTeamPresence()

	// State
	const [tab, setTab] = useState<"users" | "friends">("users")
	const [searchQuery, setSearchQuery] = useState("")
	const [searchResults, setSearchResults] = useState<User[]>([])
	const [isSearching, setIsSearching] = useState(false)
	const [friends, setFriends] = useState(initialFriends)
	const [pendingRequests, setPendingRequests] = useState(initialPendingRequests)
	const [loadingAction, setLoadingAction] = useState<string | null>(null)

	const debouncedSearch = useDebounce(searchQuery, 300)

	// Search users
	useEffect(() => {
		if (debouncedSearch.length < 2) {
			setSearchResults([])
			return
		}

		setIsSearching(true)
		searchAllUsers(debouncedSearch).then((results) => {
			setSearchResults(results.filter(u => u.id !== currentUser.id))
			setIsSearching(false)
		})
	}, [debouncedSearch, currentUser.id])

	// Pusher subscriptions
	useEffect(() => {
		if (!pusher) return

		const userChannel = pusher.subscribe(`private-user-${currentUser.id}`)

		userChannel.bind("friend-request", (data: any) => {
			setPendingRequests(prev => ({
				...prev,
				incoming: [{ ...data.from, createdAt: new Date() }, ...prev.incoming],
			}))
		})

		userChannel.bind("friend-accepted", () => {
			router.refresh()
		})

		return () => {
			userChannel.unbind("friend-request")
			userChannel.unbind("friend-accepted")
		}
	}, [pusher, currentUser.id, router])

	// Actions
	const handleSendFriendRequest = async (userId: string) => {
		setLoadingAction(userId)
		try {
			await sendFriendRequest(userId)
			setPendingRequests(prev => ({
				...prev,
				outgoing: [...prev.outgoing, { addresseeId: userId }],
			}))
		} catch (err: any) {
			console.error(err.message)
		} finally {
			setLoadingAction(null)
		}
	}

	const handleAcceptRequest = async (requesterId: string) => {
		setLoadingAction(requesterId)
		try {
			await acceptFriendRequest(requesterId)
			const accepted = pendingRequests.incoming.find(r => r.requesterId === requesterId)
			if (accepted) {
				setFriends(prev => [...prev, {
					id: requesterId,
					name: accepted.requesterName,
					username: accepted.requesterUsername,
					image: accepted.requesterImage,
				}])
			}
			setPendingRequests(prev => ({
				...prev,
				incoming: prev.incoming.filter(r => r.requesterId !== requesterId),
			}))
		} finally {
			setLoadingAction(null)
		}
	}

	const handleDeclineRequest = async (requesterId: string) => {
		setLoadingAction(requesterId)
		try {
			await declineFriendRequest(requesterId)
			setPendingRequests(prev => ({
				...prev,
				incoming: prev.incoming.filter(r => r.requesterId !== requesterId),
			}))
		} finally {
			setLoadingAction(null)
		}
	}

	const handleRemoveFriend = async (friendId: string) => {
		setLoadingAction(friendId)
		try {
			await removeFriend(friendId)
			setFriends(prev => prev.filter(f => f.id !== friendId))
			// Also clear from outgoing in case of stale state
			setPendingRequests(prev => ({
				...prev,
				outgoing: prev.outgoing.filter(r => r.addresseeId !== friendId),
			}))
		} finally {
			setLoadingAction(null)
		}
	}

	const displayUsers = searchQuery.length >= 2 ? searchResults : initialUsers

	const isFriend = (userId: string) => friends.some(f => f.id === userId)
	const isPendingOutgoing = (userId: string) => pendingRequests.outgoing.some(r => r.addresseeId === userId)
	const isPendingIncoming = (userId: string) => pendingRequests.incoming.some(r => r.requesterId === userId)

	return (
		<div className="flex-1 p-6">
			<p className="text-sm text-muted-foreground mb-4">Find and connect with other users.</p>

			<div className="flex items-center gap-2 mb-4">
				<Button
					size="sm"
					variant={tab === "users" ? "default" : "outline"}
					className="h-8 text-xs"
					onClick={() => setTab("users")}
				>
					Discover
				</Button>
				<Button
					size="sm"
					variant={tab === "friends" ? "default" : "outline"}
					className="h-8 text-xs"
					onClick={() => setTab("friends")}
				>
					Friends
					{pendingRequests.incoming.length > 0 && (
						<Badge variant="destructive" className="ml-1.5 size-4 p-0 justify-center text-[10px]">
							{pendingRequests.incoming.length}
						</Badge>
					)}
				</Button>
			</div>

			{tab === "users" && (
				<div className="space-y-4">
					<div className="relative">
						<HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
						<Input
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search by name or username..."
							className="pl-10"
						/>
						{isSearching && (
							<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
						)}
					</div>

					<div className="space-y-2">
						{displayUsers.length === 0 ? (
							<div className="text-center py-12 text-muted-foreground">
								{searchQuery.length >= 2 ? "No users found" : "No users yet"}
							</div>
						) : (
							displayUsers.map((user) => (
								<div
									key={user.id}
									className="flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
								>
									<Link href={`/profile/${user.id}`} className="relative overflow-visible shrink-0">
										<Avatar className="size-8">
											{user.image && <AvatarImage src={user.image} alt={user.name} />}
											<AvatarFallback>{getInitials(user.name)}</AvatarFallback>
										</Avatar>
										<StatusDot status={getStatus(user.id)} size="sm" />
									</Link>
									<Link href={`/profile/${user.id}`} className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<span className="text-sm font-medium hover:underline">{user.name}</span>
											{user.username && (
												<span className="text-xs text-muted-foreground">@{user.username}</span>
											)}
										</div>
										{user.bio && (
											<p className="text-xs text-muted-foreground truncate">{user.bio}</p>
										)}
									</Link>
									{isFriend(user.id) ? (
										<Badge variant="outline" className="text-[10px]">Friends</Badge>
									) : isPendingOutgoing(user.id) ? (
										<Badge variant="outline" className="text-[10px]">Pending</Badge>
									) : isPendingIncoming(user.id) ? (
										<div className="flex gap-1">
											<Button
												size="sm"
												className="h-7 text-xs"
												onClick={() => handleAcceptRequest(user.id)}
												disabled={loadingAction === user.id}
											>
												Accept
											</Button>
											<Button
												size="sm"
												variant="outline"
												className="h-7 text-xs"
												onClick={() => handleDeclineRequest(user.id)}
												disabled={loadingAction === user.id}
											>
												<HugeiconsIcon icon={Cancel01Icon} className="size-3" />
											</Button>
										</div>
									) : (
										<Button
											size="sm"
											className="h-7 text-xs"
											onClick={() => handleSendFriendRequest(user.id)}
											disabled={loadingAction === user.id}
										>
											{loadingAction === user.id ? (
												<Loader2 className="size-3 animate-spin" />
											) : (
												"Add"
											)}
										</Button>
									)}
								</div>
							))
							)}
					</div>
				</div>
			)}

			{tab === "friends" && (
				<div className="space-y-4">
					{/* Pending Requests */}
					{pendingRequests.incoming.length > 0 && (
						<div className="space-y-2">
							<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
								Friend Requests ({pendingRequests.incoming.length})
							</h3>
							{pendingRequests.incoming.map((req) => (
								<div
									key={req.requesterId}
									className="flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-card"
								>
									<Link href={`/profile/${req.requesterId}`} className="relative overflow-visible shrink-0">
										<Avatar className="size-8">
											{req.requesterImage && <AvatarImage src={req.requesterImage} alt={req.requesterName} />}
											<AvatarFallback>{getInitials(req.requesterName)}</AvatarFallback>
										</Avatar>
										<StatusDot status={getStatus(req.requesterId)} size="sm" />
									</Link>
									<Link href={`/profile/${req.requesterId}`} className="flex-1 min-w-0">
										<p className="text-sm font-medium hover:underline">{req.requesterName}</p>
										{req.requesterUsername && (
											<p className="text-xs text-muted-foreground">@{req.requesterUsername}</p>
										)}
									</Link>
									<div className="flex gap-1">
										<Button
											size="sm"
											className="h-7 text-xs"
											onClick={() => handleAcceptRequest(req.requesterId)}
											disabled={loadingAction === req.requesterId}
										>
											{loadingAction === req.requesterId ? (
												<Loader2 className="size-3 animate-spin" />
											) : (
												"Accept"
											)}
										</Button>
										<Button
											size="sm"
											variant="outline"
											className="h-7 text-xs"
											onClick={() => handleDeclineRequest(req.requesterId)}
											disabled={loadingAction === req.requesterId}
										>
											<HugeiconsIcon icon={Cancel01Icon} className="size-3" />
										</Button>
									</div>
								</div>
							))}
						</div>
					)}

					{/* Friends List */}
					<div className="space-y-2">
						{friends.length === 0 ? (
							<div className="text-center py-12">
								<div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
									<HugeiconsIcon icon={UserGroupIcon} className="size-6 text-muted-foreground" />
								</div>
								<h3 className="font-medium mb-1">No friends yet</h3>
								<p className="text-sm text-muted-foreground">
									Search for users and send friend requests!
								</p>
							</div>
						) : (
							friends.map((friend) => (
								<div
									key={friend.id}
									className="flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
								>
									<Link href={`/profile/${friend.id}`} className="relative overflow-visible shrink-0">
										<Avatar className="size-8">
											{friend.image && <AvatarImage src={friend.image} alt={friend.name} />}
											<AvatarFallback>{getInitials(friend.name)}</AvatarFallback>
										</Avatar>
										<StatusDot status={getStatus(friend.id)} size="sm" />
									</Link>
									<Link href={`/profile/${friend.id}`} className="flex-1 min-w-0">
										<p className="text-sm font-medium hover:underline">{friend.name}</p>
										{friend.username && (
											<p className="text-xs text-muted-foreground">@{friend.username}</p>
										)}
									</Link>
									<Button
										size="sm"
										variant="ghost"
										className="h-7 text-xs text-destructive hover:text-destructive"
										onClick={() => handleRemoveFriend(friend.id)}
										disabled={loadingAction === friend.id}
									>
										{loadingAction === friend.id ? (
											<Loader2 className="size-3 animate-spin" />
										) : (
											"Remove"
										)}
									</Button>
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	)
}
