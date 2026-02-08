"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createWorkspace, skipWorkspaceCreation } from "../actions"
import { Loader2, Store, Users, Building2, Sparkles, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkspaceStepProps {
	userName: string
	hasExistingWorkspace: boolean
}

const workspaceTypes = [
	{ id: "ecommerce", label: "Online Store", icon: Store, description: "Sell products online" },
	{ id: "community", label: "Community", icon: Users, description: "Build a community" },
	{ id: "agency", label: "Agency", icon: Building2, description: "Manage clients" },
	{ id: "other", label: "Other", icon: Sparkles, description: "Something else" },
]

export function WorkspaceStep({ userName, hasExistingWorkspace }: WorkspaceStepProps) {
	const [isPending, startTransition] = useTransition()
	const [workspaceName, setWorkspaceName] = useState("")
	const [workspaceType, setWorkspaceType] = useState("ecommerce")
	const [domain, setDomain] = useState("")
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		setError(null)

		if (!workspaceName.trim()) {
			setError("Please enter a workspace name")
			return
		}

		const formData = new FormData()
		formData.set("name", workspaceName.trim())
		formData.set("workspaceType", workspaceType)
		if (domain.trim()) {
			formData.set("domain", domain.trim().toLowerCase())
		}

		startTransition(async () => {
			const result = await createWorkspace(formData)
			if (result.error) {
				setError(result.error)
			} else {
				// Workspace created, go to connect step
				window.location.href = "/onboarding/connect"
			}
		})
	}

	const handleSkip = () => {
		startTransition(async () => {
			if (hasExistingWorkspace) {
				// Has workspace, go to connect step
				window.location.href = "/onboarding/connect"
			} else {
				// Create default workspace, then go to connect step
				await skipWorkspaceCreation()
			}
		})
	}

	return (
		<div className="min-h-full flex flex-col">
			{/* Header */}
			<header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
				<div className="relative flex items-center justify-between h-14 px-4 max-w-2xl mx-auto">
					<Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
						<Link href="/onboarding/discover">
							<ArrowLeft className="size-4 mr-2" />
							<span className="hidden sm:inline">Back</span>
						</Link>
					</Button>
					<h1 className="font-semibold absolute left-1/2 -translate-x-1/2">Create workspace</h1>
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
					<p className="text-muted-foreground text-sm text-center">
						{hasExistingWorkspace
							? "Create another workspace or skip to continue"
							: "Your workspace is where you'll manage everything"}
					</p>

					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Workspace name */}
						<div className="space-y-2">
							<Label htmlFor="workspaceName">Workspace name</Label>
							<Input
								id="workspaceName"
								value={workspaceName}
								onChange={(e) => setWorkspaceName(e.target.value)}
								placeholder="My Awesome Store"
								autoFocus
							/>
							<p className="text-xs text-muted-foreground">
								This can be your business name or project name
							</p>
						</div>

						{/* Domain */}
						<div className="space-y-2">
							<Label htmlFor="domain">Store domain</Label>
							<div className="flex items-center">
								<Input
									id="domain"
									value={domain}
									onChange={(e) => setDomain(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
									placeholder="mystore"
									className="rounded-r-none"
								/>
								<span className="inline-flex items-center h-9 px-3 rounded-r-md border border-l-0 bg-muted text-muted-foreground text-sm whitespace-nowrap">
									.quickdash.net
								</span>
							</div>
							<p className="text-xs text-muted-foreground">
								You can add a custom domain later in settings
							</p>
						</div>

						{/* Workspace type */}
						<div className="space-y-3">
							<Label>What will you use it for?</Label>
							<div className="grid grid-cols-2 gap-2">
								{workspaceTypes.map((type) => (
									<button
										key={type.id}
										type="button"
										onClick={() => setWorkspaceType(type.id)}
										className={cn(
											"flex flex-col items-start gap-1 p-3 rounded-lg border-2 transition-all text-left",
											workspaceType === type.id
												? "border-primary bg-primary/5"
												: "border-transparent bg-muted hover:bg-muted/80"
										)}
									>
										<type.icon className="size-5 text-muted-foreground" />
										<span className="font-medium text-sm">{type.label}</span>
										<span className="text-xs text-muted-foreground">{type.description}</span>
									</button>
								))}
							</div>
						</div>

						{error && (
							<p className="text-sm text-red-500 text-center">{error}</p>
						)}

						<Button type="submit" className="w-full" disabled={isPending}>
							{isPending ? (
								<>
									<Loader2 className="mr-2 size-4 animate-spin" />
									Creating...
								</>
							) : (
								"Create Workspace"
							)}
						</Button>
					</form>

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
							<div className="size-2 rounded-full bg-primary" />
						</div>
					</div>
				</div>
			</main>
		</div>
	)
}
