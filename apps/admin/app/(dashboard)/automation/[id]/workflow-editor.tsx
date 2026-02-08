"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
	ReactFlow,
	Background,
	Controls,
	applyNodeChanges,
	applyEdgeChanges,
	useReactFlow,
	ReactFlowProvider,
	type Node,
	type Edge,
	type Connection,
	type NodeTypes,
	type NodeChange,
	type EdgeChange,
	Handle,
	Position,
	BackgroundVariant,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { HugeiconsIcon } from "@hugeicons/react"
import {
	PlayIcon,
	Cancel01Icon,
	Tick01Icon,
	Clock01Icon,
	FilterIcon,
	FlashIcon,
	WorkflowSquare03Icon,
	ArrowRight01Icon,
	TestTube01Icon,
	ShoppingCartCheck01Icon,
	CreditCardIcon,
	PackageDeliveredIcon,
	CancelCircleIcon,
	MoneyReceive01Icon,
	UserAdd01Icon,
	UserEdit01Icon,
	Tag01Icon,
	PackageAddIcon,
	Edit01Icon,
	Alert01Icon,
	PackageRemoveIcon,
	CheckmarkCircle02Icon,
	RefreshIcon,
	CreditCardNotFoundIcon,
	ThumbsUpIcon,
	Flag01Icon,
	AuctionIcon,
	TimerIcon,
	HourglassIcon,
	CalendarCheckIn01Icon,
	Cursor01Icon,
	MailSend01Icon,
	FileEditIcon,
	SmartPhone01Icon,
	MessageEdit01Icon,
	Tag02Icon,
	NoteEditIcon,
	Layers01Icon,
	WebhookIcon,
	SlackIcon,
	PauseIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useSidebarMode } from "@/lib/sidebar-mode"
import { WorkflowProvider, useWorkflowStore } from "@/lib/workflow-context"
import { usePusher } from "@/components/pusher-provider"
import {
	createWorkflow,
	updateWorkflow,
	toggleWorkflow,
} from "../actions"
import type { Workflow, WorkflowTrigger } from "@quickdash/db/schema"

const TRIGGER_ICONS: Record<string, typeof FlashIcon> = {
	"order.created": ShoppingCartCheck01Icon,
	"order.paid": CreditCardIcon,
	"order.fulfilled": PackageDeliveredIcon,
	"order.cancelled": CancelCircleIcon,
	"order.refunded": MoneyReceive01Icon,
	"customer.created": UserAdd01Icon,
	"customer.updated": UserEdit01Icon,
	"customer.tag_added": Tag01Icon,
	"product.created": PackageAddIcon,
	"product.updated": Edit01Icon,
	"product.low_stock": Alert01Icon,
	"product.out_of_stock": PackageRemoveIcon,
	"subscription.created": CheckmarkCircle02Icon,
	"subscription.renewed": RefreshIcon,
	"subscription.cancelled": CancelCircleIcon,
	"subscription.payment_failed": CreditCardNotFoundIcon,
	"review.created": Edit01Icon,
	"review.approved": ThumbsUpIcon,
	"review.reported": Flag01Icon,
	"auction.started": PlayIcon,
	"auction.bid_placed": AuctionIcon,
	"auction.ending_soon": TimerIcon,
	"auction.ended": HourglassIcon,
	"schedule.cron": CalendarCheckIn01Icon,
	"schedule.interval": Clock01Icon,
	"manual.trigger": Cursor01Icon,
}

const ACTION_ICONS: Record<string, typeof FlashIcon> = {
	"email.send": MailSend01Icon,
	"email.send_template": FileEditIcon,
	"notification.push": SmartPhone01Icon,
	"notification.sms": MessageEdit01Icon,
	"customer.add_tag": Tag01Icon,
	"customer.remove_tag": Tag02Icon,
	"customer.update_field": UserEdit01Icon,
	"order.add_note": NoteEditIcon,
	"order.update_status": Edit01Icon,
	"product.update_stock": Layers01Icon,
	"webhook.send": WebhookIcon,
	"slack.send_message": SlackIcon,
	"condition.if": FilterIcon,
	"delay.wait": PauseIcon,
	"delay.wait_until": CalendarCheckIn01Icon,
}

