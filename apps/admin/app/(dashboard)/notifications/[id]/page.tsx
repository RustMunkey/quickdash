import { notFound } from "next/navigation"
import { getEmailTemplate } from "../actions"
import { TemplateForm } from "./template-form"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function TemplateDetailPage({ params }: PageProps) {
	const { id } = await params

	const template = id === "new" ? null : await getEmailTemplate(id)
	if (id !== "new" && !template) notFound()

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<TemplateForm template={template} />
		</div>
	)
}
