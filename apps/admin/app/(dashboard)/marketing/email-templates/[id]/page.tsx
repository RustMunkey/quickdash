import { notFound } from "next/navigation"
import { getEmailTemplate, getSentMessages } from "../actions"
import { TemplateEditor } from "./template-editor"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function TemplateDetailPage({ params }: PageProps) {
	const { id } = await params

	const isNew = id === "new"
	const template = isNew ? null : await getEmailTemplate(id)
	if (!isNew && !template) notFound()

	// Fetch sent log for existing templates
	const sentData = !isNew && template
		? await getSentMessages({ templateId: template.id, pageSize: 25 })
		: { items: [], totalCount: 0 }

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<TemplateEditor
				template={template}
				sentMessages={sentData.items}
				sentTotalCount={sentData.totalCount}
			/>
		</div>
	)
}