function getExecutionClass(status: string | undefined) {
	switch (status) {
		case "success": return "workflow-node-success"
		case "error": return "workflow-node-error"
		default: return ""
	}
}

// Border trace animation - single segment with faded tail like Tailspin loader
function TracingBorder({ children, isExecuting }: { children: React.ReactNode; isExecuting: boolean }) {
	return (
		<div className="relative">
			{children}
			{isExecuting && (
				<svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
					<defs>
						<linearGradient id="tailGradient" gradientUnits="userSpaceOnUse">
							<stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
							<stop offset="40%" stopColor="#22c55e" stopOpacity="0.6" />
							<stop offset="100%" stopColor="#22c55e" stopOpacity="1" />
						</linearGradient>
					</defs>
					<rect
						x="0"
						y="0"
						width="100%"
						height="100%"
						rx="12"
						ry="12"
						fill="none"
						stroke="url(#tailGradient)"
						strokeWidth="3"
						strokeDasharray="150 450"
						strokeLinecap="round"
						style={{ animation: "traceBorder 1.5s linear infinite" }}
					/>
				</svg>
			)}
		</div>
	)
}

function TriggerNode({ id, data, selected }: { id: string; data: { label: string; trigger: string; category?: string; _execStatus?: string }; selected?: boolean }) {
	const execStatus = data._execStatus
	const Icon = TRIGGER_ICONS[data.trigger] || FlashIcon
	const isExecuting = execStatus === "executing"

	return (
		<TracingBorder isExecuting={isExecuting}>
			<div className={cn(
				"px-4 py-3 rounded-xl bg-primary text-primary-foreground shadow-lg min-w-[200px] transition-all",
				selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
				getExecutionClass(execStatus)
			)}>
				<div className="flex items-center gap-2 mb-1">
					<div className="size-6 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
						<HugeiconsIcon icon={Icon} size={14} />
					</div>
					<span className="text-xs font-medium opacity-80">Trigger</span>
				</div>
				<div className="font-semibold">{data.label}</div>
				{data.category && <div className="text-xs opacity-70 mt-1">{data.category}</div>}
				<Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-primary-foreground !border-2 !border-primary" />
			</div>
		</TracingBorder>
	)
}

function ActionNode({ id, data, selected }: { id: string; data: { label: string; action: string; category?: string; _execStatus?: string }; selected?: boolean }) {
	const execStatus = data._execStatus
	const Icon = ACTION_ICONS[data.action] || ArrowRight01Icon
	const isExecuting = execStatus === "executing"

	return (
		<TracingBorder isExecuting={isExecuting}>
			<div className={cn(
				"px-4 py-3 rounded-xl bg-card border-2 shadow-lg min-w-[200px] transition-all",
				selected ? "border-primary ring-2 ring-primary/20" : "border-border",
				getExecutionClass(execStatus)
			)}>
				<Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-primary !border-2 !border-background" />
				<div className="flex items-center gap-2 mb-1">
					<div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center">
						<HugeiconsIcon icon={Icon} size={14} className="text-primary" />
					</div>
					<span className="text-xs font-medium text-muted-foreground">Action</span>
				</div>
				<div className="font-semibold">{data.label}</div>
				{data.category && <div className="text-xs text-muted-foreground mt-1">{data.category}</div>}
				<Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-primary !border-2 !border-background" />
			</div>
		</TracingBorder>
	)
}

