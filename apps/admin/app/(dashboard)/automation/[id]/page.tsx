import { notFound } from "next/navigation"
import { getWorkflow } from "../actions"
import { WorkflowEditor } from "./workflow-editor"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function WorkflowEditorPage({ params }: PageProps) {
	const { id } = await params

	// New workflow
	if (id === "new") {
		return <WorkflowEditor workflow={null} />
	}

	// Existing workflow
	let workflow
	try {
		workflow = await getWorkflow(id)
	} catch {
		notFound()
	}

	return <WorkflowEditor workflow={workflow} />
}
