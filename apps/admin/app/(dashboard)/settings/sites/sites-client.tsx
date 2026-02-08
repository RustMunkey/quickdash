"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
	Github,
	Plus,
	Loader2,
	ExternalLink,
	Copy,
	Check,
	MoreHorizontal,
	Globe,
	GitBranch,
	Trash2,
	RefreshCw,
	Eye,
	EyeOff,
	AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SitesClientProps {
	workspaceId: string
	hasGitHubConnected: boolean
	githubAccount: { login: string; avatar: string | null } | null
}

interface Site {
	id: string
	name: string
	repo: {
		fullName: string
		url: string
		branch: string
		connectedBy: string
	}
	framework: string
	frameworkVersion: string | null
	productionUrl: string | null
	status: string
	createdAt: string
	storefront: {
		id: string
		name: string
		apiKey: string
		isActive: boolean
	} | null
}

interface Repo {
	id: number
	name: string
	fullName: string
	url: string
	description: string | null
	private: boolean
	defaultBranch: string
	language: string | null
	owner: { login: string }
}

export function SitesClient({
	workspaceId,
	hasGitHubConnected: initialHasGitHub,
	githubAccount: initialGithubAccount,
}: SitesClientProps) {
	const router = useRouter()
	const searchParams = useSearchParams()

	// State
	const [hasGitHubConnected, setHasGitHubConnected] = useState(initialHasGitHub)
	const [githubAccount, setGithubAccount] = useState(initialGithubAccount)
	const [sites, setSites] = useState<Site[]>([])
	const [loadingSites, setLoadingSites] = useState(true)
	const [repos, setRepos] = useState<Repo[]>([])
	const [loadingRepos, setLoadingRepos] = useState(false)
	const [connectDialogOpen, setConnectDialogOpen] = useState(false)
	const [connecting, setConnecting] = useState(false)
	const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null)
	const [copiedKey, setCopiedKey] = useState<string | null>(null)
	const [showApiKey, setShowApiKey] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	// Check if we just connected GitHub
	useEffect(() => {
		if (searchParams.get("github") === "connected") {
			setHasGitHubConnected(true)
			router.replace("/settings/sites")
		}
		if (searchParams.get("error")) {
			setError(getErrorMessage(searchParams.get("error")!))
			router.replace("/settings/sites")
		}
	}, [searchParams, router])

	// Fetch sites on mount
	useEffect(() => {
		fetchSites()
	}, [workspaceId])

	const fetchSites = async () => {
		setLoadingSites(true)
		try {
			const response = await fetch(`/api/sites?workspaceId=${workspaceId}`)
			const data = await response.json()
			if (response.ok) {
				setSites(data.sites)
			}
		} catch (err) {
			console.error("Failed to fetch sites:", err)
		} finally {
			setLoadingSites(false)
		}
	}

	const fetchRepos = async () => {
		setLoadingRepos(true)
		setError(null)
		try {
			const response = await fetch("/api/github/repos")
			const data = await response.json()

			if (!response.ok) {
				if (data.code === "GITHUB_NOT_CONNECTED" || data.code === "GITHUB_TOKEN_EXPIRED") {
					setHasGitHubConnected(false)
					return
				}
				throw new Error(data.error)
			}

			setRepos(data.repos)
			if (data.githubAccount) {
				setGithubAccount(data.githubAccount)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch repos")
		} finally {
			setLoadingRepos(false)
		}
	}

	const connectRepo = async (repo: Repo) => {
		setConnecting(true)
		setSelectedRepo(repo)
		setError(null)

		try {
			const response = await fetch("/api/sites/connect", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					workspaceId,
					repo: {
						id: repo.id,
						name: repo.name,
						fullName: repo.fullName,
						url: repo.url,
						defaultBranch: repo.defaultBranch,
						owner: repo.owner,
					},
				}),
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.error)
			}

			// Refresh sites list
			await fetchSites()
			setConnectDialogOpen(false)
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to connect")
		} finally {
			setConnecting(false)
			setSelectedRepo(null)
		}
	}

	const disconnectSite = async (siteId: string) => {
		if (!confirm("Are you sure you want to disconnect this site? The API key will be deactivated.")) {
			return
		}

		try {
			const response = await fetch(`/api/sites?siteId=${siteId}`, {
				method: "DELETE",
			})

			if (!response.ok) {
				const data = await response.json()
				throw new Error(data.error)
			}

			// Refresh sites list
			await fetchSites()
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to disconnect")
		}
	}

	const copyApiKey = async (apiKey: string) => {
		await navigator.clipboard.writeText(apiKey)
		setCopiedKey(apiKey)
		setTimeout(() => setCopiedKey(null), 2000)
	}

	const openConnectDialog = () => {
		if (!hasGitHubConnected) {
			window.location.href = `/api/github/auth?workspaceId=${workspaceId}&returnUrl=/settings/sites`
			return
		}
		fetchRepos()
		setConnectDialogOpen(true)
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Connected Sites</h1>
					<p className="text-muted-foreground text-sm mt-1">
						Connect your websites to this workspace via GitHub
					</p>
				</div>
				<Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
					<DialogTrigger asChild>
						<Button onClick={openConnectDialog}>
							<Plus className="size-4 mr-2" />
							Connect Site
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-lg">
						<DialogHeader>
							<DialogTitle>Connect a Repository</DialogTitle>
							<DialogDescription>
								Select a GitHub repository to connect to your workspace.
							</DialogDescription>
						</DialogHeader>

						{error && (
							<div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-lg">
								<AlertCircle className="size-4" />
								{error}
							</div>
						)}

						{/* GitHub account */}
						{githubAccount && (
							<div className="flex items-center justify-between p-3 bg-muted rounded-lg">
								<div className="flex items-center gap-3">
									<Github className="size-5" />
									<span className="text-sm">@{githubAccount.login}</span>
								</div>
								<Button variant="ghost" size="sm" asChild>
									<a href={`/api/github/auth?workspaceId=${workspaceId}&returnUrl=/settings/sites`}>
										Switch
									</a>
								</Button>
							</div>
						)}

						{/* Loading */}
						{loadingRepos && (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="size-6 animate-spin text-muted-foreground" />
							</div>
						)}

						{/* Repos */}
						{!loadingRepos && repos.length > 0 && (
							<div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
								{repos.map((repo) => {
									const isConnected = sites.some(
										(s) => s.repo.fullName === repo.fullName
									)
									return (
										<button
											key={repo.id}
											onClick={() => !isConnected && connectRepo(repo)}
											disabled={connecting || isConnected}
											className={cn(
												"w-full flex items-center gap-3 p-3 text-left transition-colors",
												isConnected
													? "opacity-50 cursor-not-allowed"
													: "hover:bg-muted/50",
												selectedRepo?.id === repo.id && connecting && "bg-muted"
											)}
										>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<span className="font-medium truncate">{repo.name}</span>
													{repo.private && (
														<span className="text-xs bg-muted px-1.5 py-0.5 rounded">
															Private
														</span>
													)}
													{isConnected && (
														<span className="text-xs bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded">
															Connected
														</span>
													)}
												</div>
												{repo.description && (
													<p className="text-sm text-muted-foreground truncate">
														{repo.description}
													</p>
												)}
											</div>
											{selectedRepo?.id === repo.id && connecting ? (
												<Loader2 className="size-5 animate-spin" />
											) : (
												<Globe className="size-5 text-muted-foreground" />
											)}
										</button>
									)
								})}
							</div>
						)}

						{/* No repos */}
						{!loadingRepos && repos.length === 0 && (
							<div className="text-center py-8 text-muted-foreground">
								No repositories found
							</div>
						)}
					</DialogContent>
				</Dialog>
			</div>

			{/* Error */}
			{error && !connectDialogOpen && (
				<div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-lg">
					<AlertCircle className="size-4" />
					{error}
				</div>
			)}

			{/* GitHub not connected */}
			{!hasGitHubConnected && !loadingSites && (
				<Card>
					<CardContent className="flex flex-col items-center gap-4 py-12">
						<div className="size-16 rounded-full bg-muted flex items-center justify-center">
							<Github className="size-8" />
						</div>
						<div className="text-center">
							<h3 className="font-semibold">Connect GitHub</h3>
							<p className="text-muted-foreground text-sm mt-1">
								Connect your GitHub account to import repositories
							</p>
						</div>
						<Button asChild>
							<a href={`/api/github/auth?workspaceId=${workspaceId}&returnUrl=/settings/sites`}>
								<Github className="size-4 mr-2" />
								Connect GitHub
							</a>
						</Button>
					</CardContent>
				</Card>
			)}

			{/* Loading */}
			{loadingSites && (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="size-6 animate-spin text-muted-foreground" />
				</div>
			)}

			{/* Sites list */}
			{!loadingSites && sites.length > 0 && (
				<div className="grid gap-4">
					{sites.map((site) => (
						<Card key={site.id}>
							<CardHeader className="pb-3">
								<div className="flex items-start justify-between">
									<div className="space-y-1">
										<CardTitle className="text-lg flex items-center gap-2">
											{site.name}
											{site.status === "connected" && (
												<span className="size-2 rounded-full bg-green-500" />
											)}
										</CardTitle>
										<CardDescription className="flex items-center gap-2">
											<Github className="size-3" />
											<a
												href={site.repo.url}
												target="_blank"
												rel="noopener noreferrer"
												className="hover:underline"
											>
												{site.repo.fullName}
											</a>
											<GitBranch className="size-3 ml-2" />
											{site.repo.branch}
										</CardDescription>
									</div>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="icon">
												<MoreHorizontal className="size-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem asChild>
												<a href={site.repo.url} target="_blank" rel="noopener noreferrer">
													<ExternalLink className="size-4 mr-2" />
													View on GitHub
												</a>
											</DropdownMenuItem>
											{site.productionUrl && (
												<DropdownMenuItem asChild>
													<a href={site.productionUrl} target="_blank" rel="noopener noreferrer">
														<Globe className="size-4 mr-2" />
														View Live Site
													</a>
												</DropdownMenuItem>
											)}
											<DropdownMenuSeparator />
											<DropdownMenuItem
												className="text-red-500 focus:text-red-500"
												onClick={() => disconnectSite(site.id)}
											>
												<Trash2 className="size-4 mr-2" />
												Disconnect
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Framework badge */}
								<div className="flex items-center gap-2 text-sm">
									<span className="text-muted-foreground">Framework:</span>
									<span className="bg-muted px-2 py-0.5 rounded font-medium">
										{site.framework}
										{site.frameworkVersion && ` ${site.frameworkVersion}`}
									</span>
								</div>

								{/* API Key */}
								{site.storefront && (
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<span className="text-sm text-muted-foreground">API Key</span>
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="sm"
													onClick={() =>
														setShowApiKey(
															showApiKey === site.id ? null : site.id
														)
													}
												>
													{showApiKey === site.id ? (
														<EyeOff className="size-4" />
													) : (
														<Eye className="size-4" />
													)}
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => copyApiKey(site.storefront!.apiKey)}
												>
													{copiedKey === site.storefront.apiKey ? (
														<Check className="size-4" />
													) : (
														<Copy className="size-4" />
													)}
												</Button>
											</div>
										</div>
										<code className="block text-sm bg-muted p-2 rounded font-mono">
											{showApiKey === site.id
												? site.storefront.apiKey
												: "••••••••••••••••••••••••••••••••"}
										</code>
									</div>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Empty state */}
			{!loadingSites && hasGitHubConnected && sites.length === 0 && (
				<Card>
					<CardContent className="flex flex-col items-center gap-4 py-12">
						<div className="size-16 rounded-full bg-muted flex items-center justify-center">
							<Globe className="size-8 text-muted-foreground" />
						</div>
						<div className="text-center">
							<h3 className="font-semibold">No sites connected</h3>
							<p className="text-muted-foreground text-sm mt-1">
								Connect a GitHub repository to get started
							</p>
						</div>
						<Button onClick={openConnectDialog}>
							<Plus className="size-4 mr-2" />
							Connect Site
						</Button>
					</CardContent>
				</Card>
			)}
		</div>
	)
}

function getErrorMessage(code: string): string {
	const messages: Record<string, string> = {
		github_oauth_denied: "GitHub authorization was denied",
		missing_params: "Missing OAuth parameters",
		invalid_state: "Invalid OAuth state - please try again",
		session_mismatch: "Session mismatch - please sign in again",
		token_exchange_failed: "Failed to exchange GitHub token",
		callback_failed: "GitHub callback failed",
	}
	return messages[code] || "An error occurred"
}
