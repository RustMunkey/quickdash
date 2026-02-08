"use client"

import * as React from "react"
import type { Node, Edge } from "@xyflow/react"
import type { Workflow, WorkflowTrigger, WorkflowAction } from "@quickdash/db/schema"

// Execution state for nodes during workflow test/run
export type NodeExecutionStatus = "idle" | "executing" | "success" | "error"

interface ExecutionState {
	nodeStatuses: Record<string, NodeExecutionStatus>
	activeEdges: Set<string>
	isExecuting: boolean
}

interface WorkflowState {
	// Workflow data
	workflow: Workflow | null
	name: string
	description: string
	isActive: boolean

	// React Flow state
	nodes: Node[]
	edges: Edge[]

	// Selected node
	selectedNode: Node | null

	// Save state
	hasChanges: boolean
	saving: boolean

	// Execution state
	execution: ExecutionState
}

interface WorkflowActions {
	setName: (name: string) => void
	setDescription: (desc: string) => void
	setIsActive: (active: boolean) => void
	setNodes: React.Dispatch<React.SetStateAction<Node[]>>
	setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
	addTriggerNode: (trigger: WorkflowTrigger, label: string, category: string) => void
	addActionNode: (action: WorkflowAction, label: string, category: string) => void
	setSelectedNode: (node: Node | null) => void
	setHasChanges: (has: boolean) => void
	setSaving: (saving: boolean) => void
	reset: () => void
	// Execution actions
	setNodeStatus: (nodeId: string, status: NodeExecutionStatus) => void
	setEdgeActive: (edgeId: string, active: boolean) => void
	startExecution: () => void
	stopExecution: () => void
	simulateExecution: () => Promise<void>
}

type WorkflowStore = WorkflowState & WorkflowActions & { hasTrigger: boolean }

// Global store - lives outside React
let globalStore: WorkflowStore | null = null
let listeners: Set<() => void> = new Set()

function notifyListeners() {
	listeners.forEach((listener) => listener())
}

export function setGlobalWorkflowStore(store: WorkflowStore | null) {
	globalStore = store
	notifyListeners()
}

export function getGlobalWorkflowStore() {
	return globalStore
}

// Hook to subscribe to the global store
export function useWorkflowStore() {
	const [, forceUpdate] = React.useReducer((x) => x + 1, 0)

	React.useEffect(() => {
		listeners.add(forceUpdate)
		return () => {
			listeners.delete(forceUpdate)
		}
	}, [])

	return globalStore
}

// Provider that sets up the store
interface WorkflowProviderProps {
	children: React.ReactNode
	workflow: Workflow | null
}

const initialExecutionState: ExecutionState = {
	nodeStatuses: {},
	activeEdges: new Set(),
	isExecuting: false,
}

// Default configurations for each action type
function getDefaultActionConfig(action: WorkflowAction): Record<string, unknown> {
	switch (action) {
		case "notification.push":
			return {
				userId: "{{customer.id}}",
				title: "New Order: {{order.orderNumber}}",
				body: "Order total: {{order.total}}",
				type: "order",
			}
		case "notification.sms":
			return {
				phoneNumber: "{{customer.phone}}",
				message: "Your order {{order.orderNumber}} has been received!",
			}
		case "email.send":
			return {
				to: "{{customer.email}}",
				subject: "Order {{order.orderNumber}} Confirmation",
				body: "Thank you for your order! Total: {{order.total}}",
			}
		case "email.send_template":
			return {
				to: "{{customer.email}}",
				templateId: "",
				variables: {},
			}
		case "customer.add_tag":
			return {
				customerId: "{{customer.id}}",
				tagId: "",
			}
		case "customer.remove_tag":
			return {
				customerId: "{{customer.id}}",
				tagId: "",
			}
		case "customer.update_field":
			return {
				customerId: "{{customer.id}}",
				field: "",
				value: "",
			}
		case "order.add_note":
			return {
				orderId: "{{order.orderId}}",
				note: "Processed by workflow",
			}
		case "order.update_status":
			return {
				orderId: "{{order.orderId}}",
				status: "processing",
			}
		case "product.update_stock":
			return {
				productId: "{{product.productId}}",
				operation: "decrement",
				amount: 1,
			}
		case "webhook.send":
			return {
				url: "",
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "{{triggerData}}",
			}
		case "slack.send_message":
			return {
				webhookUrl: "",
				message: "New order: {{order.orderNumber}} - {{order.total}}",
			}
		case "condition.if":
			return {
				rules: [],
				logic: "and",
			}
		case "delay.wait":
			return {
				duration: 5,
				unit: "minutes",
			}
		case "delay.wait_until":
			return {
				dateField: "order.createdAt",
				offset: 60,
			}
		default:
			return {}
	}
}

