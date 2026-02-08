/**
 * Quickdash Admin API Client
 *
 * A framework-agnostic client for full programmatic access to your Quickdash workspace.
 * Drop this file into any server-side project and configure with your Admin API key.
 *
 * Usage:
 *   const admin = new AdminClient({ apiKey: 'jb_live_xxxxx' })
 *   const { data, meta } = await admin.products.list()
 */

export type AdminConfig = {
	apiKey: string
	baseUrl?: string
}

type RequestOptions = {
	method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
	body?: unknown
	params?: Record<string, string | number | boolean | undefined>
}

type PaginationMeta = {
	total: number
	page: number
	limit: number
	totalPages: number
	hasMore: boolean
}

type PaginatedResponse<T> = {
	data: T[]
	meta: PaginationMeta
}

type ListOptions = {
	page?: number
	limit?: number
	search?: string
	sort_by?: string
	sort_order?: 'asc' | 'desc'
}

// ============================================
// Client
// ============================================

export class AdminClient {
	private apiKey: string
	private baseUrl: string

	constructor(config: AdminConfig) {
		this.apiKey = config.apiKey
		this.baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://app.quickdash.net'
	}

	private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
		const { method = 'GET', body, params } = options

		let url = `${this.baseUrl}/api/v1${endpoint}`
		if (params) {
			const searchParams = new URLSearchParams()
			for (const [key, value] of Object.entries(params)) {
				if (value !== undefined) {
					searchParams.set(key, String(value))
				}
			}
			const queryString = searchParams.toString()
			if (queryString) {
				url += `?${queryString}`
			}
		}

		const headers: Record<string, string> = {
			'X-API-Key': this.apiKey,
			'Content-Type': 'application/json',
		}

