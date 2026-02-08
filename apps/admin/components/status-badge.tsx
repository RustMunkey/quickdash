import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const orderStatusColors: Record<string, string> = {
	pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	processing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
	packed: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
	shipped: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
	delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
	refunded: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	partially_refunded: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
	returned: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
}

const reviewStatusColors: Record<string, string> = {
	pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	reported: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
}

const paymentStatusColors: Record<string, string> = {
	pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	refunded: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
}

const giftCardStatusColors: Record<string, string> = {
	active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	used: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
	expired: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	deactivated: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const productStatusColors: Record<string, string> = {
	active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	inactive: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
}

const inventoryStatusColors: Record<string, string> = {
	in_stock: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	low_stock: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	out_of_stock: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const subscriptionStatusColors: Record<string, string> = {
	active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
	dunning: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const purchaseOrderStatusColors: Record<string, string> = {
	draft: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
	submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	confirmed: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
	shipped: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
	received: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const labelStatusColors: Record<string, string> = {
	pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	printed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	shipped: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
	delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

const trackingStatusColors: Record<string, string> = {
	pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	in_transit: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	out_for_delivery: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
	delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	exception: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	returned: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
}

const contentStatusColors: Record<string, string> = {
	draft: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
	published: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	archived: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
}

const campaignStatusColors: Record<string, string> = {
	draft: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
	scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
	active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	ended: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const alertStatusColors: Record<string, string> = {
	active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	inactive: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400",
}

const colorMaps = {
	order: orderStatusColors,
	review: reviewStatusColors,
	payment: paymentStatusColors,
	giftCard: giftCardStatusColors,
	product: productStatusColors,
	inventory: inventoryStatusColors,
	subscription: subscriptionStatusColors,
	purchaseOrder: purchaseOrderStatusColors,
	label: labelStatusColors,
	tracking: trackingStatusColors,
	content: contentStatusColors,
	campaign: campaignStatusColors,
	alert: alertStatusColors,
}

type StatusType = keyof typeof colorMaps

interface StatusBadgeProps {
	status: string
	type: StatusType
	className?: string
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
	const colors = colorMaps[type]
	const colorClass = colors[status] ?? ""
	const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

	return (
		<Badge
			variant="secondary"
			className={cn("text-[11px] px-1.5 py-0 border-0", colorClass, className)}
		>
			{label}
		</Badge>
	)
}
