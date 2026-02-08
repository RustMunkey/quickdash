type Role = "owner" | "admin" | "member"

export function canManageProducts(role: string): boolean {
	return role === "owner" || role === "admin"
}

export function canManageOrders(role: string): boolean {
	return role === "owner" || role === "admin"
}

export function canModerateReviews(role: string): boolean {
	return role === "owner" || role === "admin"
}

export function canManageCustomers(role: string): boolean {
	return role === "owner" || role === "admin"
}

export function canManageSettings(role: string): boolean {
	return role === "owner"
}
