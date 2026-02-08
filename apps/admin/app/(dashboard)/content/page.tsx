import { getBlogPosts } from "./actions"
import { BlogPostsTable } from "./blog-posts-table"

interface PageProps {
	searchParams: Promise<{
		page?: string
		status?: string
	}>
}

export default async function ContentPage({ searchParams }: PageProps) {
	const params = await searchParams
	const page = Number(params.page) || 1
	const { items, totalCount } = await getBlogPosts({ page, pageSize: 25, status: params.status })

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<p className="text-sm text-muted-foreground">Create and manage blog content.</p>
			<BlogPostsTable posts={items} totalCount={totalCount} currentPage={page} currentStatus={params.status} />
		</div>
	)
}
