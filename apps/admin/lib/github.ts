/**
 * GitHub Integration Library
 *
 * Handles OAuth flow and GitHub API interactions for the "Connect Site" feature.
 * Uses GitHub OAuth Apps (not GitHub Apps) for simplicity.
 */

import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { githubTokens, connectedSites, storefronts, type SupportedFramework } from "@quickdash/db/schema"
import { nanoid } from "nanoid"

// GitHub OAuth configuration for REPO ACCESS (separate from login OAuth)
// This uses the repo scope which requires a separate OAuth app
const GITHUB_CLIENT_ID = process.env.GITHUB_REPO_CLIENT_ID || process.env.GITHUB_CLIENT_ID!
const GITHUB_CLIENT_SECRET = process.env.GITHUB_REPO_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET!
const GITHUB_REDIRECT_URI = `${process.env.NEXT_PUBLIC_ADMIN_URL}/api/github/callback`

// Scopes needed for repo access
const GITHUB_SCOPES = ["repo", "read:user", "user:email"].join(" ")

/**
 * Generate GitHub OAuth authorization URL
 */
export function getGitHubAuthUrl(state: string): string {
	const params = new URLSearchParams({
		client_id: GITHUB_CLIENT_ID,
		redirect_uri: GITHUB_REDIRECT_URI,
		scope: GITHUB_SCOPES,
		state,
		allow_signup: "false", // User must already have GitHub account
	})

	return `https://github.com/login/oauth/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
	access_token: string
	token_type: string
	scope: string
	error?: string
}> {
	const response = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			client_id: GITHUB_CLIENT_ID,
			client_secret: GITHUB_CLIENT_SECRET,
			code,
			redirect_uri: GITHUB_REDIRECT_URI,
		}),
	})

	return response.json()
}

/**
 * Get GitHub user info from access token
 */
export async function getGitHubUser(accessToken: string): Promise<{
	id: number
	login: string
	email: string | null
	avatar_url: string
	name: string | null
}> {
	const response = await fetch("https://api.github.com/user", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: "application/vnd.github.v3+json",
		},
	})

	if (!response.ok) {
		throw new Error(`GitHub API error: ${response.status}`)
	}

	return response.json()
}

/**
 * Get user's email (may not be public on profile)
 */
export async function getGitHubUserEmail(accessToken: string): Promise<string | null> {
	const response = await fetch("https://api.github.com/user/emails", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: "application/vnd.github.v3+json",
		},
	})

	if (!response.ok) {
		return null
	}

	const emails: { email: string; primary: boolean; verified: boolean }[] = await response.json()
	const primary = emails.find((e) => e.primary && e.verified)
	return primary?.email ?? emails[0]?.email ?? null
}

/**
 * List user's repositories
 */
export async function listGitHubRepos(accessToken: string, page = 1, perPage = 30): Promise<{
	repos: GitHubRepo[]
	hasMore: boolean
}> {
	const params = new URLSearchParams({
		sort: "updated",
		direction: "desc",
		per_page: String(perPage),
		page: String(page),
	})

	const response = await fetch(`https://api.github.com/user/repos?${params}`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: "application/vnd.github.v3+json",
		},
	})

	if (!response.ok) {
		throw new Error(`GitHub API error: ${response.status}`)
	}

	const repos: GitHubRepo[] = await response.json()
	const linkHeader = response.headers.get("Link")
	const hasMore = linkHeader?.includes('rel="next"') ?? false

	return { repos, hasMore }
}

export interface GitHubRepo {
	id: number
	name: string
	full_name: string
	html_url: string
	description: string | null
	private: boolean
	default_branch: string
	updated_at: string
	pushed_at: string
	language: string | null
	owner: {
		login: string
		avatar_url: string
	}
}

/**
 * Get contents of a file from a repo
 */
