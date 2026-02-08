import { getStorefronts } from "@/app/(dashboard)/settings/storefronts/actions"
import { getAdminApiKeys } from "./actions"
import { ApiKeysClient } from "./api-keys-client"

export default async function ApiKeysPage() {
	const [storefronts, adminApiKeys] = await Promise.all([
		getStorefronts(),
		getAdminApiKeys(),
	])

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<p className="text-sm text-muted-foreground">
				Manage API keys for your external applications and storefronts.
			</p>
			<ApiKeysClient storefronts={storefronts} adminApiKeys={adminApiKeys} />
		</div>
	)
}
