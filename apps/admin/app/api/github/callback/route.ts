import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers, cookies } from "next/headers"
import {
	exchangeCodeForToken,
	getGitHubUser,
	getGitHubUserEmail,
	storeGitHubToken,
} from "@/lib/github"

/**
 * GET /api/github/callback
 *
 * GitHub OAuth callback handler.
 * Exchanges code for token and stores it for the user.
 */
export async function GET(request: Request) {
	const { searchParams } = new URL(request.url)
	const code = searchParams.get("code")
	const state = searchParams.get("state")
	const error = searchParams.get("error")

	const baseUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001"

	// Handle OAuth errors
	if (error) {
		console.error("[GitHub OAuth] Error:", error)
		return NextResponse.redirect(
			`${baseUrl}/settings/sites?error=github_oauth_denied`
		)
	}

	if (!code || !state) {
		return NextResponse.redirect(
			`${baseUrl}/settings/sites?error=missing_params`
		)
	}

	// Verify state matches cookie
	const cookieStore = await cookies()
	const storedState = cookieStore.get("github_oauth_state")?.value

	if (!storedState || storedState !== state) {
		return NextResponse.redirect(
			`${baseUrl}/settings/sites?error=invalid_state`
		)
	}

	// Parse state
	let stateData: {
		userId: string
		workspaceId: string | null
		returnUrl: string
	}
	try {
		stateData = JSON.parse(Buffer.from(state, "base64url").toString())
	} catch {
		return NextResponse.redirect(
			`${baseUrl}/settings/sites?error=invalid_state`
		)
	}

	// Verify user session matches state
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user || session.user.id !== stateData.userId) {
		return NextResponse.redirect(
			`${baseUrl}/settings/sites?error=session_mismatch`
		)
	}

	try {
		// Exchange code for token
		const tokenResponse = await exchangeCodeForToken(code)

		if (tokenResponse.error || !tokenResponse.access_token) {
			console.error("[GitHub OAuth] Token error:", tokenResponse)
			return NextResponse.redirect(
				`${baseUrl}/settings/sites?error=token_exchange_failed`
			)
		}

		// Get GitHub user info
		const githubUser = await getGitHubUser(tokenResponse.access_token)

		// Get email if not on profile
		if (!githubUser.email) {
			githubUser.email = await getGitHubUserEmail(tokenResponse.access_token)
		}

		// Store the token
		await storeGitHubToken(
			session.user.id,
			stateData.workspaceId,
			{
				id: githubUser.id,
				login: githubUser.login,
				email: githubUser.email,
				avatar_url: githubUser.avatar_url,
			},
			tokenResponse.access_token,
			tokenResponse.scope
		)

		// Clear state cookie
		const response = NextResponse.redirect(
			`${baseUrl}${stateData.returnUrl}?github=connected`
		)
		response.cookies.delete("github_oauth_state")

		return response
	} catch (error) {
		console.error("[GitHub OAuth] Callback error:", error)
		return NextResponse.redirect(
			`${baseUrl}/settings/sites?error=callback_failed`
		)
	}
}
