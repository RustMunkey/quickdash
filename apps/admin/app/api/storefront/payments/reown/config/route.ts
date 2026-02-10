import { type NextRequest } from "next/server"
import { withStorefrontAuth, storefrontError, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"
import { getReownCredentials } from "@/lib/workspace-integrations"

async function handleGet(request: NextRequest, storefront: StorefrontContext) {
	const creds = await getReownCredentials(storefront.workspaceId)
	if (!creds) {
		return storefrontError("Crypto payments not configured. Please contact the store owner.", 503)
	}

	return Response.json({
		projectId: creds.projectId,
		chains: creds.chains,
	})
}

export const GET = withStorefrontAuth(handleGet)
export const OPTIONS = handleCorsOptions
