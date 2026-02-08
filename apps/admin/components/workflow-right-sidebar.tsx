"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FlashIcon,
  Delete02Icon,
  Mail01Icon,
  Notification01Icon,
  Database01Icon,
  Link01Icon,
  ArrowRight01Icon,
  Clock01Icon,
  FilterIcon,
  Settings01Icon,
  Cancel01Icon,
  // Specific trigger icons
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
  RecordIcon,
  CheckmarkCircle02Icon,
  RefreshIcon,
  CreditCardNotFoundIcon,
  ThumbsUpIcon,
  Flag01Icon,
  PlayIcon,
  AuctionIcon,
  TimerIcon,
  HourglassIcon,
  CalendarCheckIn01Icon,
  Cursor01Icon,
  // Specific action icons
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
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  RightSidebarGroup,
  RightSidebarGroupContent,
  RightSidebarGroupLabel,
  RightSidebarSeparator,
  useRightSidebar,
} from "@/components/ui/right-sidebar"
import { useWorkflowStore } from "@/lib/workflow-context"
import { cn } from "@/lib/utils"
import type { Node } from "@xyflow/react"

// Specific icons for each trigger value
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

// Specific icons for each action value
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

function getNodeIcon(node: Node) {
  const type = node.type
  const trigger = (node.data as { trigger?: string })?.trigger
  const action = (node.data as { action?: string })?.action

  // For triggers, use specific icon if available
  if (type === "trigger" && trigger) {
    return TRIGGER_ICONS[trigger] || FlashIcon
  }

  if (type === "condition") return FilterIcon
  if (type === "delay") return Clock01Icon

  // For actions, use specific icon if available
  if (action) {
    return ACTION_ICONS[action] || ArrowRight01Icon
  }

  return ArrowRight01Icon
}

function NodeListItem({ node, isSelected, onClick }: { node: Node; isSelected: boolean; onClick: () => void }) {
  const Icon = getNodeIcon(node)
  const label = (node.data as { label?: string })?.label || node.id

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
        isSelected
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent/50"
      )}
    >
      <HugeiconsIcon icon={Icon} size={16} className="text-muted-foreground shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