export function WorkflowProvider({ children, workflow }: WorkflowProviderProps) {
	// Form state
	const [name, setName] = React.useState(workflow?.name ?? "Untitled Workflow")
	const [description, setDescription] = React.useState(workflow?.description ?? "")
	const [isActive, setIsActive] = React.useState(workflow?.isActive ?? false)
	const [saving, setSaving] = React.useState(false)
	const [hasChanges, setHasChanges] = React.useState(false)

	// React Flow state
	const [nodes, setNodes] = React.useState<Node[]>((workflow?.nodes as Node[]) ?? [])
	const [edges, setEdges] = React.useState<Edge[]>((workflow?.edges as Edge[]) ?? [])
	const [selectedNode, setSelectedNode] = React.useState<Node | null>(null)

	// Execution state
	const [execution, setExecution] = React.useState<ExecutionState>(initialExecutionState)

	const hasTrigger = nodes.some((n) => n.type === "trigger")

	const addTriggerNode = React.useCallback((trigger: WorkflowTrigger, label: string, category: string) => {
		const newNode: Node = {
			id: `trigger-${Date.now()}`,
			type: "trigger",
			position: { x: 400, y: 100 },
			data: { label, trigger, category },
		}
		setNodes([newNode])
	}, [])

	const addActionNode = React.useCallback((action: WorkflowAction, label: string, category: string) => {
		setNodes((currentNodes) => {
			const lastNode = currentNodes[currentNodes.length - 1]
			const yPos = lastNode ? lastNode.position.y + 150 : 100

			const nodeType = action.startsWith("condition") ? "condition" : action.startsWith("delay") ? "delay" : "action"

			// Default configs for each action type
			const config = getDefaultActionConfig(action)

			const newNode: Node = {
				id: `${nodeType}-${Date.now()}`,
				type: nodeType,
				position: { x: 400, y: yPos },
				data: { label, action, category, config },
			}

			// Don't auto-connect - let user manually connect nodes
			return [...currentNodes, newNode]
		})
	}, [])

	const reset = React.useCallback(() => {
		setName("Untitled Workflow")
		setDescription("")
		setIsActive(false)
		setSaving(false)
		setHasChanges(false)
		setNodes([])
		setEdges([])
		setSelectedNode(null)
		setExecution(initialExecutionState)
	}, [])

	// Execution actions
	const setNodeStatus = React.useCallback((nodeId: string, status: NodeExecutionStatus) => {
		setExecution((prev) => ({
			...prev,
			nodeStatuses: { ...prev.nodeStatuses, [nodeId]: status },
		}))
	}, [])

	const setEdgeActive = React.useCallback((edgeId: string, active: boolean) => {
		setExecution((prev) => {
			const newActiveEdges = new Set(prev.activeEdges)
			if (active) {
				newActiveEdges.add(edgeId)
			} else {
				newActiveEdges.delete(edgeId)
			}
			return { ...prev, activeEdges: newActiveEdges }
		})
	}, [])

	const startExecution = React.useCallback(() => {
		setExecution({ nodeStatuses: {}, activeEdges: new Set(), isExecuting: true })
	}, [])

	const stopExecution = React.useCallback(() => {
		setExecution(initialExecutionState)
	}, [])

	// Simulate workflow execution for visual feedback
	const simulateExecution = React.useCallback(async () => {
		startExecution()

		// Build execution order from edges (simple BFS from trigger)
		const triggerNode = nodes.find((n) => n.type === "trigger")
		if (!triggerNode) {
			stopExecution()
			return
		}

		const visited = new Set<string>()
		const queue: string[] = [triggerNode.id]
		const executionOrder: string[] = []

		while (queue.length > 0) {
			const nodeId = queue.shift()!
			if (visited.has(nodeId)) continue
			visited.add(nodeId)
			executionOrder.push(nodeId)

			// Find outgoing edges
			const outEdges = edges.filter((e) => e.source === nodeId)
			for (const edge of outEdges) {
				if (!visited.has(edge.target)) {
					queue.push(edge.target)
				}
			}
		}

		// Animate through each node
		for (let i = 0; i < executionOrder.length; i++) {
			const nodeId = executionOrder[i]

			// Set node as executing
			setNodeStatus(nodeId, "executing")

			// Find incoming edge and activate it
			const incomingEdge = edges.find((e) => e.target === nodeId)
			if (incomingEdge) {
				setEdgeActive(incomingEdge.id, true)
			}

			// Simulate execution time
			await new Promise((resolve) => setTimeout(resolve, 1000))

			// Deactivate incoming edge
			if (incomingEdge) {
				setEdgeActive(incomingEdge.id, false)
			}

			// Mark as success (randomly add errors for demo if you want)
			setNodeStatus(nodeId, "success")

			// Small pause before next node
			await new Promise((resolve) => setTimeout(resolve, 300))
		}

		// Keep success states visible for a moment
		await new Promise((resolve) => setTimeout(resolve, 2000))

		// Clear execution state
		stopExecution()
	}, [nodes, edges, startExecution, stopExecution, setNodeStatus, setEdgeActive])

	// Create the store object
	const store: WorkflowStore = React.useMemo(() => ({
		workflow,
		name,
		description,
		isActive,
		nodes,
		edges,
		selectedNode,
		hasChanges,
		saving,
		hasTrigger,
		execution,
		setName,
		setDescription,
		setIsActive,
		setNodes,
		setEdges,
		addTriggerNode,
		addActionNode,
		setSelectedNode,
		setHasChanges,
		setSaving,
		reset,
		setNodeStatus,
		setEdgeActive,
		startExecution,
		stopExecution,
		simulateExecution,
	}), [
		workflow, name, description, isActive, nodes, edges, selectedNode,
		hasChanges, saving, hasTrigger, execution, addTriggerNode, addActionNode, reset,
		setNodeStatus, setEdgeActive, startExecution, stopExecution, simulateExecution
	])

	// Register/unregister the store globally (useLayoutEffect for synchronous updates)
	React.useLayoutEffect(() => {
		setGlobalWorkflowStore(store)
		return () => {
			setGlobalWorkflowStore(null)
		}
	}, [store])

	return <>{children}</>
}

// For use inside the WorkflowProvider (throws if not available)
export function useWorkflow(): WorkflowStore {
	const store = useWorkflowStore()
	if (!store) {
		throw new Error("useWorkflow must be used within a WorkflowProvider")
	}
	return store
}
