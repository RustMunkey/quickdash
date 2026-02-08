import {
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
	parseAsArrayOf,
	createSearchParamsCache,
	createSerializer,
} from "nuqs/server"

// Common parsers
export const pageParser = parseAsInteger.withDefault(1)
export const searchParser = parseAsString.withDefault("")
export const sortParser = parseAsString.withDefault("")
export const sortDirParser = parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc")

// Orders table
export const orderStatusParser = parseAsStringLiteral([
	"all",
	"pending",
	"confirmed",
	"processing",
	"packed",
	"shipped",
	"delivered",
	"cancelled",
	"refunded",
	"partially_refunded",
	"returned",
] as const).withDefault("all")

export const ordersSearchParams = {
	page: pageParser,
	search: searchParser,
	status: orderStatusParser,
	sort: sortParser,
	sortDir: sortDirParser,
}

export const ordersParamsCache = createSearchParamsCache(ordersSearchParams)

// Products table
export const productStatusParser = parseAsStringLiteral([
	"all",
	"active",
	"inactive",
] as const).withDefault("all")

export const productsSearchParams = {
	page: pageParser,
	search: searchParser,
	category: parseAsString.withDefault("all"),
	status: productStatusParser,
	sort: sortParser,
	sortDir: sortDirParser,
}

export const productsParamsCache = createSearchParamsCache(productsSearchParams)

// Customers table
export const customersSearchParams = {
	page: pageParser,
	search: searchParser,
	sort: sortParser,
	sortDir: sortDirParser,
}

export const customersParamsCache = createSearchParamsCache(customersSearchParams)

// Inventory table
export const stockFilterParser = parseAsStringLiteral([
	"all",
	"in_stock",
	"low_stock",
	"out_of_stock",
] as const).withDefault("all")

export const inventorySearchParams = {
	page: pageParser,
	search: searchParser,
	stock: stockFilterParser,
	warehouse: parseAsString.withDefault("all"),
	sort: sortParser,
	sortDir: sortDirParser,
}

export const inventoryParamsCache = createSearchParamsCache(inventorySearchParams)

// Subscriptions table
export const subscriptionStatusParser = parseAsStringLiteral([
	"all",
	"active",
	"paused",
	"cancelled",
	"past_due",
	"trialing",
] as const).withDefault("all")

export const subscriptionsSearchParams = {
	page: pageParser,
	search: searchParser,
	status: subscriptionStatusParser,
	plan: parseAsString.withDefault("all"),
	sort: sortParser,
	sortDir: sortDirParser,
}

export const subscriptionsParamsCache = createSearchParamsCache(subscriptionsSearchParams)

// Reviews table
export const reviewStatusParser = parseAsStringLiteral([
	"all",
	"pending",
	"approved",
	"rejected",
] as const).withDefault("all")

export const reviewsSearchParams = {
	page: pageParser,
	search: searchParser,
	status: reviewStatusParser,
	rating: parseAsString.withDefault("all"),
	sort: sortParser,
	sortDir: sortDirParser,
}

export const reviewsParamsCache = createSearchParamsCache(reviewsSearchParams)

// Marketing / Discounts table
export const discountStatusParser = parseAsStringLiteral([
	"all",
	"active",
	"scheduled",
	"expired",
	"disabled",
] as const).withDefault("all")

export const discountsSearchParams = {
	page: pageParser,
	search: searchParser,
	status: discountStatusParser,
	sort: sortParser,
	sortDir: sortDirParser,
}

export const discountsParamsCache = createSearchParamsCache(discountsSearchParams)

// Suppliers table
export const suppliersSearchParams = {
	page: pageParser,
	search: searchParser,
	status: parseAsStringLiteral(["all", "active", "inactive"] as const).withDefault("all"),
	sort: sortParser,
	sortDir: sortDirParser,
}

export const suppliersParamsCache = createSearchParamsCache(suppliersSearchParams)

// Analytics pages - date range
export const analyticsSearchParams = {
	range: parseAsStringLiteral([
		"today",
		"yesterday",
		"7d",
		"30d",
		"90d",
		"12m",
		"custom",
	] as const).withDefault("30d"),
	from: parseAsString,
	to: parseAsString,
	compare: parseAsStringLiteral(["previous", "year", "none"] as const).withDefault("previous"),
}

export const analyticsParamsCache = createSearchParamsCache(analyticsSearchParams)

// Settings tabs
export const settingsSearchParams = {
	tab: parseAsString.withDefault("general"),
}

export const settingsParamsCache = createSearchParamsCache(settingsSearchParams)

// Serializers for building URLs
export const serializeOrders = createSerializer(ordersSearchParams)
export const serializeProducts = createSerializer(productsSearchParams)
export const serializeCustomers = createSerializer(customersSearchParams)
export const serializeInventory = createSerializer(inventorySearchParams)
export const serializeSubscriptions = createSerializer(subscriptionsSearchParams)
export const serializeAnalytics = createSerializer(analyticsSearchParams)