function WorkflowMinimap() {
  const workflow = useWorkflowStore()

  if (!workflow || workflow.nodes.length === 0) {
    return (
      <div className="px-3 py-4 text-center">
        <HugeiconsIcon icon={FlashIcon} size={24} className="text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">
          No nodes yet. Add a trigger from the left sidebar to get started.
        </p>
      </div>
    )
  }

  const nodes = workflow.nodes
  const edges = workflow.edges

  // Calculate bounds
  const padding = 20
  const nodeWidth = 40
  const nodeHeight = 20

  const minX = Math.min(...nodes.map((n) => n.position.x)) - padding
  const maxX = Math.max(...nodes.map((n) => n.position.x)) + nodeWidth + padding
  const minY = Math.min(...nodes.map((n) => n.position.y)) - padding
  const maxY = Math.max(...nodes.map((n) => n.position.y)) + nodeHeight + padding

  const width = maxX - minX
  const height = maxY - minY

  // Scale to fit in container (max 200px height)
  const containerHeight = 120
  const scale = Math.min(1, containerHeight / height, 200 / width)

  const scaledWidth = width * scale
  const scaledHeight = height * scale

  const getNodeColor = (type: string | undefined) => {
    switch (type) {
      case "trigger": return "hsl(var(--primary))"
      case "condition": return "#f59e0b" // amber-500
      case "delay": return "#0ea5e9" // sky-500
      default: return "hsl(var(--primary))"
    }
  }

  return (
    <div className="px-3 py-2">
      <svg
        width="100%"
        height={scaledHeight}
        viewBox={`0 0 ${scaledWidth} ${scaledHeight}`}
        className="bg-muted/30 rounded-lg border"
      >
        {/* Edges */}
        {edges.map((edge) => {
          const source = nodes.find((n) => n.id === edge.source)
          const target = nodes.find((n) => n.id === edge.target)
          if (!source || !target) return null

          const x1 = (source.position.x - minX + nodeWidth / 2) * scale
          const y1 = (source.position.y - minY + nodeHeight) * scale
          const x2 = (target.position.x - minX + nodeWidth / 2) * scale
          const y2 = (target.position.y - minY) * scale

          return (
            <line
              key={edge.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeOpacity={0.5}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const x = (node.position.x - minX) * scale
          const y = (node.position.y - minY) * scale
          const isSelected = workflow.selectedNode?.id === node.id

          return (
            <g key={node.id}>
              <rect
                x={x}
                y={y}
                width={nodeWidth * scale}
                height={nodeHeight * scale}
                rx={4 * scale}
                fill={getNodeColor(node.type)}
                opacity={isSelected ? 1 : 0.7}
                stroke={isSelected ? "white" : "none"}
                strokeWidth={isSelected ? 2 : 0}
                className="cursor-pointer transition-opacity"
                onClick={() => workflow.setSelectedNode(node)}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function NodeList() {
  const workflow = useWorkflowStore()

  if (!workflow || workflow.nodes.length === 0) {
    return null
  }

  return (
    <div className="space-y-1 px-2">
      {workflow.nodes.map((node) => (
        <NodeListItem
          key={node.id}
          node={node}
          isSelected={workflow.selectedNode?.id === node.id}
          onClick={() => workflow.setSelectedNode(node)}
        />
      ))}
    </div>
  )
}

function NodeConfigPanel() {
  const workflow = useWorkflowStore()
  const selectedNode = workflow?.selectedNode

  // Check if selected node still exists in the nodes array
  const nodeStillExists = selectedNode && workflow?.nodes.some(n => n.id === selectedNode.id)
  const node = nodeStillExists ? selectedNode : null

  // Clear stale selectedNode if it no longer exists
  React.useEffect(() => {
    if (selectedNode && !nodeStillExists && workflow) {
      workflow.setSelectedNode(null)
    }
  }, [selectedNode, nodeStillExists, workflow])

  if (!node) {
    return (
      <div className="px-3 py-4 text-center">
        <HugeiconsIcon icon={Settings01Icon} size={24} className="text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">
          Select a node to configure it
        </p>
      </div>
    )
  }

  const nodeData = node.data as Record<string, unknown>
  const Icon = getNodeIcon(node)

  const handleDelete = () => {
    if (!workflow) return
    workflow.setNodes((nds) => nds.filter((n) => n.id !== node.id))
    workflow.setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id))
    workflow.setSelectedNode(null)
  }

  return (
    <div className="px-3 py-2 space-y-4">
      {/* Node header */}
      <div className="flex items-start gap-2">
        <HugeiconsIcon icon={Icon} size={18} className="text-muted-foreground shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-sm truncate">{nodeData.label as string}</h4>
          <p className="text-xs text-muted-foreground capitalize">{node.type}</p>
        </div>
      </div>

      <Separator />

      {/* Node details */}
      <div className="space-y-3">
        {typeof nodeData.category === "string" && (
          <div>
            <Label className="text-xs text-muted-foreground">Category</Label>
            <p className="text-sm mt-0.5">{nodeData.category}</p>
          </div>
        )}

        <div>
          <Label className="text-xs text-muted-foreground">Node ID</Label>
          <p className="text-xs font-mono text-muted-foreground mt-0.5 truncate">{node.id}</p>
        </div>

        {node.type === "trigger" && typeof nodeData.trigger === "string" && (
          <div>
            <Label className="text-xs text-muted-foreground">Trigger Event</Label>
            <p className="text-sm mt-0.5 font-mono">{nodeData.trigger}</p>
          </div>
        )}

        {node.type !== "trigger" && typeof nodeData.action === "string" && (
          <div>
            <Label className="text-xs text-muted-foreground">Action</Label>
            <p className="text-sm mt-0.5 font-mono">{nodeData.action}</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Configuration placeholder */}
      <div className="rounded-lg border border-dashed p-3">
        <p className="text-xs text-muted-foreground text-center">
          Node configuration options coming soon
        </p>
      </div>

      {/* Delete button (not for trigger) */}
      {node.type !== "trigger" && (
        <>
          <Separator />
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={handleDelete}
          >
            <HugeiconsIcon icon={Delete02Icon} size={14} className="mr-1.5" />
            Delete Node
          </Button>
        </>
      )}
    </div>
  )
}

export function WorkflowRightSidebarContent() {
  const { setOpen } = useRightSidebar()
  const workflow = useWorkflowStore()

  // Auto-open sidebar when a node is selected
  // Don't auto-close - let user close manually via X button or notification bell
  React.useEffect(() => {
    if (workflow?.selectedNode) {
      setOpen(true)
    }
  }, [workflow?.selectedNode, setOpen])

  const handleClose = () => {
    workflow?.setSelectedNode(null)
    setOpen(false)
  }

  return (
    <>
      {/* Minimap (replaces calendar) */}
      <RightSidebarGroup className="p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <RightSidebarGroupLabel className="p-0">
            Overview
          </RightSidebarGroupLabel>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleClose}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
          </Button>
        </div>
        <RightSidebarGroupContent>
          <WorkflowMinimap />
        </RightSidebarGroupContent>
      </RightSidebarGroup>

      <RightSidebarSeparator />

      {/* Node List */}
      <RightSidebarGroup className="p-0">
        <RightSidebarGroupLabel className="px-3 py-2">
          Nodes
        </RightSidebarGroupLabel>
        <RightSidebarGroupContent>
          <NodeList />
        </RightSidebarGroupContent>
      </RightSidebarGroup>

      <RightSidebarSeparator />

      {/* Node Configuration */}
      <RightSidebarGroup className="p-0 flex-1">
        <RightSidebarGroupLabel className="px-3 py-2">
          Configuration
        </RightSidebarGroupLabel>
        <RightSidebarGroupContent>
          <NodeConfigPanel />
        </RightSidebarGroupContent>
      </RightSidebarGroup>
    </>
  )
}
