import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getGitHubToken, listGitHubRepos, scanRepo } from "@/lib/github"
import { db } from "@quickdash/db/client"
import { eq } from "@quickdash/db/drizzle"
import { githubTokens } from "@quickdash/db/schema"

/**
 * GET /api/github/repos
 *
 * List user's GitHub repositories.
 * Requires user to have connected their GitHub account.
 *
 * Query params:
 * - page: Page number (default 1)
 * - perPage: Items per page (default 30, max 100)
 */
export async function GET(request: Request) {
	// Verify user is authenticated
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { searchParams } = new URL(request.url)
	const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
	const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("perPage") || "30")))

	// Get user's GitHub token
	const accessToken = await getGitHubToken(session.user.id)

	if (!accessToken) {
		return NextResponse.json(
			{
				error: "GitHub not connected",
				code: "GITHUB_NOT_CONNECTED",
				connectUrl: `/api/github/auth`,
			},
			{ status: 400 }
		)
	}

	try {
		const { repos, hasMore } = await listGitHubRepos(accessToken, page, perPage)

		// Get GitHub account info
		const [tokenInfo] = await db
			.select({
				login: githubTokens.githubAccountLogin,
				avatar: githubTokens.githubAccountAvatar,
			})
			.from(githubTokens)
			.where(eq(githubTokens.userId, session.user.id))
			.limit(1)

		return NextResponse.json({
			repos: repos.map((repo) => ({
				id: repo.id,
				name: repo.name,
				fullName: repo.full_name,
				url: repo.html_url,
				description: repo.description,
				private: repo.private,
				defaultBranch: repo.default_branch,
				updatedAt: repo.updated_at,
				pushedAt: repo.pushed_at,
				language: repo.language,
				owner: {
					login: repo.owner.login,
					avatarUrl: repo.owner.avatar_url,
				},
			})),
			pagination: {
				page,
				perPage,
				hasMore,
			},
			githubAccount: tokenInfo
				? {
						login: tokenInfo.login,
						avatar: tokenInfo.avatar,
				  }
				: null,
		})
	} catch (error) {
		console.error("[GitHub Repos] Error:", error)

		// Check if it's an auth error
		if (error instanceof Error && error.message.includes("401")) {
			// Token may be expired/revoked - mark as inactive
			await db
				.update(githubTokens)
				.set({ isActive: false })
				.where(eq(githubTokens.userId, session.user.id))

			return NextResponse.json(
				{
					error: "GitHub token expired",
					code: "GITHUB_TOKEN_EXPIRED",
					connectUrl: `/api/github/auth`,
				},
				{ status: 401 }
			)
		}

		return NextResponse.json(
			{ error: "Failed to fetch repositories" },
			{ status: 500 }
		)
	}
}

/**
 * POST /api/github/repos
 *
 * Scan a specific repository to detect framework and configuration.
 *
 * Body:
 * - owner: Repository owner
 * - repo: Repository name
 */
export async function POST(request: Request) {
	// Verify user is authenticated
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const body = await request.json()
	const { owner, repo } = body

	if (!owner || !repo) {
		return NextResponse.json(
			{ error: "Missing owner or repo" },
			{ status: 400 }
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

	try {
		const scanResult = await scanRepo(accessToken, owner, repo)

		return NextResponse.json({
			scan: scanResult,
		})
	} catch (error) {
		console.error("[GitHub Scan] Error:", error)
		return NextResponse.json(
			{ error: "Failed to scan repository" },
			{ status: 500 }
		)
	}
}
