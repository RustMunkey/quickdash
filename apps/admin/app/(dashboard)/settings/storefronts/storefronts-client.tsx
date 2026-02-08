"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { Copy01Icon, RefreshIcon, Delete02Icon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
	createStorefront,
	updateStorefront,
	deleteStorefront,
	regenerateApiKey,
	getApiSecret,
} from "./actions"

type Storefront = {
	id: string
	name: string
	domain: string | null
	customDomain: string | null
	apiKey: string
	permissions: {
		products: boolean
		orders: boolean
		customers: boolean
		checkout: boolean
		inventory: boolean
	} | null
	isActive: boolean | null
	createdAt: Date
	updatedAt: Date
}

function ApiKeyDisplay({ apiKey, storefrontId }: { apiKey: string; storefrontId: string }) {
	const router = useRouter()
	const [visible, setVisible] = React.useState(false)
	const [copied, setCopied] = React.useState(false)
	const [regenerating, setRegenerating] = React.useState(false)

	const copy = async () => {
		await navigator.clipboard.writeText(apiKey)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const regenerate = async () => {
		if (!confirm("Are you sure? This will invalidate the current API key.")) return
		setRegenerating(true)
		try {
			await regenerateApiKey(storefrontId)
			router.refresh()
		} finally {
			setRegenerating(false)
		}
	}

	const displayValue = visible ? apiKey : apiKey.slice(0, 8) + "•".repeat(24)

	return (
		<div className="flex items-center gap-2">
			<code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono truncate">
				{displayValue}
			</code>
			<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVisible(!visible)}>
				<HugeiconsIcon icon={visible ? ViewOffIcon : ViewIcon} size={14} />
			</Button>
			<Button variant="ghost" size="icon" className="h-7 w-7" onClick={copy}>
				<HugeiconsIcon icon={Copy01Icon} size={14} />
				{copied && <span className="sr-only">Copied!</span>}
			</Button>
			<Button variant="ghost" size="icon" className="h-7 w-7" onClick={regenerate} disabled={regenerating}>
				<HugeiconsIcon icon={RefreshIcon} size={14} />
			</Button>
		</div>
	)
}

function CreateStorefrontDialog({ children }: { children: React.ReactNode }) {
	const router = useRouter()
	const [open, setOpen] = React.useState(false)
	const [name, setName] = React.useState("")
	const [domain, setDomain] = React.useState("")
	const [loading, setLoading] = React.useState(false)
	const [error, setError] = React.useState("")

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!name.trim()) return

		setLoading(true)
		setError("")
		try {
			await createStorefront({ name: name.trim(), domain: domain.trim() || undefined })
			setOpen(false)
			setName("")
			setDomain("")
			router.refresh()
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create storefront")
		} finally {
			setLoading(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Create Storefront</DialogTitle>
						<DialogDescription>
							Connect an external website or app to your workspace via API.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								placeholder="My Store"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="domain">Domain (optional)</Label>
							<Input
								id="domain"
								placeholder="mystore.com"
								value={domain}
								onChange={(e) => setDomain(e.target.value)}
							/>
						</div>
						{error && <p className="text-sm text-destructive">{error}</p>}
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={loading || !name.trim()}>
							{loading ? "Creating..." : "Create Storefront"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

function StorefrontCard({ storefront }: { storefront: Storefront }) {
	const router = useRouter()
	const [deleting, setDeleting] = React.useState(false)

	const toggleActive = async () => {
		await updateStorefront(storefront.id, { isActive: !storefront.isActive })
		router.refresh()
	}

	const handleDelete = async () => {
		setDeleting(true)
		try {
			await deleteStorefront(storefront.id)
			router.refresh()
		} finally {
			setDeleting(false)
		}
	}

	const permissions = storefront.permissions ?? {
		products: true,
		orders: true,
		customers: true,
		checkout: true,
		inventory: false,
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="text-base">{storefront.name}</CardTitle>
						<CardDescription>
							{storefront.domain || storefront.customDomain || "No domain set"}
						</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						<Badge variant={storefront.isActive ? "default" : "secondary"}>
							{storefront.isActive ? "Active" : "Disabled"}
						</Badge>
						<Switch checked={storefront.isActive ?? true} onCheckedChange={toggleActive} />
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<Label className="text-xs text-muted-foreground">API Key</Label>
					<ApiKeyDisplay apiKey={storefront.apiKey} storefrontId={storefront.id} />
				</div>

				<div>
					<Label className="text-xs text-muted-foreground mb-2 block">Permissions</Label>
					<div className="flex flex-wrap gap-1">
						{permissions.products && <Badge variant="outline">Products</Badge>}
						{permissions.orders && <Badge variant="outline">Orders</Badge>}
						{permissions.customers && <Badge variant="outline">Customers</Badge>}
						{permissions.checkout && <Badge variant="outline">Checkout</Badge>}
						{permissions.inventory && <Badge variant="outline">Inventory</Badge>}
					</div>
				</div>

				<div className="flex justify-end pt-2 border-t">
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
								<HugeiconsIcon icon={Delete02Icon} size={14} className="mr-1" />
								Delete
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete storefront?</AlertDialogTitle>
								<AlertDialogDescription>
									This will permanently delete &quot;{storefront.name}&quot; and revoke its API access.
									This action cannot be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={handleDelete}
									disabled={deleting}
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								>
									{deleting ? "Deleting..." : "Delete"}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</CardContent>
		</Card>
	)
}

export function StorefrontsClient({ storefronts }: { storefronts: Storefront[] }) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Connect your external websites and apps via API.
				</p>
				<CreateStorefrontDialog>
					<Button size="sm">Add Storefront</Button>
				</CreateStorefrontDialog>
			</div>

			{storefronts.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12 text-center">
						<p className="text-muted-foreground mb-4">
							No storefronts connected yet. Create one to get started.
						</p>
						<CreateStorefrontDialog>
							<Button>Create Storefront</Button>
						</CreateStorefrontDialog>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2">
					{storefronts.map((storefront) => (
						<StorefrontCard key={storefront.id} storefront={storefront} />
					))}
				</div>
			)}

			<Card className="bg-muted/50">
				<CardHeader>
					<CardTitle className="text-sm">API Documentation</CardTitle>
				</CardHeader>
				<CardContent className="text-sm text-muted-foreground space-y-2">
					<p>Use your API key to authenticate requests to the Storefront API:</p>
					<pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`curl -H "X-Storefront-Key: your_api_key" \\
  https://your-domain.com/api/storefront/products`}
					</pre>
					<p className="text-xs">
						Available endpoints: <code>/products</code>, <code>/categories</code>,{" "}
						<code>/checkout</code>, <code>/orders</code>
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
