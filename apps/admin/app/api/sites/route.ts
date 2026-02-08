import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@quickdash/db/client"
import { eq, and, desc } from "@quickdash/db/drizzle"
import {
	connectedSites,
	storefronts,
	workspaceMembers,
	users,
} from "@quickdash/db/schema"

/**
 * GET /api/sites
 *
 * List connected sites for a workspace.
 *
 * Query params:
 * - workspaceId: The workspace to list sites for
 */
export async function GET(request: Request) {
	// Verify user is authenticated
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { searchParams } = new URL(request.url)
	const workspaceId = searchParams.get("workspaceId")

	if (!workspaceId) {
		return NextResponse.json(
			{ error: "Missing workspaceId" },
			{ status: 400 }
		)
	}

	// Verify user has access to this workspace
	const [membership] = await db
		.select()
		.from(workspaceMembers)
		.where(
			and(
				eq(workspaceMembers.workspaceId, workspaceId),
				eq(workspaceMembers.userId, session.user.id)
			)
		)
		.limit(1)

	if (!membership) {
		return NextResponse.json(
			{ error: "You don't have access to this workspace" },
			{ status: 403 }
		)
	}

	// Fetch connected sites with storefront info
	const sites = await db
		.select({
			id: connectedSites.id,
			name: connectedSites.name,
			githubRepoFullName: connectedSites.githubRepoFullName,
			githubRepoUrl: connectedSites.githubRepoUrl,
			githubDefaultBranch: connectedSites.githubDefaultBranch,
			githubAccountLogin: connectedSites.githubAccountLogin,
			framework: connectedSites.framework,
			frameworkVersion: connectedSites.frameworkVersion,
			deploymentPlatform: connectedSites.deploymentPlatform,
			productionUrl: connectedSites.productionUrl,
			status: connectedSites.status,
			lastSyncAt: connectedSites.lastSyncAt,
			lastError: connectedSites.lastError,
			createdAt: connectedSites.createdAt,
			storefrontId: storefronts.id,
			storefrontName: storefronts.name,
			storefrontApiKey: storefronts.apiKey,
			storefrontIsActive: storefronts.isActive,
			connectedByName: users.name,
		})
		.from(connectedSites)
		.leftJoin(storefronts, eq(connectedSites.storefrontId, storefronts.id))
		.leftJoin(users, eq(connectedSites.connectedBy, users.id))
		.where(eq(connectedSites.workspaceId, workspaceId))
		.orderBy(desc(connectedSites.createdAt))

	return NextResponse.json({
		sites: sites.map((site) => ({
			id: site.id,
			name: site.name,
			repo: {
				fullName: site.githubRepoFullName,
				url: site.githubRepoUrl,
				branch: site.githubDefaultBranch,
				connectedBy: site.githubAccountLogin,
			},
			framework: site.framework,
			frameworkVersion: site.frameworkVersion,
			deploymentPlatform: site.deploymentPlatform,
			productionUrl: site.productionUrl,
			status: site.status,
			lastSyncAt: site.lastSyncAt,
			lastError: site.lastError,
			createdAt: site.createdAt,
			storefront: site.storefrontId
				? {
						id: site.storefrontId,
						name: site.storefrontName,
						apiKey: site.storefrontApiKey,
						isActive: site.storefrontIsActive,
				  }
				: null,
			connectedBy: site.connectedByName,
		})),
	})
}

/**
 * DELETE /api/sites
 *
 * Disconnect a site from a workspace.
 *
 * Query params:
 * - siteId: The site to disconnect
 */
export async function DELETE(request: Request) {
	// Verify user is authenticated
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { searchParams } = new URL(request.url)
	const siteId = searchParams.get("siteId")

	if (!siteId) {
		return NextResponse.json({ error: "Missing siteId" }, { status: 400 })
	}

	// Get the site
	const [site] = await db
		.select()
		.from(connectedSites)
		.where(eq(connectedSites.id, siteId))
		.limit(1)

	if (!site) {
		return NextResponse.json({ error: "Site not found" }, { status: 404 })
	}

	// Verify user has access to this workspace
	const [membership] = await db
		.select()
		.from(workspaceMembers)
		.where(
			and(
				eq(workspaceMembers.workspaceId, site.workspaceId),
				eq(workspaceMembers.userId, session.user.id)
			)
		)
		.limit(1)

	if (!membership || !["owner", "admin"].includes(membership.role)) {
		return NextResponse.json(
			{ error: "You don't have permission to disconnect this site" },
			{ status: 403 }
		)
	}

	// Delete the connected site (storefront is preserved for historical orders)
	await db.delete(connectedSites).where(eq(connectedSites.id, siteId))

	// Optionally deactivate the storefront
	if (site.storefrontId) {
		await db
			.update(storefronts)
			.set({ isActive: false })
			.where(eq(storefronts.id, site.storefrontId))
	}

	return NextResponse.json({ success: true })
}
