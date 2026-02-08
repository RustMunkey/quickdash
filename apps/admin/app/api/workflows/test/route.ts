import { NextResponse } from "next/server"
import { db } from "@quickdash/db/client"
import { eq, and } from "@quickdash/db/drizzle"
import { workflows } from "@quickdash/db/schema"
import { emitOrderCreated, triggerWorkflowManually } from "@/lib/workflows"
import { requireWorkspace } from "@/lib/workspace"

// GET /api/workflows/test - List active workflows for testing
export async function GET() {
	try {
		const workspace = await requireWorkspace()

		const activeWorkflows = await db
			.select({
				id: workflows.id,
				name: workflows.name,
				trigger: workflows.trigger,
				isActive: workflows.isActive,
			})
			.from(workflows)
			.where(eq(workflows.workspaceId, workspace.id))

		return NextResponse.json({ workflows: activeWorkflows })
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Failed to fetch workflows" },
			{ status: 500 }
		)
	}
}

// POST /api/workflows/test - Trigger a test event
export async function POST(request: Request) {
	try {
		const workspace = await requireWorkspace()
		const body = await request.json()
		const { type, workflowId } = body

		if (type === "manual" && workflowId) {
			// Trigger a specific workflow manually
			await triggerWorkflowManually(workflowId, "test-user", {
				test: true,
				triggeredAt: new Date().toISOString(),
			})
			return NextResponse.json({ success: true, message: "Manual trigger sent" })
		}

		if (type === "order.created") {
			// Check for matching active workflows first
			const matchingWorkflows = await db
				.select({ id: workflows.id, name: workflows.name, isActive: workflows.isActive, trigger: workflows.trigger })
				.from(workflows)
				.where(eq(workflows.workspaceId, workspace.id))

			const activeMatching = matchingWorkflows.filter(
				(w) => w.isActive && w.trigger === "order.created"
			)

			console.log("[Test] Workspace:", workspace.id)
			console.log("[Test] All workflows:", matchingWorkflows)
			console.log("[Test] Active order.created workflows:", activeMatching)

			// Emit a fake order.created event
			await emitOrderCreated({
				workspaceId: workspace.id,
				orderId: "test-order-" + Date.now(),
				orderNumber: "ORD-TEST-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
				status: "pending",
				userId: "test-user-id",
				total: "99.99",
				subtotal: "89.99",
				items: [
					{
						productName: "Test Product",
						variantName: "Default",
						quantity: 1,
						unitPrice: "89.99",
					},
				],
				customer: {
					id: "test-user-id",
					email: "test@example.com",
					name: "Test Customer",
				},
			})
			return NextResponse.json({
				success: true,
				message: "order.created event emitted",
				debug: {
					workspaceId: workspace.id,
					trigger: "order.created",
					totalWorkflows: matchingWorkflows.length,
					activeMatchingWorkflows: activeMatching.length,
					matchingWorkflows: activeMatching,
					allWorkflows: matchingWorkflows,
				}
			})
		}

		return NextResponse.json({ error: "Invalid test type" }, { status: 400 })
	} catch (error) {
		console.error("Test workflow error:", error)
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Failed to trigger test" },
			{ status: 500 }
		)
	}
}
