"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Search, Loader2, UserPlus, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { followUser, unfollowUser, searchUsers } from "./actions"
import { useDebounce } from "@/hooks/use-debounce"
import { useEffect } from "react"

interface SuggestedUser {
	id: string
	name: string
	username: string | null
	image: string | null
	bio: string | null
}

interface DiscoverStepProps {
	currentUserId: string
	suggestedUsers: SuggestedUser[]
}

export function DiscoverStep({ currentUserId, suggestedUsers }: DiscoverStepProps) {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const [searchQuery, setSearchQuery] = useState("")
	const [searchResults, setSearchResults] = useState<SuggestedUser[]>([])
	const [isSearching, setIsSearching] = useState(false)
	const [following, setFollowing] = useState<Set<string>>(new Set())
	const [loadingFollow, setLoadingFollow] = useState<string | null>(null)

	const debouncedSearch = useDebounce(searchQuery, 300)

	// Search users when query changes
	useEffect(() => {
		if (debouncedSearch.length < 2) {
			setSearchResults([])
			return
		}

		setIsSearching(true)
		searchUsers(debouncedSearch).then((results) => {
			setSearchResults(results.filter(u => u.id !== currentUserId))
			setIsSearching(false)
		})
	}, [debouncedSearch, currentUserId])

	const handleFollow = async (userId: string) => {
		setLoadingFollow(userId)
		try {
			if (following.has(userId)) {
				await unfollowUser(userId)
				setFollowing(prev => {
					const next = new Set(prev)
					next.delete(userId)
					return next
				})
			} else {
				await followUser(userId)
				setFollowing(prev => new Set(prev).add(userId))
			}
		} finally {
			setLoadingFollow(null)
		}
	}

	const handleContinue = () => {
		startTransition(() => {
			router.push("/onboarding/workspace")
		})
	}

	const displayUsers = searchQuery.length >= 2 ? searchResults : suggestedUsers

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n.charAt(0))
			.join("")
			.toUpperCase()
			.slice(0, 2)
	}

	return (
		<div className="min-h-full flex flex-col">
			{/* Header */}
			<header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
				<div className="relative flex items-center justify-between h-14 px-4 max-w-2xl mx-auto">
					<Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
						<Link href="/onboarding">
							<ArrowLeft className="size-4 mr-2" />
							<span className="hidden sm:inline">Back</span>
						</Link>
					</Button>
					<h1 className="font-semibold absolute left-1/2 -translate-x-1/2">Find people</h1>
					<Button
						size="sm"
						variant="outline"
						className="-mr-2"
						onClick={handleContinue}
						disabled={isPending}
					>
						{isPending ? <Loader2 className="size-4 animate-spin" /> : "Skip"}
					</Button>
				</div>
			</header>

			{/* Content */}
			<main className="flex-1 p-4 sm:p-6 pb-12">
				<div className="w-full max-w-2xl mx-auto space-y-6">
					<p className="text-muted-foreground text-sm text-center">
						Follow people to see their updates in your feed
					</p>

					{/* Search */}
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
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

					{/* User List */}
					<div className="space-y-2">
						{displayUsers.length === 0 ? (
							<div className="text-center py-12 text-muted-foreground">
								{searchQuery.length >= 2
									? "No users found"
									: "No suggestions available yet"}
							</div>
						) : (
							displayUsers.map((user) => (
								<div
									key={user.id}
									className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
								>
									<Avatar className="size-12">
										{user.image && <AvatarImage src={user.image} alt={user.name} />}
										<AvatarFallback className="bg-muted">
											{getInitials(user.name)}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<p className="font-medium truncate">{user.name}</p>
										{user.username && (
											<p className="text-sm text-muted-foreground truncate">
												@{user.username}
											</p>
										)}
										{user.bio && (
											<p className="text-sm text-muted-foreground truncate mt-0.5">
												{user.bio}
											</p>
										)}
									</div>
									<Button
										size="sm"
										variant={following.has(user.id) ? "outline" : "default"}
										onClick={() => handleFollow(user.id)}
										disabled={loadingFollow === user.id}
										className="shrink-0"
									>
										{loadingFollow === user.id ? (
											<Loader2 className="size-4 animate-spin" />
										) : following.has(user.id) ? (
											<>
												<Check className="size-4 mr-1" />
												Following
											</>
										) : (
											<>
												<UserPlus className="size-4 mr-1" />
												Follow
											</>
										)}
									</Button>
								</div>
							))
						)}
					</div>

					{/* Bottom Navigation */}
					<div className="flex flex-col items-center gap-4 pt-6">
						<Button
							variant="ghost"
							size="sm"
							className="text-muted-foreground"
							onClick={handleContinue}
							disabled={isPending}
						>
							Skip for now
						</Button>

						{/* Pagination Dots */}
						<div className="flex items-center gap-2">
							<div className="size-2 rounded-full bg-muted" />
							<div className="size-2 rounded-full bg-primary" />
							<div className="size-2 rounded-full bg-muted" />
						</div>
					</div>
				</div>
			</main>
		</div>
	)
}
