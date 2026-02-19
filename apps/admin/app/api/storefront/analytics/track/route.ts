import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { analyticsEvents } from "@quickdash/db/schema"
import { withStorefrontAuth, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	try {
		const body = await request.json()
		const { sessionId, visitorId, eventType, pathname, referrer, hostname, eventData } = body

		if (!sessionId || !visitorId || !pathname) {
			return Response.json({ error: "Missing required fields: sessionId, visitorId, pathname" }, { status: 400 })
		}

		await db.insert(analyticsEvents).values({
			workspaceId: storefront.workspaceId,
			sessionId: String(sessionId).slice(0, 64),
			visitorId: String(visitorId).slice(0, 64),
			eventType: eventType ? String(eventType).slice(0, 50) : "pageview",
			pathname: String(pathname).slice(0, 2048),
			referrer: referrer ? String(referrer).slice(0, 2048) : null,
			hostname: hostname ? String(hostname).slice(0, 255) : null,
			eventData: eventData || null,
		})

		return Response.json({ ok: true })
	} catch {
		return Response.json({ error: "Internal error" }, { status: 500 })
	}
}

export const POST = withStorefrontAuth(handlePost)
export const OPTIONS = handleCorsOptions
