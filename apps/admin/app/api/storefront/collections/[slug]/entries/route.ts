import { type NextRequest } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { contentCollections, contentEntries } from "@quickdash/db/schema"
import type { CollectionSchema } from "@quickdash/db/schema"
import { withStorefrontAuth, handleCorsOptions, storefrontError, type StorefrontContext } from "@/lib/storefront-auth"

/**
 * POST /api/storefront/collections/:slug/entries - Public submit an entry
 *
 * Requires collection.allowPublicSubmit === true
 * Entry is created with isActive based on collection.publicSubmitStatus
 */
async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	const slug = request.nextUrl.pathname.split("/").slice(-2, -1)[0]!

	// Find the collection
	const [collection] = await db
		.select()
		.from(contentCollections)
		.where(
			and(
				eq(contentCollections.workspaceId, storefront.workspaceId),
				eq(contentCollections.slug, slug),
				eq(contentCollections.isActive, true)
			)
		)
		.limit(1)

	if (!collection) {
		return storefrontError("Collection not found", 404)
	}

	if (!collection.allowPublicSubmit) {
		return storefrontError("Public submissions are not enabled for this collection", 403)
	}

	let body: Record<string, unknown>
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	// Validate required fields
	const schema = collection.schema as CollectionSchema
	const errors: string[] = []
	for (const field of schema.fields) {
		if (field.required && (body[field.key] === undefined || body[field.key] === null || body[field.key] === "")) {
			errors.push(`${field.label} is required`)
		}
	}

	if (errors.length > 0) {
		return storefrontError(errors.join(", "), 400)
	}

	// Only keep data fields that are defined in the schema
	const validKeys = new Set(schema.fields.map((f) => f.key))
	const cleanData: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(body)) {
		if (validKeys.has(key)) {
			cleanData[key] = value
		}
	}

	// Determine initial active status
	const isActive = collection.publicSubmitStatus === "active"

	const [entry] = await db
		.insert(contentEntries)
		.values({
			collectionId: collection.id,
			workspaceId: storefront.workspaceId,
			data: cleanData,
			isActive,
		})
		.returning()

	return Response.json({
		entry: {
			id: entry.id,
			data: entry.data,
			createdAt: entry.createdAt,
		},
	}, { status: 201 })
}

export const POST = withStorefrontAuth(handlePost)
export const OPTIONS = handleCorsOptions