function ConditionNode({ id, data, selected }: { id: string; data: { label: string; action?: string; _execStatus?: string }; selected?: boolean }) {
	const execStatus = data._execStatus
	const isExecuting = execStatus === "executing"

	return (
		<TracingBorder isExecuting={isExecuting}>
			<div className={cn(
				"px-4 py-3 rounded-xl bg-amber-500 dark:bg-amber-600 text-white shadow-lg min-w-[200px] transition-all",
				selected && "ring-2 ring-amber-500 ring-offset-2 ring-offset-background",
				getExecutionClass(execStatus)
			)}>
				<Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-white !border-2 !border-amber-500" />
				<div className="flex items-center gap-2 mb-1">
					<div className="size-6 rounded-lg bg-white/20 flex items-center justify-center">
						<HugeiconsIcon icon={FilterIcon} size={14} />
					</div>
					<span className="text-xs font-medium opacity-80">Condition</span>
				</div>
				<div className="font-semibold">{data.label}</div>
				<div className="flex justify-between mt-2 text-xs">
					<span className="bg-green-500/30 px-2 py-0.5 rounded">Yes</span>
					<span className="bg-red-500/30 px-2 py-0.5 rounded">No</span>
				</div>
				<Handle type="source" position={Position.Bottom} id="yes" style={{ left: "25%" }} className="!w-3 !h-3 !bg-green-400 !border-2 !border-white" />
				<Handle type="source" position={Position.Bottom} id="no" style={{ left: "75%" }} className="!w-3 !h-3 !bg-red-400 !border-2 !border-white" />
			</div>
		</TracingBorder>
	)
}

function DelayNode({ id, data, selected }: { id: string; data: { label: string; action?: string; _execStatus?: string }; selected?: boolean }) {
	const execStatus = data._execStatus
	const Icon = data.action ? (ACTION_ICONS[data.action] || Clock01Icon) : Clock01Icon
	const isExecuting = execStatus === "executing"

	return (
		<TracingBorder isExecuting={isExecuting}>
			<div className={cn(
				"px-4 py-3 rounded-xl bg-sky-500 dark:bg-sky-600 text-white shadow-lg min-w-[200px] transition-all",
				selected && "ring-2 ring-sky-500 ring-offset-2 ring-offset-background",
				getExecutionClass(execStatus)
			)}>
				<Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-white !border-2 !border-sky-500" />
				<div className="flex items-center gap-2 mb-1">
					<div className="size-6 rounded-lg bg-white/20 flex items-center justify-center">
						<HugeiconsIcon icon={Icon} size={14} />
					</div>
					<span className="text-xs font-medium opacity-80">Delay</span>
				</div>
				<div className="font-semibold">{data.label}</div>
				<Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-white !border-2 !border-sky-500" />
			</div>
		</TracingBorder>
	)
}

const nodeTypes: NodeTypes = {
	trigger: TriggerNode,
	action: ActionNode,
	condition: ConditionNode,
	delay: DelayNode,
}

const defaultEdgeOptions = {
	type: "default" as const,
	style: { strokeWidth: 2, stroke: "#888" },
}

