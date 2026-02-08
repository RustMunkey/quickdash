import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { contentCollections } from "@quickdash/db/schema"
import { withStorefrontAuth, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

/**
 * GET /api/storefront/collections - List all active collections for this storefront's workspace
 */
async function handleGet(_request: NextRequest, storefront: StorefrontContext) {
	const collections = await db
		.select({
			name: contentCollections.name,
			slug: contentCollections.slug,
			description: contentCollections.description,
		})
		.from(contentCollections)
		.where(
			and(
				eq(contentCollections.workspaceId, storefront.workspaceId),
				eq(contentCollections.isActive, true)
			)
		)
		.orderBy(contentCollections.sortOrder)

	return Response.json({ collections })
}

export const GET = withStorefrontAuth(handleGet)
export const OPTIONS = handleCorsOptions
