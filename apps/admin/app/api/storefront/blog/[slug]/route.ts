import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { blogPosts, users } from "@quickdash/db/schema"
import { withStorefrontAuth, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

/**
 * GET /api/storefront/blog/:slug - Get a single published blog post
 */
async function handleGet(request: NextRequest, storefront: StorefrontContext) {
	const url = new URL(request.url)
	const segments = url.pathname.split("/")
	const slug = segments[segments.length - 1] || ""

	const [post] = await db
		.select({
			id: blogPosts.id,
			title: blogPosts.title,
			slug: blogPosts.slug,
			excerpt: blogPosts.excerpt,
			content: blogPosts.content,
			coverImage: blogPosts.coverImage,
			tags: blogPosts.tags,
			publishedAt: blogPosts.publishedAt,
			authorName: users.name,
			authorImage: users.image,
			metaTitle: blogPosts.metaTitle,
			metaDescription: blogPosts.metaDescription,
		})
		.from(blogPosts)
		.leftJoin(users, eq(blogPosts.author, users.id))
		.where(
			and(
				eq(blogPosts.workspaceId, storefront.workspaceId),
				eq(blogPosts.slug, slug),
				eq(blogPosts.status, "published")
			)
		)
		.limit(1)

	if (!post) {
		return Response.json({ error: "Blog post not found" }, { status: 404 })
	}

	return Response.json({ post })
}

export const GET = withStorefrontAuth(handleGet)
export const OPTIONS = handleCorsOptions