function WorkflowCanvas() {
	const router = useRouter()
	const { fitView } = useReactFlow()
	const workflow = useWorkflowStore()!

	const isNew = !workflow.workflow
	const rawNodes = workflow.nodes
	const rawEdges = workflow.edges

	const nodes = React.useMemo(() => {
		return rawNodes.map((node) => {
			const execStatus = workflow.execution.nodeStatuses[node.id]
			if (execStatus) {
				return { ...node, data: { ...node.data, _execStatus: execStatus } }
			}
			return node
		})
	}, [rawNodes, workflow.execution.nodeStatuses])

	const edges = React.useMemo(() => {
		return rawEdges.map((edge) => {
			const isActive = workflow.execution.activeEdges.has(edge.id)
			const targetStatus = workflow.execution.nodeStatuses[edge.target]
			const isSuccess = targetStatus === "success"
			const isError = targetStatus === "error"
			let className = ""
			if (isActive) className = "workflow-edge-active"
			else if (isSuccess) className = "workflow-edge-success"
			else if (isError) className = "workflow-edge-error"
			return className ? { ...edge, className } : edge
		})
	}, [rawEdges, workflow.execution.activeEdges, workflow.execution.nodeStatuses])

	const onNodesChange = React.useCallback((changes: NodeChange<Node>[]) => {
		workflow.setNodes((nds) => applyNodeChanges(changes, nds))
	}, [workflow])

	const onEdgesChange = React.useCallback((changes: EdgeChange<Edge>[]) => {
		workflow.setEdges((eds) => applyEdgeChanges(changes, eds))
	}, [workflow])

	const prevNodeCount = React.useRef(nodes.length)
	React.useEffect(() => {
		if (nodes.length > prevNodeCount.current) {
			setTimeout(() => fitView({ padding: 0.2 }), 50)
		}
		prevNodeCount.current = nodes.length
	}, [nodes.length, fitView])

	const onConnect = React.useCallback((params: Connection) => {
		if (!params.source || !params.target) return
		workflow.setEdges((eds) => {
			const exists = eds.some((e) => e.source === params.source && e.target === params.target)
			if (exists) return eds
			const newEdge: Edge = {
				id: `edge-${params.source}-${params.target}`,
				source: params.source,
				target: params.target,
				sourceHandle: params.sourceHandle ?? undefined,
				targetHandle: params.targetHandle ?? undefined,
			}
			return [...eds, newEdge]
		})
	}, [workflow])

	const onNodeClick = React.useCallback((_: React.MouseEvent, node: Node) => {
		workflow.setSelectedNode(node)
	}, [workflow])

	const handleSave = async (activate = false) => {
		if (!workflow.name.trim()) {
			toast.error("Workflow name is required")
			return
		}
		const trigger = nodes.find((n) => n.type === "trigger")
		if (!trigger) {
			toast.error("Add a trigger to save this workflow")
			return
		}
		workflow.setSaving(true)
		try {
			if (isNew) {
				const triggerValue = (trigger.data as { trigger: string }).trigger as WorkflowTrigger
				const newWorkflow = await createWorkflow({
					name: workflow.name.trim(),
					description: workflow.description.trim() || undefined,
					trigger: triggerValue,
				})
				await updateWorkflow(newWorkflow.id, { nodes: rawNodes, edges: rawEdges, isDraft: !activate })
				if (activate) await toggleWorkflow(newWorkflow.id, true)
				toast.success(activate ? "Workflow created and activated!" : "Workflow saved!")
				router.push(`/automation/${newWorkflow.id}`)
				router.refresh()
			} else {
				const triggerValue = (trigger.data as { trigger: string }).trigger as WorkflowTrigger
				await updateWorkflow(workflow.workflow!.id, {
					name: workflow.name.trim(),
					description: workflow.description.trim() || undefined,
					trigger: triggerValue,
					nodes: rawNodes,
					edges: rawEdges,
					isDraft: !activate && !workflow.isActive,
				})
				if (activate && !workflow.isActive) {
					await toggleWorkflow(workflow.workflow!.id, true)
					workflow.setIsActive(true)
				}
				toast.success("Workflow saved!")
				router.refresh()
			}
			workflow.setHasChanges(false)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to save")
		} finally {
			workflow.setSaving(false)
		}
	}

	const handleToggleActive = async () => {
		if (!workflow.workflow) return
		try {
			await toggleWorkflow(workflow.workflow.id, !workflow.isActive)
			workflow.setIsActive(!workflow.isActive)
			toast.success(workflow.isActive ? "Workflow paused" : "Workflow activated")
			router.refresh()
		} catch {
			toast.error("Failed to update workflow")
		}
	}

	const onNodesDelete = React.useCallback((nodesToDelete: Node[]) => {
		const deletableNodes = nodesToDelete.filter((n) => n.type !== "trigger")
		if (deletableNodes.length === 0) return
		const nodeIds = new Set(deletableNodes.map((n) => n.id))
		workflow.setNodes((nds) => nds.filter((n) => !nodeIds.has(n.id)))
		workflow.setEdges((eds) => eds.filter((e) => !nodeIds.has(e.source) && !nodeIds.has(e.target)))
		workflow.setSelectedNode(null)
	}, [workflow])

	const [showEmptyHint, setShowEmptyHint] = React.useState(true)

	return (
		<TooltipProvider>
			<div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden -m-4 -mt-0" tabIndex={-1}>
				<div className="flex items-center justify-between px-8 py-2 border-b bg-background z-10">
					<div className="flex items-center gap-3">
						<Input
							value={workflow.name}
							onChange={(e) => workflow.setName(e.target.value)}
							className="h-8 w-64 border-none shadow-none font-semibold focus-visible:ring-1"
							placeholder="Workflow name..."
						/>
						{workflow.workflow && (
							<>
								{workflow.workflow.isDraft ? (
									<Badge variant="secondary">Draft</Badge>
								) : workflow.isActive ? (
									<Badge className="bg-green-500">Active</Badge>
								) : (
									<Badge variant="outline">Paused</Badge>
								)}
							</>
						)}
						{workflow.hasChanges && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
					</div>
					<div className="flex items-center gap-2">
						{workflow.hasTrigger && rawEdges.length > 0 && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										disabled={workflow.execution.isExecuting}
										onClick={() => workflow.simulateExecution()}
									>
										<HugeiconsIcon icon={PlayIcon} size={14} className="mr-1" />
										{workflow.execution.isExecuting ? "Running..." : "Simulate"}
									</Button>
								</TooltipTrigger>
								<TooltipContent>Visualize workflow execution</TooltipContent>
							</Tooltip>
						)}
						{workflow.workflow && workflow.isActive && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										onClick={async () => {
											const trigger = nodes.find((n) => n.type === "trigger")
											if (!trigger) return
											const triggerType = (trigger.data as { trigger: string }).trigger
											try {
												let res: Response
												if (triggerType === "manual.trigger") {
													res = await fetch("/api/workflows/test", {
														method: "POST",
														headers: { "Content-Type": "application/json" },
														body: JSON.stringify({ type: "manual", workflowId: workflow.workflow!.id }),
													})
												} else {
													res = await fetch("/api/workflows/test", {
														method: "POST",
														headers: { "Content-Type": "application/json" },
														body: JSON.stringify({ type: triggerType }),
													})
												}
												const data = await res.json()
												console.log("[Test Response]", data)
												if (data.debug) {
													const count = data.debug.activeMatchingWorkflows
													if (count === 0) {
														toast.error(`No active workflows found with trigger "${data.debug.trigger}"`)
													} else {
														toast.success(`Event sent! ${count} workflow(s) will execute`)
													}
												} else {
													toast.success("Test event triggered!")
												}
											} catch (err) {
												console.error("[Test Error]", err)
												toast.error("Failed to trigger test event")
											}
										}}
									>
										<HugeiconsIcon icon={TestTube01Icon} size={14} className="mr-1" />
										Test
									</Button>
								</TooltipTrigger>
								<TooltipContent>Trigger real test event</TooltipContent>
							</Tooltip>
						)}
						{workflow.workflow && !workflow.workflow.isDraft && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="outline" size="sm" onClick={handleToggleActive}>
										{workflow.isActive ? (
											<><HugeiconsIcon icon={Cancel01Icon} size={14} className="mr-1" />Pause</>
										) : (
											<><HugeiconsIcon icon={PlayIcon} size={14} className="mr-1" />Activate</>
										)}
									</Button>
								</TooltipTrigger>
								<TooltipContent>{workflow.isActive ? "Pause workflow" : "Activate workflow"}</TooltipContent>
							</Tooltip>
						)}
						<Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={workflow.saving || !workflow.hasTrigger}>
							{workflow.saving ? "Saving..." : "Save"}
						</Button>
						<Button size="sm" onClick={() => handleSave(true)} disabled={workflow.saving || !workflow.hasTrigger}>
							<HugeiconsIcon icon={Tick01Icon} size={14} className="mr-1" />
							{workflow.saving ? "Saving..." : "Save & Activate"}
						</Button>
					</div>
				</div>

				<div className="flex-1 relative">
					<ReactFlow
						nodes={nodes}
						edges={edges}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onNodesDelete={onNodesDelete}
						onConnect={onConnect}
						onNodeClick={onNodeClick}
						nodeTypes={nodeTypes}
						fitView
						snapToGrid
						snapGrid={[20, 20]}
						deleteKeyCode={["Backspace", "Delete"]}
						defaultEdgeOptions={defaultEdgeOptions}
						proOptions={{ hideAttribution: true }}
						className="bg-muted/30"
					>
						<Background variant={BackgroundVariant.Dots} gap={20} size={1} className="[&>pattern>circle]:fill-muted-foreground/20" />
						<Controls
							position="bottom-right"
							className="!bg-card !border !border-border !rounded-lg !shadow-none !right-4 !bottom-4 [&>button]:!bg-card [&>button]:!border-0 [&>button]:!border-b [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted [&>button>svg]:!fill-current [&>button:last-child]:!border-b-0"
							style={{ overflow: "clip" }}
							showInteractive={false}
						/>
					</ReactFlow>

					{nodes.length === 0 && showEmptyHint && (
						<div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
							<div className="text-center bg-background/95 backdrop-blur-sm rounded-xl p-8 border shadow-lg max-w-sm pointer-events-auto">
								<HugeiconsIcon icon={WorkflowSquare03Icon} size={48} className="text-primary mx-auto mb-4" />
								<h3 className="text-lg font-semibold mb-2">Build Your Workflow</h3>
								<p className="text-sm text-muted-foreground mb-6">Choose a trigger from the sidebar to begin.</p>
								<Button variant="outline" size="sm" onClick={() => setShowEmptyHint(false)}>Dismiss</Button>
							</div>
						</div>
					)}
				</div>
			</div>
		</TooltipProvider>
	)
}

