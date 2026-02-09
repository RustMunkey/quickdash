import { getStorefronts } from "@/app/(dashboard)/settings/storefronts/actions"
import { getAdminApiKeys } from "./actions"
import { ApiKeysClient } from "./api-keys-client"
import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function ApiKeysPage() {
	const workspace = await requireWorkspace()
	if (!workspace.features.adminApi) {
		return <FeatureGatePage feature="adminApi" features={workspace.features} featureName="Admin API Access" />
	}

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
