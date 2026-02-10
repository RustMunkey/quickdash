import { type NextRequest } from "next/server"
import { withStorefrontAuth, storefrontError, handleCorsOptions, type StorefrontContext } from "@/lib/storefront-auth"
import { getReownCredentials } from "@/lib/workspace-integrations"

type VerifyInput = {
	chain: string // eth, sol, btc, etc.
	txHash: string
	amount: number
	currency: string
	walletAddress: string
	recipientAddress?: string
}

async function handlePost(request: NextRequest, storefront: StorefrontContext) {
	const creds = await getReownCredentials(storefront.workspaceId)
	if (!creds) {
		return storefrontError("Crypto payments not configured.", 503)
	}

	let body: VerifyInput
	try {
		body = await request.json()
	} catch {
		return storefrontError("Invalid JSON body", 400)
	}

	const { chain, txHash, amount, currency, walletAddress } = body

	if (!chain || !txHash || !amount || !walletAddress) {
		return storefrontError("Missing required fields: chain, txHash, amount, walletAddress", 400)
	}

	// Validate chain is in accepted list
	if (!creds.chains.includes(chain)) {
		return storefrontError(`Chain "${chain}" is not accepted by this store`, 400)
	}

	// For MVP: accept the transaction hash and mark as pending verification
	// In production, you'd verify on-chain via RPC or block explorer API
	// e.g., Etherscan API for ETH, Solscan for SOL, Blockstream for BTC

	return Response.json({
		verified: false, // pending — true verification requires on-chain lookup
		status: "pending",
		txHash,
		chain,
		amount,
		currency,
		walletAddress,
		message: "Transaction recorded. Verification pending blockchain confirmation.",
	})
}

export const POST = withStorefrontAuth(handlePost, { requiredPermission: "checkout" })
export const OPTIONS = handleCorsOptions
