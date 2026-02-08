"use client"

import { useQueryStates, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs"

// Shared options for shallow routing (no server request, instant updates)
const shallowOptions = { shallow: false, history: "push" as const }

// Orders table params
export function useOrdersParams() {
	return useQueryStates(
		{
			page: parseAsInteger.withDefault(1),
			search: parseAsString.withDefault(""),
			status: parseAsStringLiteral([
				"all", "pending", "confirmed", "processing", "packed",
				"shipped", "delivered", "cancelled", "refunded",
				"partially_refunded", "returned",
			] as const).withDefault("all"),
			sort: parseAsString.withDefault(""),
			sortDir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
		},
		{ ...shallowOptions, throttleMs: 300 }
	)
}

// Products table params
export function useProductsParams() {
	return useQueryStates(
		{
			page: parseAsInteger.withDefault(1),
			search: parseAsString.withDefault(""),
			category: parseAsString.withDefault("all"),
			status: parseAsStringLiteral(["all", "active", "inactive"] as const).withDefault("all"),
			sort: parseAsString.withDefault(""),
			sortDir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
		},
		{ ...shallowOptions, throttleMs: 300 }
	)
}

// Customers table params
export function useCustomersParams() {
	return useQueryStates(
		{
			page: parseAsInteger.withDefault(1),
			search: parseAsString.withDefault(""),
			sort: parseAsString.withDefault(""),
			sortDir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
		},
		{ ...shallowOptions, throttleMs: 300 }
	)
}

// Inventory table params
export function useInventoryParams() {
	return useQueryStates(
		{
			page: parseAsInteger.withDefault(1),
			search: parseAsString.withDefault(""),
			stock: parseAsStringLiteral(["all", "in_stock", "low_stock", "out_of_stock"] as const).withDefault("all"),
			warehouse: parseAsString.withDefault("all"),
			sort: parseAsString.withDefault(""),
			sortDir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
		},
		{ ...shallowOptions, throttleMs: 300 }
	)
}

// Subscriptions table params
export function useSubscriptionsParams() {
	return useQueryStates(
		{
			page: parseAsInteger.withDefault(1),
			search: parseAsString.withDefault(""),
			status: parseAsStringLiteral(["all", "active", "paused", "cancelled", "past_due", "trialing"] as const).withDefault("all"),
			plan: parseAsString.withDefault("all"),
			sort: parseAsString.withDefault(""),
			sortDir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
		},
		{ ...shallowOptions, throttleMs: 300 }
	)
}

// Reviews table params
export function useReviewsParams() {
	return useQueryStates(
		{
			page: parseAsInteger.withDefault(1),
			search: parseAsString.withDefault(""),
			status: parseAsStringLiteral(["all", "pending", "approved", "rejected"] as const).withDefault("all"),
			rating: parseAsString.withDefault("all"),
			sort: parseAsString.withDefault(""),
			sortDir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
		},
		{ ...shallowOptions, throttleMs: 300 }
	)
}

// Analytics params
export function useAnalyticsParams() {
	return useQueryStates(
		{
			range: parseAsStringLiteral(["today", "yesterday", "7d", "30d", "90d", "12m", "custom"] as const).withDefault("30d"),
			from: parseAsString,
			to: parseAsString,
			compare: parseAsStringLiteral(["previous", "year", "none"] as const).withDefault("previous"),
		},
		{ ...shallowOptions }
	)
}

// Generic pagination params (for simple tables)
export function usePaginationParams() {
	return useQueryStates(
		{
			page: parseAsInteger.withDefault(1),
			search: parseAsString.withDefault(""),
		},
		{ ...shallowOptions, throttleMs: 300 }
	)
}