export async function getRepoFile(
	accessToken: string,
	owner: string,
	repo: string,
	path: string
): Promise<string | null> {
	const response = await fetch(
		`https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: "application/vnd.github.v3+json",
			},
		}
	)

	if (!response.ok) {
		return null
	}

	const data = await response.json()
	if (data.type !== "file" || !data.content) {
		return null
	}

	// GitHub returns base64 encoded content
	return Buffer.from(data.content, "base64").toString("utf-8")
}

/**
 * Detect framework from package.json
 */
export function detectFramework(packageJson: string): {
	framework: SupportedFramework
	version: string | null
} {
	try {
		const pkg = JSON.parse(packageJson)
		const deps = { ...pkg.dependencies, ...pkg.devDependencies }

		// Check for frameworks in order of specificity
		if (deps["next"]) {
			return { framework: "nextjs", version: deps["next"] }
		}
		if (deps["@remix-run/react"] || deps["remix"]) {
			return { framework: "remix", version: deps["@remix-run/react"] || deps["remix"] }
		}
		if (deps["astro"]) {
			return { framework: "astro", version: deps["astro"] }
		}
		if (deps["nuxt"]) {
			return { framework: "nuxt", version: deps["nuxt"] }
		}
		if (deps["@sveltejs/kit"]) {
			return { framework: "sveltekit", version: deps["@sveltejs/kit"] }
		}
		if (deps["gatsby"]) {
			return { framework: "gatsby", version: deps["gatsby"] }
		}
		if (deps["@angular/core"]) {
			return { framework: "angular", version: deps["@angular/core"] }
		}
		if (deps["vite"] && deps["react"]) {
			return { framework: "vite-react", version: deps["vite"] }
		}
		if (deps["vite"] && deps["vue"]) {
			return { framework: "vite-vue", version: deps["vite"] }
		}
		if (deps["react-scripts"]) {
			return { framework: "create-react-app", version: deps["react-scripts"] }
		}

		return { framework: "unknown", version: null }
	} catch {
		return { framework: "unknown", version: null }
	}
}

/**
 * Scan a repo to detect framework and configuration
 */
export async function scanRepo(
	accessToken: string,
	owner: string,
	repo: string
): Promise<{
	framework: SupportedFramework
	frameworkVersion: string | null
	hasPackageJson: boolean
	hasEnvExample: boolean
	configPaths: {
		packageJson?: string
		envExample?: string
		nextConfig?: string
		otherConfigs?: string[]
	}
}> {
	const result: ReturnType<typeof scanRepo> extends Promise<infer T> ? T : never = {
		framework: "unknown",
		frameworkVersion: null,
		hasPackageJson: false,
		hasEnvExample: false,
		configPaths: {},
	}

	// Check for package.json
	const packageJson = await getRepoFile(accessToken, owner, repo, "package.json")
	if (packageJson) {
		result.hasPackageJson = true
		result.configPaths.packageJson = "package.json"

		const detection = detectFramework(packageJson)
		result.framework = detection.framework
		result.frameworkVersion = detection.version
	}

	// Check for .env.example
	const envPaths = [".env.example", ".env.local.example", ".env.sample"]
	for (const path of envPaths) {
		const content = await getRepoFile(accessToken, owner, repo, path)
		if (content) {
			result.hasEnvExample = true
			result.configPaths.envExample = path
			break
		}
	}

	// Check for Next.js config
	if (result.framework === "nextjs") {
		const nextConfigPaths = ["next.config.js", "next.config.ts", "next.config.mjs"]
		for (const path of nextConfigPaths) {
			const content = await getRepoFile(accessToken, owner, repo, path)
			if (content) {
				result.configPaths.nextConfig = path
				break
			}
		}
	}

	return result
}

/**
 * Store or update GitHub token for a user
 */
export async function storeGitHubToken(
	userId: string,
	workspaceId: string | null,
	githubUser: {
		id: number
		login: string
		email: string | null
		avatar_url: string
	},
	accessToken: string,
	scope: string
): Promise<void> {
	const existing = await db
		.select()
		.from(githubTokens)
		.where(
			and(
				eq(githubTokens.userId, userId),
				eq(githubTokens.githubAccountId, String(githubUser.id))
			)
		)
		.limit(1)

	if (existing.length > 0) {
		// Update existing token
		await db
			.update(githubTokens)
			.set({
				accessToken,
				scope,
				githubAccountLogin: githubUser.login,
				githubAccountEmail: githubUser.email,
				githubAccountAvatar: githubUser.avatar_url,
				workspaceId: workspaceId ?? existing[0].workspaceId,
				updatedAt: new Date(),
			})
			.where(eq(githubTokens.id, existing[0].id))
	} else {
		// Create new token
		await db.insert(githubTokens).values({
			userId,
			workspaceId,
			githubAccountId: String(githubUser.id),
			githubAccountLogin: githubUser.login,
			githubAccountEmail: githubUser.email,
			githubAccountAvatar: githubUser.avatar_url,
			accessToken,
			scope,
		})
	}
}

/**
 * Get user's GitHub token
 */
export async function getGitHubToken(userId: string): Promise<string | null> {
	const [token] = await db
		.select()
		.from(githubTokens)
		.where(and(eq(githubTokens.userId, userId), eq(githubTokens.isActive, true)))
		.limit(1)

	return token?.accessToken ?? null
}

/**
 * Generate API key for a storefront
 */
export function generateStorefrontApiKey(): string {
	return `sf_${nanoid(32)}`
}

/**
 * Generate secret key for a storefront
 */
export function generateStorefrontSecret(): string {
	return `sk_${nanoid(40)}`
}

/**
 * Generate environment variables for a connected site
 */
export function generateEnvVars(
	storefrontApiKey: string,
	baseUrl: string
): {
	vars: { key: string; value: string; description: string }[]
	envContent: string
} {
	const vars = [
		{
			key: "NEXT_PUBLIC_STOREFRONT_API_KEY",
			value: storefrontApiKey,
			description: "Your storefront API key (public)",
		},
		{
			key: "NEXT_PUBLIC_STOREFRONT_URL",
			value: baseUrl,
			description: "Quickdash API URL",
		},
	]

	const envContent = vars
		.map((v) => `# ${v.description}\n${v.key}=${v.value}`)
		.join("\n\n")

	return { vars, envContent }
}
