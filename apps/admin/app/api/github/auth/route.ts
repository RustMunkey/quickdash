import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getGitHubAuthUrl } from "@/lib/github"
import { nanoid } from "nanoid"

/**
 * GET /api/github/auth
 *
 * Initiates GitHub OAuth flow for repo access.
 * Redirects to GitHub with proper scopes for repository access.
 *
 * Query params:
 * - workspaceId: Optional workspace to associate the connection with
 * - returnUrl: URL to redirect to after OAuth (defaults to /settings/sites)
 */
export async function GET(request: Request) {
	// Verify user is authenticated
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { searchParams } = new URL(request.url)
	const workspaceId = searchParams.get("workspaceId")
	const returnUrl = searchParams.get("returnUrl") || "/settings/sites"

	// Create state with session info for security
	const state = Buffer.from(
		JSON.stringify({
			userId: session.user.id,
			workspaceId,
			returnUrl,
			nonce: nanoid(),
		})
	).toString("base64url")

	// Store state in cookie for verification
	const response = NextResponse.redirect(getGitHubAuthUrl(state))
	response.cookies.set("github_oauth_state", state, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 60 * 10, // 10 minutes
		path: "/",
	})

	return response
}
