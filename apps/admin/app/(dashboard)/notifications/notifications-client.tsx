"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TemplatesTable } from "./templates-table"
import { DataTable, type Column } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"

type EmailTemplate = {
	id: string
	name: string
	slug: string
	subject: string
	isActive: boolean | null
	updatedAt: Date
}

type SentMessage = {
	id: string
	recipientEmail: string
	subject: string
	status: string
	sentAt: Date
}

const sentColumns: Column<SentMessage>[] = [
	{
		key: "recipientEmail",
		header: "Recipient",
		cell: (row) => <span className="font-medium">{row.recipientEmail}</span>,
	},
	{
		key: "subject",
		header: "Subject",
		cell: (row) => <span className="truncate max-w-[250px] block">{row.subject}</span>,
	},
	{
		key: "status",
		header: "Status",
		cell: (row) => (
			<Badge variant={row.status === "sent" ? "default" : "secondary"} className="text-xs">
				{row.status}
			</Badge>
		),
	},
	{
		key: "sentAt",
		header: "Sent",
		cell: (row) => new Date(row.sentAt).toLocaleString(),
	},
]

interface NotificationsClientProps {
	templates: EmailTemplate[]
	templatesTotalCount: number
	templatesCurrentPage: number
	messages: SentMessage[]
	messagesTotalCount: number
	messagesCurrentPage: number
}

export function NotificationsClient({
	templates,
	templatesTotalCount,
	templatesCurrentPage,
	messages,
	messagesTotalCount,
	messagesCurrentPage,
}: NotificationsClientProps) {
	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">Email Templates</h2>
				<p className="text-muted-foreground text-sm">Manage transactional email templates and view sent messages.</p>
			</div>
			<Tabs defaultValue="templates">
				<TabsList>
					<TabsTrigger value="templates">Templates</TabsTrigger>
					<TabsTrigger value="sent">Sent Log</TabsTrigger>
				</TabsList>
				<TabsContent value="templates" className="mt-4">
					<TemplatesTable templates={templates} totalCount={templatesTotalCount} currentPage={templatesCurrentPage} />
				</TabsContent>
				<TabsContent value="sent" className="mt-4">
					<DataTable
						data={messages}
						columns={sentColumns}
						searchKey="recipientEmail"
						searchPlaceholder="Search by email..."
						totalCount={messagesTotalCount}
						currentPage={messagesCurrentPage}
					/>
				</TabsContent>
			</Tabs>
		</div>
	)
}
