import { getEmailTemplates, getSentMessages, seedCoreTemplates } from "./actions"
import { EmailTemplatesClient } from "./email-templates-client"

interface PageProps {
	searchParams: Promise<{
		page?: string
		sentPage?: string
	}>
}

export default async function EmailTemplatesPage({ searchParams }: PageProps) {
	const params = await searchParams
	const templatesPage = Number(params.page) || 1
	const sentPage = Number(params.sentPage) || 1

	// Seed core templates on first visit (no-op if templates already exist)
	await seedCoreTemplates()

	const [templatesData, sentData] = await Promise.all([
		getEmailTemplates({ page: templatesPage, pageSize: 25 }),
		getSentMessages({ page: sentPage, pageSize: 25 }),
	])

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<EmailTemplatesClient
				templates={templatesData.items}
				templatesTotalCount={templatesData.totalCount}
				templatesCurrentPage={templatesPage}
				sentMessages={sentData.items}
				sentTotalCount={sentData.totalCount}
				sentCurrentPage={sentPage}
			/>
		</div>
	)
}
