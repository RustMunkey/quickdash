// ============================================================================
// Quickdash SDK Types
// ============================================================================

// ----------------------------------------------------------------------------
// Configuration
// ----------------------------------------------------------------------------

export interface QuickdashConfig {
  /** Storefront API key (starts with sf_) */
  apiKey: string
  /** Base URL of the Quickdash API (defaults to https://app.quickdash.net) */
  baseUrl?: string
  /** Request timeout in milliseconds (defaults to 30000) */
  timeout?: number
}

// ----------------------------------------------------------------------------
// Common Types
// ----------------------------------------------------------------------------

export interface Pagination {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasMore: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}

export interface ListParams {
  page?: number
  limit?: number
}

// ----------------------------------------------------------------------------
// Products
// ----------------------------------------------------------------------------

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  shortDescription: string | null
  price: string
  compareAtPrice: string | null
  images: string[]
  thumbnail: string | null
  isSubscribable: boolean
  isFeatured: boolean
  category: ProductCategory | null
  tags: string[]
  createdAt: string
}

export interface ProductCategory {
  id: string
  name: string | null
  slug: string | null
}

export interface ProductListParams extends ListParams {
  category?: string
  search?: string
  featured?: boolean
  subscribable?: boolean
  sort?: "name" | "price" | "createdAt"
  order?: "asc" | "desc"
}

export interface ProductsResponse {
  products: Product[]
  pagination: Pagination
}

// ----------------------------------------------------------------------------
// Categories
// ----------------------------------------------------------------------------

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  parentId: string | null
  productCount: number
}

export interface CategoriesResponse {
  categories: Category[]
}

// ----------------------------------------------------------------------------
// Site / Store Settings
// ----------------------------------------------------------------------------

export interface SiteContact {
  email: string | null
  phone: string | null
  supportEmail: string | null
}

export interface SiteAddress {
  street: string | null
  city: string | null
  province: string | null
  country: string | null
  postal: string | null
  formatted: string | null
}

export interface SiteLocale {
  currency: string
  currencySymbol: string
  timezone: string
  weightUnit: string
  dimensionUnit: string
  dateFormat: string
}

export interface SiteSocial {
  instagram: string | null
  twitter: string | null
  facebook: string | null
  tiktok: string | null
  youtube: string | null
  pinterest: string | null
  linkedin: string | null
  discord: string | null
}

export interface SiteTheme {
  primaryColor: string
}

export interface SiteSeo {
  title: string | null
  description: string | null
  socialImage: string | null
}

export interface SiteLegal {
  privacyUrl: string | null
  termsUrl: string | null
  refundUrl: string | null
  cookieUrl: string | null
  shippingUrl: string | null
  returnsUrl: string | null
  accessibilityUrl: string | null
}

export interface SitePages {
  aboutUrl: string | null
  contactUrl: string | null
  faqUrl: string | null
}

export interface SiteFeatures {
  freeShippingThreshold: number | null
  guestCheckout: boolean
  requirePhone: boolean
  termsRequired: boolean
  ageVerification: boolean
  reviews: boolean
  ratings: boolean
  compare: boolean
  wishlist: boolean
  quickView: boolean
  infiniteScroll: boolean
}

export interface SiteDisplay {
  productsPerPage: number
  defaultSort: string
  showStock: boolean
  showSold: boolean
}

export interface SiteMaintenance {
  enabled: boolean
  message: string
}

export interface Site {
  name: string
  tagline: string | null
  logo: string | null
  favicon: string | null
  contact: SiteContact
  address: SiteAddress
  locale: SiteLocale
  social: SiteSocial
  theme: SiteTheme
  seo: SiteSeo
  legal: SiteLegal
  pages: SitePages
  features: SiteFeatures
  display: SiteDisplay
  maintenance: SiteMaintenance
}

export interface SiteResponse {
  site: Site
}

// ----------------------------------------------------------------------------
// Auth / Customers
// ----------------------------------------------------------------------------

export interface Customer {
  id: string
  email: string
  name: string
  phone: string | null
  image: string | null
}

export interface LoginInput {
  email: string
  password: string
}

export interface LoginResponse {
  user: Customer
  token: string
}

export interface RegisterInput {
  email: string
  password: string
  name: string
  phone?: string
}

export interface RegisterResponse {
  user: Customer
  token: string
}

