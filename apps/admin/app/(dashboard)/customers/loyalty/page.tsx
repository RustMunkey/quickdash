import { getLoyaltyConfig, getTopPointHolders, getRecentTransactions } from "./actions"
import { LoyaltyClient } from "./loyalty-client"

interface PageProps {
	searchParams: Promise<{ page?: string; txPage?: string }>
}

export default async function LoyaltyPage({ searchParams }: PageProps) {
	const params = await searchParams
	const holdersPage = Number(params.page) || 1
	const txPage = Number(params.txPage) || 1
	const pageSize = 25

	const [config, holdersData, transactionsData] = await Promise.all([
		getLoyaltyConfig(),
		getTopPointHolders({ page: holdersPage, pageSize }),
		getRecentTransactions({ page: txPage, pageSize }),
	])

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Manage customer loyalty points and rewards program.
			</p>
			<LoyaltyClient
				config={config}
				holders={holdersData.items}
				holdersTotalCount={holdersData.totalCount}
				holdersCurrentPage={holdersPage}
				transactions={transactionsData.items}
				transactionsTotalCount={transactionsData.totalCount}
				transactionsCurrentPage={txPage}
			/>
		</div>
	)
}