function WorkflowEditorInner({ workflow }: { workflow: Workflow | null }) {
	const { setMode } = useSidebarMode()
	const store = useWorkflowStore()
	const { pusher } = usePusher()

	React.useEffect(() => {
		setMode("workflow")
		return () => setMode("normal")
	}, [setMode])

	// Subscribe to real-time workflow execution events
	// Use refs to avoid re-subscribing when store changes
	const storeRef = React.useRef(store)
	storeRef.current = store

	React.useEffect(() => {
		if (!pusher || !workflow?.id) return

		console.log(`[Workflow] Subscribing to channel: workflow-${workflow.id}`)
		const channel = pusher.subscribe(`workflow-${workflow.id}`)

		channel.bind("node-status", (data: { nodeId: string; status: string; runId: string }) => {
			console.log("[Workflow] Received node-status:", data)
			const s = storeRef.current
			if (!s) return
			// Update node execution status
			if (data.status === "executing") {
				s.startExecution()
			}
			s.setNodeStatus(data.nodeId, data.status as "executing" | "success" | "error")
		})

		channel.bind("edge-active", (data: { edgeId: string; active: boolean; runId: string }) => {
			console.log("[Workflow] Received edge-active:", data)
			const s = storeRef.current
			if (!s) return
			s.setEdgeActive(data.edgeId, data.active)
		})

		channel.bind("workflow-complete", (data: unknown) => {
			console.log("[Workflow] Received workflow-complete:", data)
			const s = storeRef.current
			if (!s) return
			// Keep success states visible for a moment, then clear
			setTimeout(() => s.stopExecution(), 2000)
		})

		return () => {
			console.log(`[Workflow] Unsubscribing from channel: workflow-${workflow.id}`)
			channel.unbind_all()
			pusher.unsubscribe(`workflow-${workflow.id}`)
		}
	}, [pusher, workflow?.id])

	if (!store) {
		return (
			<div className="flex items-center justify-center h-[calc(100vh-64px)] overflow-hidden -m-4 -mt-0">
				<span className="text-muted-foreground">Loading...</span>
			</div>
		)
	}

	return <WorkflowCanvas />
}

interface WorkflowEditorProps {
	workflow: Workflow | null
}

export function WorkflowEditor({ workflow }: WorkflowEditorProps) {
	return (
		<WorkflowProvider workflow={workflow}>
			<ReactFlowProvider>
				<WorkflowEditorInner workflow={workflow} />
			</ReactFlowProvider>
		</WorkflowProvider>
	)
}
