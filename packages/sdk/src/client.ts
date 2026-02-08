import {
  type QuickdashConfig,
  type ProductListParams,
  type ProductsResponse,
  type Product,
  type CategoriesResponse,
  type SiteResponse,
  type LoginInput,
  type LoginResponse,
  type RegisterInput,
  type RegisterResponse,
  type Customer,
  type CustomerAddress,
  type AddressInput,
  type OrderListParams,
  type OrdersResponse,
  type Order,
  type CheckoutInput,
  type CheckoutResponse,
  type ValidateDiscountInput,
  type ValidateDiscountResponse,
  type ShippingRatesInput,
  type ShippingRatesResponse,
  type ReviewInput,
  type Review,
  type ReviewsResponse,
  type WishlistResponse,
  type AuctionListParams,
  type AuctionsResponse,
  type Auction,
  type StripeCheckoutInput,
  type StripeCheckoutResponse,
  QuickdashError,
} from "./types"

const DEFAULT_BASE_URL = "https://app.quickdash.net"
const DEFAULT_TIMEOUT = 30000

/**
 * Quickdash Storefront SDK Client
 *
 * @example
 * ```ts
 * import { Quickdash } from "@quickdash/sdk"
 *
 * const client = new Quickdash({
 *   apiKey: "sf_your_api_key"
 * })
 *
 * // Get products
 * const { products } = await client.products.list({ limit: 10 })
 *
 * // Get site settings
 * const { site } = await client.site.get()
 * ```
 */
export class Quickdash {
  private apiKey: string
  private baseUrl: string
  private timeout: number
  private customerToken: string | null = null

  // Resource namespaces
  public readonly products: ProductsResource
  public readonly categories: CategoriesResource
  public readonly site: SiteResource
  public readonly auth: AuthResource
  public readonly orders: OrdersResource
  public readonly checkout: CheckoutResource
  public readonly discounts: DiscountsResource
  public readonly shipping: ShippingResource
  public readonly reviews: ReviewsResource
  public readonly wishlist: WishlistResource
  public readonly auctions: AuctionsResource
  public readonly payments: PaymentsResource

  constructor(config: QuickdashConfig) {
    if (!config.apiKey) {
      throw new Error("Quickdash SDK requires an apiKey")
    }
    if (!config.apiKey.startsWith("sf_")) {
      throw new Error("Invalid API key format. Storefront API keys start with 'sf_'")
    }

    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL
    this.timeout = config.timeout || DEFAULT_TIMEOUT

    // Initialize resources
    this.products = new ProductsResource(this)
    this.categories = new CategoriesResource(this)
    this.site = new SiteResource(this)
    this.auth = new AuthResource(this)
    this.orders = new OrdersResource(this)
    this.checkout = new CheckoutResource(this)
    this.discounts = new DiscountsResource(this)
    this.shipping = new ShippingResource(this)
    this.reviews = new ReviewsResource(this)
    this.wishlist = new WishlistResource(this)
    this.auctions = new AuctionsResource(this)
    this.payments = new PaymentsResource(this)
  }

  /**
   * Set the customer auth token for authenticated requests
   * Call this after login/register to enable customer-specific endpoints
   */
  setCustomerToken(token: string | null): void {
    this.customerToken = token
  }

  /**
   * Get the current customer token
   */
  getCustomerToken(): string | null {
    return this.customerToken
  }

