import { getStorefronts } from "./actions"
import { StorefrontsClient } from "./storefronts-client"

export default async function StorefrontsPage() {
	const storefronts = await getStorefronts()

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<StorefrontsClient storefronts={storefronts} />
		</div>
	)
}