		const response = await fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		})

		const data = await response.json()

		if (!response.ok) {
			throw new AdminApiError(data.error || 'Request failed', response.status, data.code, data)
		}

		return data as T
	}

	// ============================================
	// Products
	// ============================================

	products = {
		list: async (options?: ListOptions & {
			category_id?: string
			active?: boolean
		}): Promise<PaginatedResponse<Record<string, unknown>>> => {
			return this.request('/products', { params: options as Record<string, string | number | boolean | undefined> })
		},

		create: async (data: {
			name: string
			slug?: string
			description?: string
			shortDescription?: string
			price?: number | string
			compareAtPrice?: number | string
			costPrice?: number | string
			isActive?: boolean
			isFeatured?: boolean
			isSubscribable?: boolean
			images?: string[]
			thumbnail?: string
			categoryId?: string
			tags?: string[]
			weight?: number | string
			weightUnit?: string
			metaTitle?: string
			metaDescription?: string
		}): Promise<{ data: Record<string, unknown> }> => {
			return this.request('/products', { method: 'POST', body: data })
		},

		get: async (id: string): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/products/${id}`)
		},

		update: async (id: string, data: Record<string, unknown>): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/products/${id}`, { method: 'PATCH', body: data })
		},

		delete: async (id: string): Promise<{ message: string }> => {
			return this.request(`/products/${id}`, { method: 'DELETE' })
		},
	}

	// ============================================
	// Categories
	// ============================================

	categories = {
		list: async (options?: ListOptions & {
			parent_id?: string
		}): Promise<PaginatedResponse<Record<string, unknown>>> => {
			return this.request('/categories', { params: options as Record<string, string | number | boolean | undefined> })
		},

		create: async (data: {
			name: string
			slug?: string
			description?: string
			image?: string
			parentId?: string
			sortOrder?: number
		}): Promise<{ data: Record<string, unknown> }> => {
			return this.request('/categories', { method: 'POST', body: data })
		},

		get: async (id: string): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/categories/${id}`)
		},

		update: async (id: string, data: Record<string, unknown>): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/categories/${id}`, { method: 'PATCH', body: data })
		},

		delete: async (id: string): Promise<{ message: string }> => {
			return this.request(`/categories/${id}`, { method: 'DELETE' })
		},
	}

	// ============================================
	// Orders
	// ============================================

	orders = {
		list: async (options?: ListOptions & {
			status?: string
			user_id?: string
			date_from?: string
			date_to?: string
		}): Promise<PaginatedResponse<Record<string, unknown>>> => {
			return this.request('/orders', { params: options as Record<string, string | number | boolean | undefined> })
		},

		get: async (id: string): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/orders/${id}`)
		},

		update: async (id: string, data: {
			status?: string
			trackingNumber?: string
			trackingUrl?: string
			internalNotes?: string
		}): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/orders/${id}`, { method: 'PATCH', body: data })
		},
	}

	// ============================================
	// Customers
	// ============================================

	customers = {
		list: async (options?: ListOptions): Promise<PaginatedResponse<Record<string, unknown>>> => {
			return this.request('/customers', { params: options as Record<string, string | number | boolean | undefined> })
		},

		get: async (id: string): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/customers/${id}`)
		},

		update: async (id: string, data: {
			name?: string
			phone?: string
			image?: string
		}): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/customers/${id}`, { method: 'PATCH', body: data })
		},

		delete: async (id: string): Promise<{ message: string }> => {
			return this.request(`/customers/${id}`, { method: 'DELETE' })
		},
	}

	// ============================================
	// Inventory
	// ============================================

	inventory = {
		list: async (options?: ListOptions & {
			status?: 'low_stock' | 'out_of_stock'
			product_id?: string
		}): Promise<PaginatedResponse<Record<string, unknown>>> => {
			return this.request('/inventory', { params: options as Record<string, string | number | boolean | undefined> })
		},

		update: async (variantId: string, data: {
			quantity: number
			reason?: string
		}): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/inventory/${variantId}`, { method: 'PATCH', body: data })
		},
	}

	// ============================================
	// Collections (Content)
	// ============================================

	collections = {
		list: async (options?: ListOptions): Promise<PaginatedResponse<Record<string, unknown>>> => {
			return this.request('/collections', { params: options as Record<string, string | number | boolean | undefined> })
		},

		create: async (data: {
			name: string
			slug?: string
			description?: string
			schema?: Record<string, unknown>[]
			allowPublicSubmit?: boolean
		}): Promise<{ data: Record<string, unknown> }> => {
			return this.request('/collections', { method: 'POST', body: data })
		},

		get: async (id: string): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/collections/${id}`)
		},

		update: async (id: string, data: Record<string, unknown>): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/collections/${id}`, { method: 'PATCH', body: data })
		},

		delete: async (id: string): Promise<{ message: string }> => {
			return this.request(`/collections/${id}`, { method: 'DELETE' })
		},
	}

	// ============================================
	// Content Entries
	// ============================================

	entries = {
		list: async (collectionId: string, options?: ListOptions & {
			status?: string
		}): Promise<PaginatedResponse<Record<string, unknown>>> => {
			return this.request(`/collections/${collectionId}/entries`, {
				params: options as Record<string, string | number | boolean | undefined>,
			})
		},

		create: async (collectionId: string, data: {
			data: Record<string, unknown>
			status?: string
			sortOrder?: number
		}): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/collections/${collectionId}/entries`, { method: 'POST', body: data })
		},

		get: async (collectionId: string, entryId: string): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/collections/${collectionId}/entries/${entryId}`)
		},

		update: async (collectionId: string, entryId: string, data: Record<string, unknown>): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/collections/${collectionId}/entries/${entryId}`, { method: 'PATCH', body: data })
		},

		delete: async (collectionId: string, entryId: string): Promise<{ message: string }> => {
			return this.request(`/collections/${collectionId}/entries/${entryId}`, { method: 'DELETE' })
		},
	}

	// ============================================
	// Site Content (Key-Value)
	// ============================================

	siteContent = {
		list: async (options?: {
			type?: string
		}): Promise<{ data: Record<string, unknown>[] }> => {
			return this.request('/site-content', {
				params: options as Record<string, string | number | boolean | undefined>,
			})
		},

		upsert: async (data: {
			key: string
			value: string
			type?: string
		} | {
			key: string
			value: string
			type?: string
		}[]): Promise<{ data: Record<string, unknown> | Record<string, unknown>[] }> => {
			return this.request('/site-content', { method: 'PUT', body: Array.isArray(data) ? { items: data } : data })
		},

		delete: async (key: string): Promise<{ message: string }> => {
			return this.request(`/site-content/${encodeURIComponent(key)}`, { method: 'DELETE' })
		},
	}

	// ============================================
	// Blog Posts
	// ============================================

	blog = {
		list: async (options?: ListOptions & {
			status?: string
		}): Promise<PaginatedResponse<Record<string, unknown>>> => {
			return this.request('/blog', { params: options as Record<string, string | number | boolean | undefined> })
		},

		create: async (data: {
			title: string
			slug?: string
			excerpt?: string
			content?: string
			coverImage?: string
			tags?: string[]
			status?: 'draft' | 'published'
			metaTitle?: string
			metaDescription?: string
		}): Promise<{ data: Record<string, unknown> }> => {
			return this.request('/blog', { method: 'POST', body: data })
		},

		get: async (id: string): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/blog/${id}`)
		},

		update: async (id: string, data: Record<string, unknown>): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/blog/${id}`, { method: 'PATCH', body: data })
		},

		delete: async (id: string): Promise<{ message: string }> => {
			return this.request(`/blog/${id}`, { method: 'DELETE' })
		},
	}

	// ============================================
	// Pages
	// ============================================

	pages = {
		list: async (options?: ListOptions & {
			status?: string
		}): Promise<PaginatedResponse<Record<string, unknown>>> => {
			return this.request('/pages', { params: options as Record<string, string | number | boolean | undefined> })
		},

		create: async (data: {
			title: string
			slug?: string
			content?: string
			status?: 'draft' | 'published'
			metaTitle?: string
			metaDescription?: string
		}): Promise<{ data: Record<string, unknown> }> => {
			return this.request('/pages', { method: 'POST', body: data })
		},

		get: async (id: string): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/pages/${id}`)
		},

		update: async (id: string, data: Record<string, unknown>): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/pages/${id}`, { method: 'PATCH', body: data })
		},

		delete: async (id: string): Promise<{ message: string }> => {
			return this.request(`/pages/${id}`, { method: 'DELETE' })
		},
	}

	// ============================================
	// Media
	// ============================================

	media = {
		list: async (options?: ListOptions & {
			type?: string
			folder?: string
		}): Promise<PaginatedResponse<Record<string, unknown>>> => {
			return this.request('/media', { params: options as Record<string, string | number | boolean | undefined> })
		},

		delete: async (id: string): Promise<{ message: string }> => {
			return this.request(`/media/${id}`, { method: 'DELETE' })
		},
	}

	// ============================================
	// Reviews
	// ============================================

	reviews = {
		list: async (options?: ListOptions & {
			status?: 'pending' | 'approved' | 'rejected'
			product_id?: string
		}): Promise<PaginatedResponse<Record<string, unknown>>> => {
			return this.request('/reviews', { params: options as Record<string, string | number | boolean | undefined> })
		},

		get: async (id: string): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/reviews/${id}`)
		},

		moderate: async (id: string, data: {
			status: 'approved' | 'rejected'
			isFeatured?: boolean
		}): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/reviews/${id}`, { method: 'PATCH', body: data })
		},

		delete: async (id: string): Promise<{ message: string }> => {
			return this.request(`/reviews/${id}`, { method: 'DELETE' })
		},
	}

	// ============================================
	// Discounts
	// ============================================

	discounts = {
		list: async (options?: ListOptions & {
			active?: boolean
		}): Promise<PaginatedResponse<Record<string, unknown>>> => {
			return this.request('/discounts', { params: options as Record<string, string | number | boolean | undefined> })
		},

		create: async (data: {
			name: string
			code?: string
			type: 'percentage' | 'fixed'
			value: number
			minPurchase?: number
			maxUses?: number
			startsAt?: string
			expiresAt?: string
			isActive?: boolean
		}): Promise<{ data: Record<string, unknown> }> => {
			return this.request('/discounts', { method: 'POST', body: data })
		},

		get: async (id: string): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/discounts/${id}`)
		},

		update: async (id: string, data: Record<string, unknown>): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/discounts/${id}`, { method: 'PATCH', body: data })
		},

		delete: async (id: string): Promise<{ message: string }> => {
			return this.request(`/discounts/${id}`, { method: 'DELETE' })
		},
	}

	// ============================================
	// Subscriptions
	// ============================================

	subscriptions = {
		list: async (options?: ListOptions & {
			status?: string
			user_id?: string
		}): Promise<PaginatedResponse<Record<string, unknown>>> => {
			return this.request('/subscriptions', { params: options as Record<string, string | number | boolean | undefined> })
		},

		get: async (id: string): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/subscriptions/${id}`)
		},

		update: async (id: string, data: {
			status?: 'active' | 'paused' | 'cancelled'
		}): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/subscriptions/${id}`, { method: 'PATCH', body: data })
		},
	}

	// ============================================
	// Auctions
	// ============================================

	auctions = {
		list: async (options?: ListOptions & {
			status?: string
			type?: string
		}): Promise<PaginatedResponse<Record<string, unknown>>> => {
			return this.request('/auctions', { params: options as Record<string, string | number | boolean | undefined> })
		},

		create: async (data: {
			title: string
			description?: string
			images?: string[]
			type?: 'reserve' | 'no_reserve'
			startingPrice: number | string
			reservePrice?: number | string
			startsAt: string
			endsAt: string
			autoExtend?: boolean
			autoExtendMinutes?: number
			productId?: string
		}): Promise<{ data: Record<string, unknown> }> => {
			return this.request('/auctions', { method: 'POST', body: data })
		},

		get: async (id: string): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/auctions/${id}`)
		},

		update: async (id: string, data: Record<string, unknown>): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/auctions/${id}`, { method: 'PATCH', body: data })
		},

		delete: async (id: string): Promise<{ message: string }> => {
			return this.request(`/auctions/${id}`, { method: 'DELETE' })
		},
	}

	// ============================================
	// Shipping Zones
	// ============================================

	shipping = {
		zones: {
			list: async (options?: ListOptions): Promise<PaginatedResponse<Record<string, unknown>>> => {
				return this.request('/shipping/zones', {
					params: options as Record<string, string | number | boolean | undefined>,
				})
			},

			create: async (data: {
				name: string
				countries?: string[]
				states?: string[]
			}): Promise<{ data: Record<string, unknown> }> => {
				return this.request('/shipping/zones', { method: 'POST', body: data })
			},

			get: async (id: string): Promise<{ data: Record<string, unknown> }> => {
				return this.request(`/shipping/zones/${id}`)
			},

			update: async (id: string, data: Record<string, unknown>): Promise<{ data: Record<string, unknown> }> => {
				return this.request(`/shipping/zones/${id}`, { method: 'PATCH', body: data })
			},

			delete: async (id: string): Promise<{ message: string }> => {
				return this.request(`/shipping/zones/${id}`, { method: 'DELETE' })
			},
		},
	}

	// ============================================
	// Webhooks
	// ============================================

	webhooks = {
		list: async (options?: ListOptions): Promise<PaginatedResponse<Record<string, unknown>>> => {
			return this.request('/webhooks', { params: options as Record<string, string | number | boolean | undefined> })
		},

		create: async (data: {
			url: string
			events: string[]
			secret?: string
			isActive?: boolean
		}): Promise<{ data: Record<string, unknown> }> => {
			return this.request('/webhooks', { method: 'POST', body: data })
		},

		get: async (id: string): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/webhooks/${id}`)
		},

		update: async (id: string, data: Record<string, unknown>): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/webhooks/${id}`, { method: 'PATCH', body: data })
		},

		delete: async (id: string): Promise<{ message: string }> => {
			return this.request(`/webhooks/${id}`, { method: 'DELETE' })
		},
	}

	// ============================================
	// API Keys
	// ============================================

	apiKeys = {
		list: async (options?: ListOptions): Promise<PaginatedResponse<Record<string, unknown>>> => {
			return this.request('/api-keys', { params: options as Record<string, string | number | boolean | undefined> })
		},

		create: async (data: {
			name: string
			description?: string
			environment?: 'live' | 'test'
			permissions?: Record<string, boolean>
			expiresAt?: string
		}): Promise<{ data: Record<string, unknown>; key: string }> => {
			return this.request('/api-keys', { method: 'POST', body: data })
		},

		get: async (id: string): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/api-keys/${id}`)
		},

		update: async (id: string, data: Record<string, unknown>): Promise<{ data: Record<string, unknown> }> => {
			return this.request(`/api-keys/${id}`, { method: 'PATCH', body: data })
		},

		delete: async (id: string): Promise<{ message: string }> => {
			return this.request(`/api-keys/${id}`, { method: 'DELETE' })
		},
	}
}

// ============================================
// Error Class
// ============================================

export class AdminApiError extends Error {
	status: number
	code: string | undefined
	data: unknown

	constructor(message: string, status: number, code?: string, data?: unknown) {
		super(message)
		this.name = 'AdminApiError'
		this.status = status
		this.code = code
		this.data = data
	}
}

// ============================================
// Default Export
// ============================================

export default AdminClient
