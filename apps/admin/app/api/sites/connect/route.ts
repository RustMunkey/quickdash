import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import {
	connectedSites,
	storefronts,
	githubTokens,
	workspaceMembers,
} from "@quickdash/db/schema"
import {
	getGitHubToken,
	scanRepo,
	generateStorefrontApiKey,
	generateStorefrontSecret,
	generateEnvVars,
	type GitHubRepo,
} from "@/lib/github"

/**
 * POST /api/sites/connect
 *
 * Connect a GitHub repository to a workspace.
 * This will:
 * 1. Verify user has access to the repo
 * 2. Scan the repo for framework detection
 * 3. Create a storefront with API keys
 * 4. Create the connected site record
 * 5. Return environment variables for the user to add
 *
 * Body:
 * - workspaceId: The workspace to connect to
 * - repo: { id, name, fullName, url, defaultBranch, owner }
 * - name: Optional display name (defaults to repo name)
 * - productionUrl: Optional production URL of the site
 */
export async function POST(request: Request) {
	// Verify user is authenticated
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const body = await request.json()
	const { workspaceId, repo, name, productionUrl } = body as {
		workspaceId: string
		repo: {
			id: number
			name: string
			fullName: string
			url: string
			defaultBranch: string
			owner: { login: string }
		}
		name?: string
		productionUrl?: string
	}

	if (!workspaceId || !repo?.id || !repo?.fullName) {
		return NextResponse.json(
			{ error: "Missing required fields: workspaceId, repo" },
			{ status: 400 }
		)
	}

	// Verify user has access to this workspace
	const [membership] = await db
		.select()
		.from(workspaceMembers)
		.where(
			and(
				eq(workspaceMembers.workspaceId, workspaceId),
				eq(workspaceMembers.userId, session.user.id)
			)
		)
		.limit(1)

	if (!membership) {
		return NextResponse.json(
			{ error: "You don't have access to this workspace" },
			{ status: 403 }
		)
	}

	// Check if repo is already connected to this workspace
	const [existing] = await db
		.select()
		.from(connectedSites)
		.where(
			and(
				eq(connectedSites.workspaceId, workspaceId),
				eq(connectedSites.githubRepoId, String(repo.id))
			)
		)
		.limit(1)

	if (existing) {
		return NextResponse.json(
			{ error: "This repository is already connected to this workspace" },
			{ status: 409 }
		)
	}

	// Get user's GitHub token
	const accessToken = await getGitHubToken(session.user.id)
	if (!accessToken) {
		return NextResponse.json(
			{ error: "GitHub not connected" },
			{ status: 400 }
		)
	}

	// Get GitHub account info for the connection
	const [githubToken] = await db
		.select()
		.from(githubTokens)
		.where(
			and(
				eq(githubTokens.userId, session.user.id),
				eq(githubTokens.isActive, true)
			)
		)
		.limit(1)

	if (!githubToken) {
		return NextResponse.json(
			{ error: "GitHub token not found" },
			{ status: 400 }
		)
	}

	try {
		// Scan the repo for framework detection
		const [owner, repoName] = repo.fullName.split("/")
		const scanResult = await scanRepo(accessToken, owner, repoName)

		// Generate API keys
		const apiKey = generateStorefrontApiKey()
		const apiSecret = generateStorefrontSecret()

		// Create storefront
		const [storefront] = await db
			.insert(storefronts)
			.values({
				workspaceId,
				name: name || repo.name,
				domain: productionUrl ? new URL(productionUrl).hostname : null,
				apiKey,
				apiSecret,
				permissions: {
					products: true,
					orders: true,
					customers: true,
					checkout: true,
					inventory: false,
				},
			})
			.returning()

		// Create connected site record
		const [connectedSite] = await db
			.insert(connectedSites)
			.values({
				workspaceId,
				storefrontId: storefront.id,
				name: name || repo.name,
				githubRepoId: String(repo.id),
				githubRepoFullName: repo.fullName,
				githubRepoUrl: repo.url,
				githubDefaultBranch: repo.defaultBranch,
				githubAccountId: githubToken.githubAccountId,
				githubAccountLogin: githubToken.githubAccountLogin,
				framework: scanResult.framework,
				frameworkVersion: scanResult.frameworkVersion,
				hasPackageJson: scanResult.hasPackageJson,
				hasEnvExample: scanResult.hasEnvExample,
				configPaths: scanResult.configPaths,
				productionUrl,
				status: "connected",
				connectedBy: session.user.id,
			})
			.returning()

		// Generate environment variables
		const baseUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "https://app.quickdash.net"
		const { vars, envContent } = generateEnvVars(apiKey, baseUrl)

		return NextResponse.json({
			success: true,
			site: {
				id: connectedSite.id,
				name: connectedSite.name,
				repo: {
					fullName: connectedSite.githubRepoFullName,
					url: connectedSite.githubRepoUrl,
				},
				framework: connectedSite.framework,
				frameworkVersion: connectedSite.frameworkVersion,
				status: connectedSite.status,
			},
			storefront: {
				id: storefront.id,
				name: storefront.name,
				apiKey: storefront.apiKey,
				// Don't expose apiSecret in response - show only in settings
			},
			envVars: vars,
			envContent,
			instructions: getSetupInstructions(scanResult.framework, vars),
		})
	} catch (error) {
		console.error("[Connect Site] Error:", error)
		return NextResponse.json(
			{ error: "Failed to connect repository" },
			{ status: 500 }
		)
	}
}

/**
 * Generate framework-specific setup instructions
 */
function getSetupInstructions(
	framework: string,
	vars: { key: string; value: string }[]
): string {
	const envList = vars.map((v) => `${v.key}=${v.value}`).join("\n")

	switch (framework) {
		case "nextjs":
			return `## Next.js Setup

1. Add these environment variables to your \`.env.local\` file:

\`\`\`
${envList}
\`\`\`

2. If deploying to Vercel, add these in Project Settings → Environment Variables

3. Install the storefront client (optional but recommended):
\`\`\`bash
npm install @quickdash/storefront-client
\`\`\`

4. Initialize the client in your app:
\`\`\`typescript
import { StorefrontClient } from '@quickdash/storefront-client'

export const store = new StorefrontClient({
  apiKey: process.env.NEXT_PUBLIC_STOREFRONT_API_KEY!,
  baseUrl: process.env.NEXT_PUBLIC_STOREFRONT_URL!,
})
\`\`\`

5. Fetch products in your pages:
\`\`\`typescript
const { products } = await store.products.list()
\`\`\`
`

		case "remix":
		case "astro":
		case "nuxt":
		case "sveltekit":
			return `## ${framework.charAt(0).toUpperCase() + framework.slice(1)} Setup

1. Add these environment variables to your \`.env\` file:

\`\`\`
${envList}
\`\`\`

2. Use the storefront API in your loaders/pages:
\`\`\`typescript
const response = await fetch(\`\${process.env.NEXT_PUBLIC_STOREFRONT_URL}/api/storefront/products\`, {
  headers: {
    'X-Storefront-Key': process.env.NEXT_PUBLIC_STOREFRONT_API_KEY!,
  },
})
const { products } = await response.json()
\`\`\`
`

		default:
			return `## Setup Instructions

1. Add these environment variables to your project:

\`\`\`
${envList}
\`\`\`

2. Make API requests to the storefront API:
\`\`\`typescript
const response = await fetch(\`\${STOREFRONT_URL}/api/storefront/products\`, {
  headers: {
    'X-Storefront-Key': API_KEY,
  },
})
const { products } = await response.json()
\`\`\`

See the API documentation for all available endpoints.
`
	}
}
