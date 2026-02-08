import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq } from "@quickdash/db/drizzle"
import { siteContent } from "@quickdash/db/schema"
import { withStorefrontAuth, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

/**
 * GET /api/storefront/site-content - Get all site content key-value pairs
 */
async function handleGet(_request: NextRequest, storefront: StorefrontContext) {
	const items = await db
		.select({
			id: siteContent.id,
			key: siteContent.key,
			type: siteContent.type,
			value: siteContent.value,
		})
		.from(siteContent)
		.where(eq(siteContent.workspaceId, storefront.workspaceId))

	return Response.json({ content: items })
}

export const GET = withStorefrontAuth(handleGet)
export const OPTIONS = handleCorsOptions
