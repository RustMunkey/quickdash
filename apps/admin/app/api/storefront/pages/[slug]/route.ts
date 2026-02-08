import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { sitePages } from "@quickdash/db/schema"
import { withStorefrontAuth, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

/**
 * GET /api/storefront/pages/:slug - Get a single published page
 */
async function handleGet(request: NextRequest, storefront: StorefrontContext) {
	const url = new URL(request.url)
	const segments = url.pathname.split("/")
	const slug = segments[segments.length - 1] || ""

	const [page] = await db
		.select({
			id: sitePages.id,
			title: sitePages.title,
			slug: sitePages.slug,
			content: sitePages.content,
			metaTitle: sitePages.metaTitle,
			metaDescription: sitePages.metaDescription,
		})
		.from(sitePages)
		.where(
			and(
				eq(sitePages.workspaceId, storefront.workspaceId),
				eq(sitePages.slug, slug),
				eq(sitePages.status, "published")
			)
		)
		.limit(1)

	if (!page) {
		return Response.json({ error: "Page not found" }, { status: 404 })
	}

	return Response.json({ page })
}

export const GET = withStorefrontAuth(handleGet)
export const OPTIONS = handleCorsOptions
