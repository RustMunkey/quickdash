import { notFound } from "next/navigation"
import { getSitePage } from "../../actions"
import { PageForm } from "./page-form"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function SitePageDetailPage({ params }: PageProps) {
	const { id } = await params

	const page = id === "new" ? null : await getSitePage(id)
	if (id !== "new" && !page) notFound()

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<PageForm page={page} />
		</div>
	)
}
