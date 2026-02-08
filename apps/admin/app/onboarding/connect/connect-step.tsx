"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { completeOnboarding } from "../actions"
import {
	Loader2,
	ArrowLeft,
	Github,
	CheckCircle2,
	ExternalLink,
	Copy,
	Check,
	Globe,
	Rocket,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ConnectStepProps {
	userName: string
	workspaceId: string
	workspaceName: string
	hasGitHubConnected: boolean
	githubLogin?: string | null
}

interface Repo {
	id: number
	name: string
	fullName: string
	url: string
	description: string | null
	private: boolean
	defaultBranch: string
	updatedAt: string
	language: string | null
	owner: {
		login: string
		avatarUrl: string
	}
}

interface ConnectResult {
	success: boolean
	site: {
		id: string
		name: string
		framework: string
	}
	storefront: {
		id: string
		apiKey: string
	}
	envVars: { key: string; value: string; description: string }[]
	envContent: string
	instructions: string
}

export function ConnectStep({
	userName,
	workspaceId,
	workspaceName,
	hasGitHubConnected: initialHasGitHub,
	githubLogin: initialGithubLogin,
}: ConnectStepProps) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [isPending, startTransition] = useTransition()

	// State
	const [hasGitHubConnected, setHasGitHubConnected] = useState(initialHasGitHub)
	const [githubLogin, setGithubLogin] = useState(initialGithubLogin)
	const [repos, setRepos] = useState<Repo[]>([])
	const [loadingRepos, setLoadingRepos] = useState(false)
	const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null)
	const [connecting, setConnecting] = useState(false)
	const [connectResult, setConnectResult] = useState<ConnectResult | null>(null)
	const [copiedKey, setCopiedKey] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Check if we just connected GitHub
	useEffect(() => {
		if (searchParams.get("github") === "connected") {
			setHasGitHubConnected(true)
			// Fetch repos
			fetchRepos()
			// Clean up URL
			router.replace("/onboarding/connect")
		}
	}, [searchParams, router])

	// Fetch repos when GitHub is connected
	useEffect(() => {
		if (hasGitHubConnected && repos.length === 0 && !loadingRepos) {
			fetchRepos()
		}
	}, [hasGitHubConnected])

	const fetchRepos = async () => {
		setLoadingRepos(true)
		setError(null)
		try {
			const response = await fetch("/api/github/repos")
			const data = await response.json()

			if (!response.ok) {
				if (data.code === "GITHUB_NOT_CONNECTED") {
					setHasGitHubConnected(false)
					return
				}
				throw new Error(data.error || "Failed to fetch repos")
			}

			setRepos(data.repos)
			if (data.githubAccount) {
				setGithubLogin(data.githubAccount.login)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch repos")
		} finally {
			setLoadingRepos(false)
		}
	}

	const connectRepo = async (repo: Repo) => {
		setConnecting(true)
		setError(null)
		setSelectedRepo(repo)

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
				throw new Error(data.error || "Failed to connect repo")
			}

			setConnectResult(data)
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to connect repo")
			setSelectedRepo(null)
		} finally {
			setConnecting(false)
		}
	}

	const copyApiKey = async () => {
		if (!connectResult?.storefront.apiKey) return
		await navigator.clipboard.writeText(connectResult.storefront.apiKey)
		setCopiedKey(true)
		setTimeout(() => setCopiedKey(false), 2000)
	}

	const handleComplete = () => {
		startTransition(async () => {
			await completeOnboarding()
		})
	}

	const handleSkip = () => {
		startTransition(async () => {
			await completeOnboarding()
		})
	}

	// Success screen after connecting
	if (connectResult) {
		return (
			<div className="min-h-full flex flex-col">
				<header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
					<div className="flex items-center justify-center h-14 px-4">
						<h1 className="font-semibold">Site Connected!</h1>
					</div>
				</header>

				<main className="flex-1 p-4 sm:p-6 pb-12">
					<div className="w-full max-w-2xl mx-auto space-y-6">
						{/* Success message */}
						<div className="flex flex-col items-center gap-4 py-6">
							<div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center">
								<CheckCircle2 className="size-8 text-green-500" />
							</div>
							<div className="text-center">
								<h2 className="text-xl font-semibold">{connectResult.site.name} connected!</h2>
								<p className="text-muted-foreground text-sm mt-1">
									Framework detected: <span className="font-medium">{connectResult.site.framework}</span>
								</p>
							</div>
						</div>

						{/* API Key */}
						<div className="bg-muted rounded-lg p-4 space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium">Your API Key</span>
								<Button
									variant="ghost"
									size="sm"
									onClick={copyApiKey}
									className="h-8"
								>
									{copiedKey ? (
										<Check className="size-4 mr-2" />
									) : (
										<Copy className="size-4 mr-2" />
									)}
									{copiedKey ? "Copied!" : "Copy"}
								</Button>
							</div>
							<code className="block text-sm bg-background p-3 rounded border font-mono break-all">
								{connectResult.storefront.apiKey}
							</code>
						</div>

						{/* Environment Variables */}
						<div className="space-y-3">
							<h3 className="font-medium">Add to your environment variables:</h3>
							<div className="bg-zinc-900 text-zinc-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
								<pre>{connectResult.envContent}</pre>
							</div>
							<p className="text-xs text-muted-foreground">
								Add these to your <code className="bg-muted px-1 rounded">.env.local</code> file or Vercel/Netlify environment settings.
							</p>
						</div>

						{/* Actions */}
						<div className="flex flex-col gap-3 pt-4">
							<Button onClick={handleComplete} disabled={isPending} size="lg">
								{isPending ? (
									<Loader2 className="size-4 animate-spin mr-2" />
								) : (
									<Rocket className="size-4 mr-2" />
								)}
								Go to Dashboard
							</Button>
							<Button
								variant="outline"
								asChild
							>
								<a href={selectedRepo?.url} target="_blank" rel="noopener noreferrer">
									<Github className="size-4 mr-2" />
									View Repository
									<ExternalLink className="size-3 ml-2" />
								</a>
							</Button>
						</div>
					</div>
				</main>
			</div>
		)
	}

	return (
		<div className="min-h-full flex flex-col">
			{/* Header */}
			<header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
				<div className="relative flex items-center justify-between h-14 px-4 max-w-2xl mx-auto">
					<Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
						<Link href="/onboarding/workspace">
							<ArrowLeft className="size-4 mr-2" />
							<span className="hidden sm:inline">Back</span>
						</Link>
					</Button>
					<h1 className="font-semibold absolute left-1/2 -translate-x-1/2">Connect your site</h1>
					<Button
						size="sm"
						variant="outline"
						className="-mr-2"
						onClick={handleSkip}
						disabled={isPending}
					>
						Skip
					</Button>
				</div>
			</header>

			{/* Content */}
			<main className="flex-1 p-4 sm:p-6 pb-12">
				<div className="w-full max-w-2xl mx-auto space-y-6">
					<div className="text-center">
						<p className="text-muted-foreground text-sm">
							Connect a GitHub repository to {workspaceName}
						</p>
					</div>

					{error && (
						<div className="bg-red-500/10 text-red-500 text-sm p-3 rounded-lg text-center">
							{error}
						</div>
					)}

					{/* GitHub not connected */}
					{!hasGitHubConnected && (
						<div className="flex flex-col items-center gap-6 py-8">
							<div className="size-20 rounded-full bg-muted flex items-center justify-center">
								<Github className="size-10" />
							</div>
							<div className="text-center space-y-2">
								<h2 className="text-lg font-semibold">Connect GitHub</h2>
								<p className="text-muted-foreground text-sm max-w-md">
									Connect your GitHub account to import repositories and automatically configure your storefront.
								</p>
							</div>
							<Button asChild size="lg">
								<a href={`/api/github/auth?workspaceId=${workspaceId}&returnUrl=/onboarding/connect`}>
									<Github className="size-4 mr-2" />
									Connect GitHub
								</a>
							</Button>
						</div>
					)}

					{/* GitHub connected - show repos */}
					{hasGitHubConnected && (
						<>
							{/* Connected account */}
							<div className="flex items-center justify-between p-3 bg-muted rounded-lg">
								<div className="flex items-center gap-3">
									<Github className="size-5" />
									<span className="text-sm">
										Connected as <span className="font-medium">@{githubLogin}</span>
									</span>
								</div>
								<Button variant="ghost" size="sm" asChild>
									<a href={`/api/github/auth?workspaceId=${workspaceId}&returnUrl=/onboarding/connect`}>
										Switch
									</a>
								</Button>
							</div>

							{/* Loading repos */}
							{loadingRepos && (
								<div className="flex items-center justify-center py-12">
									<Loader2 className="size-6 animate-spin text-muted-foreground" />
								</div>
							)}

							{/* Repo list */}
							{!loadingRepos && repos.length > 0 && (
								<div className="space-y-2">
									<label className="text-sm font-medium">Select a repository</label>
									<div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
										{repos.map((repo) => (
											<button
												key={repo.id}
												onClick={() => connectRepo(repo)}
												disabled={connecting}
												className={cn(
													"w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors",
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
													</div>
													{repo.description && (
														<p className="text-sm text-muted-foreground truncate">
															{repo.description}
														</p>
													)}
													<div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
														{repo.language && <span>{repo.language}</span>}
														<span>Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
													</div>
												</div>
												{selectedRepo?.id === repo.id && connecting ? (
													<Loader2 className="size-5 animate-spin text-muted-foreground" />
												) : (
													<Globe className="size-5 text-muted-foreground" />
												)}
											</button>
										))}
									</div>
								</div>
							)}

							{/* No repos */}
							{!loadingRepos && repos.length === 0 && (
								<div className="text-center py-8">
									<p className="text-muted-foreground">No repositories found</p>
									<Button variant="outline" className="mt-4" onClick={fetchRepos}>
										Refresh
									</Button>
								</div>
							)}
						</>
					)}

					{/* Bottom Navigation */}
					<div className="flex flex-col items-center gap-4 pt-6">
						<Button
							variant="ghost"
							size="sm"
							className="text-muted-foreground"
							onClick={handleSkip}
							disabled={isPending}
						>
							Skip for now
						</Button>

						{/* Pagination Dots */}
						<div className="flex items-center gap-2">
							<div className="size-2 rounded-full bg-muted" />
							<div className="size-2 rounded-full bg-muted" />
							<div className="size-2 rounded-full bg-muted" />
							<div className="size-2 rounded-full bg-primary" />
						</div>
					</div>
				</div>
			</main>
		</div>
	)
}
