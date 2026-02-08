import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and, desc, count, ilike } from "@quickdash/db/drizzle"
import { blogPosts, users } from "@quickdash/db/schema"
import { withStorefrontAuth, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"

/**
 * GET /api/storefront/blog - List published blog posts
 */
async function handleGet(request: NextRequest, storefront: StorefrontContext) {
	const { searchParams } = new URL(request.url)
	const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
	const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
	const offset = (page - 1) * limit
	const tag = searchParams.get("tag")
	const search = searchParams.get("search")

	const conditions = [
		eq(blogPosts.workspaceId, storefront.workspaceId),
		eq(blogPosts.status, "published"),
	]

	if (search) {
		conditions.push(ilike(blogPosts.title, `%${search}%`))
	}

	const [{ total }] = await db
		.select({ total: count() })
		.from(blogPosts)
		.where(and(...conditions))

	let posts = await db
		.select({
			id: blogPosts.id,
			title: blogPosts.title,
			slug: blogPosts.slug,
			excerpt: blogPosts.excerpt,
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
		.where(and(...conditions))
		.orderBy(desc(blogPosts.publishedAt))
		.limit(limit)
		.offset(offset)

	if (tag) {
		posts = posts.filter((p) => {
			const tags = p.tags as string[] | null
			return tags?.includes(tag)
		})
	}

	const totalPages = Math.ceil(Number(total) / limit)

	return Response.json({
		posts,
		pagination: {
			page,
			limit,
			totalCount: Number(total),
			totalPages,
			hasMore: page < totalPages,
		},
	})
}

export const GET = withStorefrontAuth(handleGet)
export const OPTIONS = handleCorsOptions