export interface CustomerAddress {
  id: string
  firstName: string
  lastName: string
  company: string | null
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  postalCode: string
  country: string
  phone: string | null
  isDefault: boolean
}

export interface AddressInput {
  firstName: string
  lastName: string
  company?: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string
  phone?: string
  isDefault?: boolean
}

// ----------------------------------------------------------------------------
// Orders
// ----------------------------------------------------------------------------

export interface OrderItem {
  variantId: string
  productName: string
  variantName: string
  sku: string
  unitPrice: string
  quantity: number
  totalPrice: string
}

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  subtotal: string
  taxAmount: string
  shippingAmount: string
  discountAmount?: string
  total: string
  items: OrderItem[]
  shippingAddress?: CustomerAddress
  billingAddress?: CustomerAddress
  trackingNumber?: string
  trackingUrl?: string
  customerNotes?: string
  createdAt: string
  updatedAt: string
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"

export interface OrderListParams extends ListParams {
  status?: OrderStatus
}

export interface OrdersResponse {
  orders: Order[]
  pagination: Pagination
}

// ----------------------------------------------------------------------------
// Checkout
// ----------------------------------------------------------------------------

export interface CartItem {
  variantId: string
  quantity: number
}

export interface CheckoutInput {
  customerId: string
  items: CartItem[]
  shippingAddress: AddressInput
  billingAddress?: AddressInput
  customerNotes?: string
  discountCode?: string
  metadata?: Record<string, unknown>
}

export interface CheckoutResponse {
  order: Order
}

// ----------------------------------------------------------------------------
// Discounts
// ----------------------------------------------------------------------------

export interface DiscountValidation {
  valid: boolean
  code: string
  type: "percentage" | "fixed" | "free_shipping"
  value: number
  minOrderAmount: number | null
  message: string | null
}

export interface ValidateDiscountInput {
  code: string
  subtotal?: number
}

export interface ValidateDiscountResponse {
  discount: DiscountValidation
}

// ----------------------------------------------------------------------------
// Shipping
// ----------------------------------------------------------------------------

export interface ShippingRate {
  id: string
  name: string
  description: string | null
  price: string
  estimatedDays: string | null
  carrier: string | null
}

export interface ShippingRatesInput {
  country: string
  state?: string
  postalCode?: string
  weight?: number
  subtotal?: number
}

export interface ShippingRatesResponse {
  rates: ShippingRate[]
}

// ----------------------------------------------------------------------------
// Reviews
// ----------------------------------------------------------------------------

export interface Review {
  id: string
  productId: string
  customerId: string
  customerName: string
  rating: number
  title: string | null
  content: string | null
  isVerifiedPurchase: boolean
  createdAt: string
}

export interface ReviewInput {
  productId: string
  rating: number
  title?: string
  content?: string
}

export interface ReviewsResponse {
  reviews: Review[]
  pagination: Pagination
}

// ----------------------------------------------------------------------------
// Wishlist
// ----------------------------------------------------------------------------

export interface WishlistItem {
  id: string
  productId: string
  product: Product
  addedAt: string
}

export interface WishlistResponse {
  items: WishlistItem[]
}

// ----------------------------------------------------------------------------
// Auctions
// ----------------------------------------------------------------------------

export interface Auction {
  id: string
  productId: string
  product: Product
  startingPrice: string
  currentPrice: string
  reservePrice: string | null
  buyNowPrice: string | null
  minBidIncrement: string
  startTime: string
  endTime: string
  status: AuctionStatus
  totalBids: number
  highestBidderId: string | null
}

export type AuctionStatus = "upcoming" | "active" | "ended" | "sold" | "cancelled"

export interface AuctionListParams extends ListParams {
  status?: AuctionStatus
}

export interface AuctionsResponse {
  auctions: Auction[]
  pagination: Pagination
}

// ----------------------------------------------------------------------------
// Payments
// ----------------------------------------------------------------------------

export interface StripeCheckoutInput {
  orderId: string
  successUrl: string
  cancelUrl: string
}

export interface StripeCheckoutResponse {
  checkoutUrl: string
  sessionId: string
}

// ----------------------------------------------------------------------------
// Errors
// ----------------------------------------------------------------------------

export class QuickdashError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = "QuickdashError"
  }
}
