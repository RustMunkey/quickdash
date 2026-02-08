"use server"

import { nanoid } from "nanoid"
import { eq, and, isNull, count, inArray } from "@quickdash/db/drizzle"
import { db } from "@quickdash/db/client"
import { users, workspaceInvites, workspaceMembers } from "@quickdash/db/schema"
import { logAudit } from "@/lib/audit"
import { sendTemplateEmail } from "@/lib/send-email"
import { requireWorkspace, checkWorkspacePermission } from "@/lib/workspace"

async function requireTeamPermission() {
	const workspace = await requireWorkspace()
	// Only workspace owners and admins can manage team
	if (workspace.role !== "owner" && workspace.role !== "admin") {
		throw new Error("Only owners and admins can manage the team")
	}
	return workspace
}

export async function getTeamMembers(params?: { page?: number; pageSize?: number }) {
	const workspace = await requireWorkspace()
	const { page = 1, pageSize = 25 } = params ?? {}
	const offset = (page - 1) * pageSize

	const whereClause = eq(workspaceMembers.workspaceId, workspace.id)

	const [items, [countResult]] = await Promise.all([
		db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				image: users.image,
				role: workspaceMembers.role,
				joinedAt: workspaceMembers.joinedAt,
			})
			.from(workspaceMembers)
			.innerJoin(users, eq(users.id, workspaceMembers.userId))
			.where(whereClause)
			.orderBy(workspaceMembers.role, users.name)
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: count() })
			.from(workspaceMembers)
			.where(whereClause),
	])

	return { items, totalCount: countResult.count }
}

export async function getPendingInvites() {
	const workspace = await requireWorkspace()
	return db
		.select()
		.from(workspaceInvites)
		.where(and(eq(workspaceInvites.workspaceId, workspace.id), isNull(workspaceInvites.acceptedAt)))
}

export async function createInvite(email: string, role: string) {
	const workspace = await requireTeamPermission()

	// Check if user already exists in this workspace
	const [existingUser] = await db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.limit(1)

	if (existingUser) {
		// Check if user is already a member of this workspace
		const [existingMember] = await db
			.select()
			.from(workspaceMembers)
			.where(and(eq(workspaceMembers.userId, existingUser.id), eq(workspaceMembers.workspaceId, workspace.id)))
			.limit(1)

		if (existingMember) {
			throw new Error("User is already a member of this workspace")
		}
	}

	// Check if invite already exists for this workspace
	const [existingInvite] = await db
		.select()
		.from(workspaceInvites)
		.where(and(eq(workspaceInvites.email, email), eq(workspaceInvites.workspaceId, workspace.id), isNull(workspaceInvites.acceptedAt)))
		.limit(1)

	if (existingInvite) {
		throw new Error("Invite already sent to this email")
	}

	const token = nanoid(32)
	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

	// Get current user info for the email
	const [currentUser] = await db
		.select({ name: users.name })
		.from(users)
		.where(eq(users.id, workspace.userId))
		.limit(1)

	const [invite] = await db
		.insert(workspaceInvites)
		.values({
			workspaceId: workspace.id,
			email,
			role: role as "owner" | "admin" | "member" | "viewer",
			invitedBy: workspace.userId,
			token,
			expiresAt,
		})
		.returning()

	await logAudit({
		action: "invite.created",
		targetType: "invite",
		targetId: invite.id,
		targetLabel: email,
		metadata: { role },
	})

	// Send invite email (gracefully fails if Resend not configured)
	const loginUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001"
	await sendTemplateEmail({
		to: email,
		templateSlug: "team-invite",
		variables: {
			invitee_email: email,
			inviter_name: currentUser?.name || "A team member",
			role,
			login_url: `${loginUrl}/sign-in`,
		},
		sentBy: workspace.userId,
	}).catch(() => {})

	return invite
}

export async function revokeInvite(inviteId: string) {
	const workspace = await requireTeamPermission()

	const [invite] = await db
		.select()
		.from(workspaceInvites)
		.where(and(eq(workspaceInvites.id, inviteId), eq(workspaceInvites.workspaceId, workspace.id)))
		.limit(1)

	if (!invite) throw new Error("Invite not found")

	await db.delete(workspaceInvites).where(and(eq(workspaceInvites.id, inviteId), eq(workspaceInvites.workspaceId, workspace.id)))

	await logAudit({
		action: "invite.revoked",
		targetType: "invite",
		targetId: inviteId,
		targetLabel: invite?.email,
	})
}

export async function updateMemberRole(userId: string, role: string) {
	const workspace = await requireTeamPermission()

	if (role !== "admin" && role !== "member" && role !== "viewer") {
		throw new Error("Invalid role")
	}

	// Get the workspace member
	const [member] = await db
		.select()
		.from(workspaceMembers)
		.innerJoin(users, eq(users.id, workspaceMembers.userId))
		.where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspace.id)))
		.limit(1)

	if (!member) throw new Error("Member not found")

	// Can't change workspace owner's role
	if (member.workspace_members.role === "owner") {
		throw new Error("Cannot change owner role")
	}

	await db
		.update(workspaceMembers)
		.set({ role })
		.where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspace.id)))

	await logAudit({
		action: "member.role_changed",
		targetType: "member",
		targetId: userId,
		targetLabel: member.users?.name ?? member.users?.email,
		metadata: { previousRole: member.workspace_members.role, newRole: role },
	})
}

export async function removeMember(userId: string) {
	const workspace = await requireTeamPermission()

	// Get the workspace member
	const [member] = await db
		.select()
		.from(workspaceMembers)
		.innerJoin(users, eq(users.id, workspaceMembers.userId))
		.where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspace.id)))
		.limit(1)

	if (!member) throw new Error("Member not found")

	// Can't remove workspace owner
	if (member.workspace_members.role === "owner") {
		throw new Error("Cannot remove workspace owner")
	}

	// Remove from workspace (don't delete the user entirely)
	await db
		.delete(workspaceMembers)
		.where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspace.id)))

	await logAudit({
		action: "member.removed",
		targetType: "member",
		targetId: userId,
		targetLabel: member.users?.name ?? member.users?.email,
	})
}

export async function bulkRemoveMembers(userIds: string[]) {
	const workspace = await requireTeamPermission()

	// Don't allow removing owners
	const owners = await db
		.select({ userId: workspaceMembers.userId })
		.from(workspaceMembers)
		.where(and(
			eq(workspaceMembers.workspaceId, workspace.id),
			eq(workspaceMembers.role, "owner"),
			inArray(workspaceMembers.userId, userIds),
		))

	const ownerIds = new Set(owners.map((o) => o.userId))
	const safeIds = userIds.filter((id) => !ownerIds.has(id))

	if (safeIds.length === 0) {
		throw new Error("Cannot remove workspace owners")
	}

	await db
		.delete(workspaceMembers)
		.where(and(
			eq(workspaceMembers.workspaceId, workspace.id),
			inArray(workspaceMembers.userId, safeIds),
		))

	await logAudit({
		action: "member.bulk_removed",
		targetType: "member",
		targetId: safeIds.join(","),
		targetLabel: `${safeIds.length} members`,
	})
}