  /**
   * Internal fetch method with auth and error handling
   */
  async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/storefront${endpoint}`

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Storefront-Key": this.apiKey,
      ...(options.headers as Record<string, string>),
    }

    // Add customer auth token if available
    if (this.customerToken) {
      headers["Authorization"] = `Bearer ${this.customerToken}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`
        let errorCode: string | undefined

        try {
          const errorBody = await response.json()
          if (errorBody.error) {
            errorMessage = errorBody.error
          }
          if (errorBody.code) {
            errorCode = errorBody.code
          }
        } catch {
          // Ignore JSON parse errors
        }

        throw new QuickdashError(errorMessage, response.status, errorCode)
      }

      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof QuickdashError) {
        throw error
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new QuickdashError("Request timed out", 408, "TIMEOUT")
      }

      throw new QuickdashError(
        error instanceof Error ? error.message : "Unknown error",
        0,
        "NETWORK_ERROR"
      )
    }
  }
}

// ============================================================================
// Resource Classes
// ============================================================================

class ProductsResource {
  constructor(private client: Quickdash) {}

  /**
   * List products with filtering and pagination
   */
  async list(params: ProductListParams = {}): Promise<ProductsResponse> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set("page", String(params.page))
    if (params.limit) searchParams.set("limit", String(params.limit))
    if (params.category) searchParams.set("category", params.category)
    if (params.search) searchParams.set("search", params.search)
    if (params.featured) searchParams.set("featured", "true")
    if (params.subscribable) searchParams.set("subscribable", "true")
    if (params.sort) searchParams.set("sort", params.sort)
    if (params.order) searchParams.set("order", params.order)

    const query = searchParams.toString()
    return this.client.fetch(`/products${query ? `?${query}` : ""}`)
  }

  /**
   * Get a single product by slug
   */
  async get(slug: string): Promise<{ product: Product }> {
    return this.client.fetch(`/products/${encodeURIComponent(slug)}`)
  }
}

class CategoriesResource {
  constructor(private client: Quickdash) {}

  /**
   * List all categories
   */
  async list(): Promise<CategoriesResponse> {
    return this.client.fetch("/categories")
  }
}

class SiteResource {
  constructor(private client: Quickdash) {}

  /**
   * Get site configuration and settings
   */
  async get(): Promise<SiteResponse> {
    return this.client.fetch("/site")
  }
}

class AuthResource {
  constructor(private client: Quickdash) {}

  /**
   * Log in a customer
   * Automatically stores the token for subsequent requests
   */
  async login(input: LoginInput): Promise<LoginResponse> {
    const response = await this.client.fetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    })
    this.client.setCustomerToken(response.token)
    return response
  }

  /**
   * Register a new customer
   * Automatically stores the token for subsequent requests
   */
  async register(input: RegisterInput): Promise<RegisterResponse> {
    const response = await this.client.fetch<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    })
    this.client.setCustomerToken(response.token)
    return response
  }

  /**
   * Get the current authenticated customer
   */
  async me(): Promise<{ user: Customer }> {
    return this.client.fetch("/auth/me")
  }

  /**
   * Log out (clears the stored token)
   */
  logout(): void {
    this.client.setCustomerToken(null)
  }

  /**
   * Get customer addresses
   */
  async getAddresses(): Promise<{ addresses: CustomerAddress[] }> {
    return this.client.fetch("/auth/addresses")
  }

  /**
   * Add a new address
   */
  async addAddress(input: AddressInput): Promise<{ address: CustomerAddress }> {
    return this.client.fetch("/auth/addresses", {
      method: "POST",
      body: JSON.stringify(input),
    })
  }
}

class OrdersResource {
  constructor(private client: Quickdash) {}

  /**
   * List customer orders
   */
  async list(params: OrderListParams = {}): Promise<OrdersResponse> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set("page", String(params.page))
    if (params.limit) searchParams.set("limit", String(params.limit))
    if (params.status) searchParams.set("status", params.status)

    const query = searchParams.toString()
    return this.client.fetch(`/orders${query ? `?${query}` : ""}`)
  }

  /**
   * Get a single order by ID
   */
  async get(id: string): Promise<{ order: Order }> {
    return this.client.fetch(`/orders/${encodeURIComponent(id)}`)
  }
}

class CheckoutResource {
  constructor(private client: Quickdash) {}

  /**
   * Create an order from cart items
   */
  async create(input: CheckoutInput): Promise<CheckoutResponse> {
    return this.client.fetch("/checkout", {
      method: "POST",
      body: JSON.stringify(input),
    })
  }
}

class DiscountsResource {
  constructor(private client: Quickdash) {}

  /**
   * Validate a discount code
   */
  async validate(input: ValidateDiscountInput): Promise<ValidateDiscountResponse> {
    return this.client.fetch("/discounts/validate", {
      method: "POST",
      body: JSON.stringify(input),
    })
  }
}

class ShippingResource {
  constructor(private client: Quickdash) {}

  /**
   * Get available shipping rates
   */
  async getRates(input: ShippingRatesInput): Promise<ShippingRatesResponse> {
    const searchParams = new URLSearchParams()
    searchParams.set("country", input.country)
    if (input.state) searchParams.set("state", input.state)
    if (input.postalCode) searchParams.set("postalCode", input.postalCode)
    if (input.weight) searchParams.set("weight", String(input.weight))
    if (input.subtotal) searchParams.set("subtotal", String(input.subtotal))

    return this.client.fetch(`/shipping/rates?${searchParams.toString()}`)
  }
}

class ReviewsResource {
  constructor(private client: Quickdash) {}

  /**
   * List reviews for a product
   */
  async list(productId: string, params: { page?: number; limit?: number } = {}): Promise<ReviewsResponse> {
    const searchParams = new URLSearchParams()
    searchParams.set("productId", productId)
    if (params.page) searchParams.set("page", String(params.page))
    if (params.limit) searchParams.set("limit", String(params.limit))

    return this.client.fetch(`/reviews?${searchParams.toString()}`)
  }

  /**
   * Submit a review (requires customer auth)
   */
  async create(input: ReviewInput): Promise<{ review: Review }> {
    return this.client.fetch("/reviews", {
      method: "POST",
      body: JSON.stringify(input),
    })
  }
}

class WishlistResource {
  constructor(private client: Quickdash) {}

  /**
   * Get customer wishlist (requires customer auth)
   */
  async get(): Promise<WishlistResponse> {
    return this.client.fetch("/wishlist")
  }

  /**
   * Add product to wishlist (requires customer auth)
   */
  async add(productId: string): Promise<{ success: boolean }> {
    return this.client.fetch("/wishlist", {
      method: "POST",
      body: JSON.stringify({ productId }),
    })
  }

  /**
   * Remove product from wishlist (requires customer auth)
   */
  async remove(productId: string): Promise<{ success: boolean }> {
    return this.client.fetch(`/wishlist?productId=${encodeURIComponent(productId)}`, {
      method: "DELETE",
    })
  }
}

class AuctionsResource {
  constructor(private client: Quickdash) {}

  /**
   * List auctions
   */
  async list(params: AuctionListParams = {}): Promise<AuctionsResponse> {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set("page", String(params.page))
    if (params.limit) searchParams.set("limit", String(params.limit))
    if (params.status) searchParams.set("status", params.status)

    const query = searchParams.toString()
    return this.client.fetch(`/auctions${query ? `?${query}` : ""}`)
  }

  /**
   * Get a single auction by ID
   */
  async get(id: string): Promise<{ auction: Auction }> {
    return this.client.fetch(`/auctions/${encodeURIComponent(id)}`)
  }
}

class PaymentsResource {
  constructor(private client: Quickdash) {}

  /**
   * Create a Stripe checkout session
   */
  async createStripeCheckout(input: StripeCheckoutInput): Promise<StripeCheckoutResponse> {
    return this.client.fetch("/payments/stripe/checkout", {
      method: "POST",
      body: JSON.stringify(input),
    })
  }
}
