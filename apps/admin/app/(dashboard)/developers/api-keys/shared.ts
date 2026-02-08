// Shared types and constants for API keys
// This file can be imported by both client and server components

export type ApiKeyPermissions = {
	// Read permissions
	readProducts?: boolean
	readOrders?: boolean
	readCustomers?: boolean
	readInventory?: boolean
	readWebhooks?: boolean
	readAnalytics?: boolean
	readContent?: boolean
	readMarketing?: boolean
	readReviews?: boolean
	readShipping?: boolean
	readSubscriptions?: boolean
	readAuctions?: boolean

	// Write permissions
	writeProducts?: boolean
	writeOrders?: boolean
	writeCustomers?: boolean
	writeInventory?: boolean
	writeWebhooks?: boolean
	writeContent?: boolean
	writeMarketing?: boolean
	writeReviews?: boolean
	writeShipping?: boolean
	writeSubscriptions?: boolean
	writeAuctions?: boolean

	// Full access (overrides individual permissions)
	fullAccess?: boolean
}

export const DEFAULT_API_KEY_PERMISSIONS: ApiKeyPermissions = {
	readProducts: true,
	readOrders: true,
	readCustomers: true,
	readInventory: true,
	readWebhooks: true,
	readAnalytics: true,
	readContent: true,
	readMarketing: true,
	readReviews: true,
	readShipping: true,
	readSubscriptions: true,
	readAuctions: true,
	writeProducts: false,
	writeOrders: false,
	writeCustomers: false,
	writeInventory: false,
	writeWebhooks: false,
	writeContent: false,
	writeMarketing: false,
	writeReviews: false,
	writeShipping: false,
	writeSubscriptions: false,
	writeAuctions: false,
	fullAccess: false,
}
