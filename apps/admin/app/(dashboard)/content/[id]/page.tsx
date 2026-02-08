import { notFound } from "next/navigation"
import { getBlogPost } from "../actions"
import { BlogPostForm } from "./blog-post-form"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function BlogPostPage({ params }: PageProps) {
	const { id } = await params

	const post = id === "new" ? null : await getBlogPost(id)
	if (id !== "new" && !post) notFound()

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<BlogPostForm post={post} />
		</div>
	)
}
