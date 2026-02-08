"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageUpload } from "@/components/ui/image-upload"
import { updateSettings } from "./actions"

type Setting = {
	id: string
	key: string
	value: string | null
	group: string
}

function getVal(settings: Setting[], key: string): string {
	return settings.find((s) => s.key === key)?.value || ""
}

function getBool(settings: Setting[], key: string): boolean {
	return settings.find((s) => s.key === key)?.value === "true"
}

export function GeneralSettings({ settings }: { settings: Setting[] }) {
	// Store Info
	const [storeName, setStoreName] = useState(getVal(settings, "store_name"))
	const [tagline, setTagline] = useState(getVal(settings, "store_tagline"))
	const [logoUrl, setLogoUrl] = useState(getVal(settings, "store_logo_url"))
	const [faviconUrl, setFaviconUrl] = useState(getVal(settings, "store_favicon_url"))

	// Contact
	const [email, setEmail] = useState(getVal(settings, "contact_email"))
	const [phone, setPhone] = useState(getVal(settings, "contact_phone"))
	const [supportEmail, setSupportEmail] = useState(getVal(settings, "contact_support_email"))

	// Address
	const [street, setStreet] = useState(getVal(settings, "address_street"))
	const [city, setCity] = useState(getVal(settings, "address_city"))
	const [province, setProvince] = useState(getVal(settings, "address_province"))
	const [country, setCountry] = useState(getVal(settings, "address_country") || "Canada")
	const [postal, setPostal] = useState(getVal(settings, "address_postal"))

	// Locale
	const [currency, setCurrency] = useState(getVal(settings, "currency") || "CAD")
	const [timezone, setTimezone] = useState(getVal(settings, "timezone") || "America/Toronto")
	const [weightUnit, setWeightUnit] = useState(getVal(settings, "weight_unit") || "kg")
	const [dimensionUnit, setDimensionUnit] = useState(getVal(settings, "dimension_unit") || "cm")
	const [dateFormat, setDateFormat] = useState(getVal(settings, "date_format") || "MMM d, yyyy")
	const [measurementSystem, setMeasurementSystem] = useState(getVal(settings, "measurement_system") || "metric")

	// Handle measurement system change
	const handleMeasurementSystemChange = (system: string) => {
		setMeasurementSystem(system)
		if (system === "metric") {
			setWeightUnit("kg")
			setDimensionUnit("cm")
		} else {
			setWeightUnit("lb")
			setDimensionUnit("in")
		}
	}

	// SEO
	const [metaTitle, setMetaTitle] = useState(getVal(settings, "seo_meta_title"))
	const [metaDescription, setMetaDescription] = useState(getVal(settings, "seo_meta_description"))
	const [socialImage, setSocialImage] = useState(getVal(settings, "seo_social_image"))

	// Social Links
	const [instagram, setInstagram] = useState(getVal(settings, "social_instagram"))
	const [twitter, setTwitter] = useState(getVal(settings, "social_twitter"))
	const [facebook, setFacebook] = useState(getVal(settings, "social_facebook"))
	const [tiktok, setTiktok] = useState(getVal(settings, "social_tiktok"))
	const [youtube, setYoutube] = useState(getVal(settings, "social_youtube"))
	const [pinterest, setPinterest] = useState(getVal(settings, "social_pinterest"))
	const [linkedin, setLinkedin] = useState(getVal(settings, "social_linkedin"))
	const [discord, setDiscord] = useState(getVal(settings, "social_discord"))

	// Legal & Page URLs
	const [privacyUrl, setPrivacyUrl] = useState(getVal(settings, "legal_privacy_url"))
	const [termsUrl, setTermsUrl] = useState(getVal(settings, "legal_terms_url"))
	const [refundUrl, setRefundUrl] = useState(getVal(settings, "legal_refund_url"))
	const [cookieUrl, setCookieUrl] = useState(getVal(settings, "legal_cookie_url"))
	const [shippingPolicyUrl, setShippingPolicyUrl] = useState(getVal(settings, "legal_shipping_url"))
	const [returnsPolicyUrl, setReturnsPolicyUrl] = useState(getVal(settings, "legal_returns_url"))
	const [accessibilityUrl, setAccessibilityUrl] = useState(getVal(settings, "legal_accessibility_url"))
	const [aboutUrl, setAboutUrl] = useState(getVal(settings, "page_about_url"))
	const [contactUrl, setContactUrl] = useState(getVal(settings, "page_contact_url"))
	const [faqUrl, setFaqUrl] = useState(getVal(settings, "page_faq_url"))

	// Notifications
	const [notifyNewOrder, setNotifyNewOrder] = useState(getBool(settings, "notify_new_order"))
	const [notifyLowStock, setNotifyLowStock] = useState(getBool(settings, "notify_low_stock"))
	const [notifyReview, setNotifyReview] = useState(getBool(settings, "notify_review"))
	const [notifyDailyDigest, setNotifyDailyDigest] = useState(getBool(settings, "notify_daily_digest"))
	const [notifyFailedPayment, setNotifyFailedPayment] = useState(getBool(settings, "notify_failed_payment"))

	// Checkout
	const [guestCheckout, setGuestCheckout] = useState(getBool(settings, "checkout_guest"))
	const [requirePhone, setRequirePhone] = useState(getBool(settings, "checkout_require_phone"))
	const [termsRequired, setTermsRequired] = useState(getBool(settings, "checkout_terms_required"))
	const [ageVerification, setAgeVerification] = useState(getBool(settings, "checkout_age_verification"))
	const [autoArchiveDays, setAutoArchiveDays] = useState(getVal(settings, "order_auto_archive_days") || "30")
	const [orderPrefix, setOrderPrefix] = useState(getVal(settings, "order_prefix") || "JB-")

	// Inventory
	const [trackInventory, setTrackInventory] = useState(getBool(settings, "inventory_track") || !getVal(settings, "inventory_track"))
	const [allowBackorders, setAllowBackorders] = useState(getBool(settings, "inventory_backorders"))
	const [lowStockThreshold, setLowStockThreshold] = useState(getVal(settings, "inventory_low_stock") || "10")
	const [hideOutOfStock, setHideOutOfStock] = useState(getBool(settings, "inventory_hide_oos"))

	// Products
	const [reviewsEnabled, setReviewsEnabled] = useState(getBool(settings, "products_reviews") || !getVal(settings, "products_reviews"))
	const [ratingsEnabled, setRatingsEnabled] = useState(getBool(settings, "products_ratings") || !getVal(settings, "products_ratings"))
	const [compareEnabled, setCompareEnabled] = useState(getBool(settings, "products_compare"))
	const [wishlistEnabled, setWishlistEnabled] = useState(getBool(settings, "products_wishlist"))

	// Email
	const [emailFromName, setEmailFromName] = useState(getVal(settings, "email_from_name") || "Quickdash")
	const [emailFrom, setEmailFrom] = useState(getVal(settings, "email_from"))
	const [emailReplyTo, setEmailReplyTo] = useState(getVal(settings, "email_reply_to"))
	const [emailBcc, setEmailBcc] = useState(getVal(settings, "email_bcc"))

	// Security
	const [require2fa, setRequire2fa] = useState(getBool(settings, "security_require_2fa"))
	const [sessionTimeout, setSessionTimeout] = useState(getVal(settings, "security_session_timeout") || "24")
	const [maxLoginAttempts, setMaxLoginAttempts] = useState(getVal(settings, "security_max_login_attempts") || "5")

	// Shipping Defaults
	const [freeShippingThreshold, setFreeShippingThreshold] = useState(getVal(settings, "shipping_free_threshold"))
	const [defaultOriginCountry, setDefaultOriginCountry] = useState(getVal(settings, "shipping_origin_country") || "CA")

	// Maintenance
	const [maintenanceMode, setMaintenanceMode] = useState(getBool(settings, "maintenance_mode"))
	const [maintenanceMessage, setMaintenanceMessage] = useState(getVal(settings, "maintenance_message") || "We'll be back soon.")

	// Performance
	const [imageOptimization, setImageOptimization] = useState(getBool(settings, "perf_image_optimization") || !getVal(settings, "perf_image_optimization"))
	const [lazyLoading, setLazyLoading] = useState(getBool(settings, "perf_lazy_loading") || !getVal(settings, "perf_lazy_loading"))

	// Domain & URLs
	const [storefrontUrl, setStorefrontUrl] = useState(getVal(settings, "storefront_url"))
	const [customDomain, setCustomDomain] = useState(getVal(settings, "custom_domain"))
	const [apiUrl, setApiUrl] = useState(getVal(settings, "api_url"))
	const [cdnUrl, setCdnUrl] = useState(getVal(settings, "cdn_url"))

	// Accounts & Registration
	const [allowRegistration, setAllowRegistration] = useState(getBool(settings, "accounts_allow_registration") || !getVal(settings, "accounts_allow_registration"))
	const [emailVerificationRequired, setEmailVerificationRequired] = useState(getBool(settings, "accounts_email_verification"))
	const [defaultCustomerGroup, setDefaultCustomerGroup] = useState(getVal(settings, "accounts_default_group") || "retail")
	const [accountDeletionEnabled, setAccountDeletionEnabled] = useState(getBool(settings, "accounts_allow_deletion") || !getVal(settings, "accounts_allow_deletion"))

	// Cart
	const [cartExpiryHours, setCartExpiryHours] = useState(getVal(settings, "cart_expiry_hours") || "72")
	const [cartMinItems, setCartMinItems] = useState(getVal(settings, "cart_min_items") || "1")
	const [showSavings, setShowSavings] = useState(getBool(settings, "cart_show_savings") || !getVal(settings, "cart_show_savings"))
	const [abandonmentEmailDelay, setAbandonmentEmailDelay] = useState(getVal(settings, "cart_abandonment_delay") || "24")
	const [cartNotes, setCartNotes] = useState(getBool(settings, "cart_notes"))
	const [cartUpsells, setCartUpsells] = useState(getBool(settings, "cart_upsells"))

	// Returns & Refunds
	const [returnWindowDays, setReturnWindowDays] = useState(getVal(settings, "returns_window_days") || "30")
	const [requireReturnReason, setRequireReturnReason] = useState(getBool(settings, "returns_require_reason") || !getVal(settings, "returns_require_reason"))
	const [autoApproveReturns, setAutoApproveReturns] = useState(getBool(settings, "returns_auto_approve"))
	const [restockingFee, setRestockingFee] = useState(getVal(settings, "returns_restocking_fee") || "0")
	const [returnShippingPaidBy, setReturnShippingPaidBy] = useState(getVal(settings, "returns_shipping_paid_by") || "customer")
	const [exchangesEnabled, setExchangesEnabled] = useState(getBool(settings, "returns_exchanges") || !getVal(settings, "returns_exchanges"))

	// Loyalty & Rewards
	const [loyaltyEnabled, setLoyaltyEnabled] = useState(getBool(settings, "loyalty_enabled"))
	const [pointsPerDollar, setPointsPerDollar] = useState(getVal(settings, "loyalty_points_per_dollar") || "1")
	const [pointsExpiryDays, setPointsExpiryDays] = useState(getVal(settings, "loyalty_points_expiry") || "365")
	const [referralBonus, setReferralBonus] = useState(getVal(settings, "loyalty_referral_bonus") || "500")
	const [birthdayBonus, setBirthdayBonus] = useState(getVal(settings, "loyalty_birthday_bonus") || "100")
	const [pointsRedemptionMin, setPointsRedemptionMin] = useState(getVal(settings, "loyalty_redemption_min") || "100")

	// Gift Cards
	const [giftCardsEnabled, setGiftCardsEnabled] = useState(getBool(settings, "gift_cards_enabled"))
	const [giftCardMinValue, setGiftCardMinValue] = useState(getVal(settings, "gift_card_min") || "10")
	const [giftCardMaxValue, setGiftCardMaxValue] = useState(getVal(settings, "gift_card_max") || "500")
	const [giftCardExpiryMonths, setGiftCardExpiryMonths] = useState(getVal(settings, "gift_card_expiry_months") || "12")

	// Subscriptions
	const [subRetryAttempts, setSubRetryAttempts] = useState(getVal(settings, "sub_retry_attempts") || "3")
	const [subGracePeriodDays, setSubGracePeriodDays] = useState(getVal(settings, "sub_grace_period") || "3")
	const [subDunningEmails, setSubDunningEmails] = useState(getBool(settings, "sub_dunning_emails") || !getVal(settings, "sub_dunning_emails"))
	const [subPauseEnabled, setSubPauseEnabled] = useState(getBool(settings, "sub_pause_enabled") || !getVal(settings, "sub_pause_enabled"))
	const [subSkipEnabled, setSubSkipEnabled] = useState(getBool(settings, "sub_skip_enabled") || !getVal(settings, "sub_skip_enabled"))

	// Discounts
	const [maxDiscountsPerOrder, setMaxDiscountsPerOrder] = useState(getVal(settings, "discounts_max_per_order") || "1")
	const [stackDiscounts, setStackDiscounts] = useState(getBool(settings, "discounts_stack"))
	const [autoApplyDiscounts, setAutoApplyDiscounts] = useState(getBool(settings, "discounts_auto_apply"))
	const [showDiscountField, setShowDiscountField] = useState(getBool(settings, "discounts_show_field") || !getVal(settings, "discounts_show_field"))

	// Reviews (extended)
	const [reviewAutoApprove, setReviewAutoApprove] = useState(getBool(settings, "reviews_auto_approve"))
	const [reviewMinPurchase, setReviewMinPurchase] = useState(getBool(settings, "reviews_min_purchase"))
	const [reviewRequestDelay, setReviewRequestDelay] = useState(getVal(settings, "reviews_request_delay") || "7")
	const [reviewPhotos, setReviewPhotos] = useState(getBool(settings, "reviews_photos") || !getVal(settings, "reviews_photos"))

	// Search
	const [searchAutocomplete, setSearchAutocomplete] = useState(getBool(settings, "search_autocomplete") || !getVal(settings, "search_autocomplete"))
	const [searchRecentEnabled, setSearchRecentEnabled] = useState(getBool(settings, "search_recent") || !getVal(settings, "search_recent"))
	const [searchPopular, setSearchPopular] = useState(getBool(settings, "search_popular") || !getVal(settings, "search_popular"))
	const [searchTypoTolerance, setSearchTypoTolerance] = useState(getBool(settings, "search_typo_tolerance") || !getVal(settings, "search_typo_tolerance"))

	// Customer Communication
	const [commsOrderUpdates, setCommsOrderUpdates] = useState(getBool(settings, "comms_order_updates") || !getVal(settings, "comms_order_updates"))
	const [commsShippingUpdates, setCommsShippingUpdates] = useState(getBool(settings, "comms_shipping_updates") || !getVal(settings, "comms_shipping_updates"))
	const [commsDeliveryConfirm, setCommsDeliveryConfirm] = useState(getBool(settings, "comms_delivery_confirm") || !getVal(settings, "comms_delivery_confirm"))
	const [commsReviewRequest, setCommsReviewRequest] = useState(getBool(settings, "comms_review_request"))
	const [commsMarketing, setCommsMarketing] = useState(getBool(settings, "comms_marketing"))
	const [commsRestock, setCommsRestock] = useState(getBool(settings, "comms_restock"))

	// Storefront Display
	const [productsPerPage, setProductsPerPage] = useState(getVal(settings, "storefront_products_per_page") || "24")
	const [defaultSort, setDefaultSort] = useState(getVal(settings, "storefront_default_sort") || "newest")
	const [showStockCount, setShowStockCount] = useState(getBool(settings, "storefront_show_stock"))
	const [showSoldCount, setShowSoldCount] = useState(getBool(settings, "storefront_show_sold"))
	const [quickView, setQuickView] = useState(getBool(settings, "storefront_quick_view"))
	const [infiniteScroll, setInfiniteScroll] = useState(getBool(settings, "storefront_infinite_scroll"))

	// Images & Uploads
	const [maxUploadSizeMb, setMaxUploadSizeMb] = useState(getVal(settings, "uploads_max_size_mb") || "10")
	const [allowedFormats, setAllowedFormats] = useState(getVal(settings, "uploads_allowed_formats") || "jpg,png,webp,gif")
	const [thumbnailSize, setThumbnailSize] = useState(getVal(settings, "uploads_thumbnail_size") || "300")
	const [watermarkEnabled, setWatermarkEnabled] = useState(getBool(settings, "uploads_watermark"))

	// Webhooks
	const [webhookRetryAttempts, setWebhookRetryAttempts] = useState(getVal(settings, "webhooks_retry_attempts") || "3")
	const [webhookTimeoutSec, setWebhookTimeoutSec] = useState(getVal(settings, "webhooks_timeout_sec") || "30")
	const [webhookSignatureVerification, setWebhookSignatureVerification] = useState(getBool(settings, "webhooks_signature") || !getVal(settings, "webhooks_signature"))

	// Data & Privacy
	const [dataRetentionDays, setDataRetentionDays] = useState(getVal(settings, "privacy_data_retention") || "730")
	const [anonymizeAfterDays, setAnonymizeAfterDays] = useState(getVal(settings, "privacy_anonymize_after") || "365")
	const [gdprMode, setGdprMode] = useState(getBool(settings, "privacy_gdpr"))
	const [cookieConsent, setCookieConsent] = useState(getBool(settings, "privacy_cookie_consent") || !getVal(settings, "privacy_cookie_consent"))
	const [dataExportEnabled, setDataExportEnabled] = useState(getBool(settings, "privacy_data_export") || !getVal(settings, "privacy_data_export"))

	// Fulfillment
	const [autoFulfillDigital, setAutoFulfillDigital] = useState(getBool(settings, "fulfill_auto_digital") || !getVal(settings, "fulfill_auto_digital"))
	const [packingSlipEnabled, setPackingSlipEnabled] = useState(getBool(settings, "fulfill_packing_slip") || !getVal(settings, "fulfill_packing_slip"))
	const [batchProcessing, setBatchProcessing] = useState(getBool(settings, "fulfill_batch"))
	const [fulfillmentHoldHours, setFulfillmentHoldHours] = useState(getVal(settings, "fulfill_hold_hours") || "1")

	// Content & Blog
	const [blogEnabled, setBlogEnabled] = useState(getBool(settings, "content_blog"))
	const [commentsEnabled, setCommentsEnabled] = useState(getBool(settings, "content_comments"))
	const [rssFeedEnabled, setRssFeedEnabled] = useState(getBool(settings, "content_rss"))
	const [postsPerPage, setPostsPerPage] = useState(getVal(settings, "content_posts_per_page") || "10")

	// Mobile & PWA
	const [pwaEnabled, setPwaEnabled] = useState(getBool(settings, "mobile_pwa"))
	const [pushNotifications, setPushNotifications] = useState(getBool(settings, "mobile_push"))
	const [appBanner, setAppBanner] = useState(getBool(settings, "mobile_app_banner"))
	const [mobileBottomNav, setMobileBottomNav] = useState(getBool(settings, "mobile_bottom_nav") || !getVal(settings, "mobile_bottom_nav"))

	const [saving, setSaving] = useState(false)

	async function handleSaveAll() {
		setSaving(true)
		try {
			await updateSettings([
				// Store
				{ key: "store_name", value: storeName, group: "general" },
				{ key: "store_tagline", value: tagline, group: "general" },
				{ key: "store_logo_url", value: logoUrl, group: "general" },
				{ key: "store_favicon_url", value: faviconUrl, group: "general" },
				// Contact
				{ key: "contact_email", value: email, group: "general" },
				{ key: "contact_phone", value: phone, group: "general" },
				{ key: "contact_support_email", value: supportEmail, group: "general" },
				// Address
				{ key: "address_street", value: street, group: "general" },
				{ key: "address_city", value: city, group: "general" },
				{ key: "address_province", value: province, group: "general" },
				{ key: "address_country", value: country, group: "general" },
				{ key: "address_postal", value: postal, group: "general" },
				// Locale
				{ key: "currency", value: currency, group: "general" },
				{ key: "timezone", value: timezone, group: "general" },
				{ key: "measurement_system", value: measurementSystem, group: "general" },
				{ key: "weight_unit", value: weightUnit, group: "general" },
				{ key: "dimension_unit", value: dimensionUnit, group: "general" },
				{ key: "date_format", value: dateFormat, group: "general" },
				// SEO
				{ key: "seo_meta_title", value: metaTitle, group: "seo" },
				{ key: "seo_meta_description", value: metaDescription, group: "seo" },
				{ key: "seo_social_image", value: socialImage, group: "seo" },
				// Social
				{ key: "social_instagram", value: instagram, group: "social" },
				{ key: "social_twitter", value: twitter, group: "social" },
				{ key: "social_facebook", value: facebook, group: "social" },
				{ key: "social_tiktok", value: tiktok, group: "social" },
				{ key: "social_youtube", value: youtube, group: "social" },
				{ key: "social_pinterest", value: pinterest, group: "social" },
				{ key: "social_linkedin", value: linkedin, group: "social" },
				{ key: "social_discord", value: discord, group: "social" },
				// Legal
				{ key: "legal_privacy_url", value: privacyUrl, group: "legal" },
				{ key: "legal_terms_url", value: termsUrl, group: "legal" },
				{ key: "legal_refund_url", value: refundUrl, group: "legal" },
				{ key: "legal_cookie_url", value: cookieUrl, group: "legal" },
				{ key: "legal_shipping_url", value: shippingPolicyUrl, group: "legal" },
				{ key: "legal_returns_url", value: returnsPolicyUrl, group: "legal" },
				{ key: "legal_accessibility_url", value: accessibilityUrl, group: "legal" },
				// Page URLs
				{ key: "page_about_url", value: aboutUrl, group: "pages" },
				{ key: "page_contact_url", value: contactUrl, group: "pages" },
				{ key: "page_faq_url", value: faqUrl, group: "pages" },
				// Notifications
				{ key: "notify_new_order", value: String(notifyNewOrder), group: "notifications" },
				{ key: "notify_low_stock", value: String(notifyLowStock), group: "notifications" },
				{ key: "notify_review", value: String(notifyReview), group: "notifications" },
				{ key: "notify_daily_digest", value: String(notifyDailyDigest), group: "notifications" },
				{ key: "notify_failed_payment", value: String(notifyFailedPayment), group: "notifications" },
				// Checkout
				{ key: "checkout_guest", value: String(guestCheckout), group: "checkout" },
				{ key: "checkout_require_phone", value: String(requirePhone), group: "checkout" },
				{ key: "checkout_terms_required", value: String(termsRequired), group: "checkout" },
				{ key: "checkout_age_verification", value: String(ageVerification), group: "checkout" },
				{ key: "order_auto_archive_days", value: autoArchiveDays, group: "checkout" },
				{ key: "order_prefix", value: orderPrefix, group: "checkout" },
				// Inventory
				{ key: "inventory_track", value: String(trackInventory), group: "inventory" },
				{ key: "inventory_backorders", value: String(allowBackorders), group: "inventory" },
				{ key: "inventory_low_stock", value: lowStockThreshold, group: "inventory" },
				{ key: "inventory_hide_oos", value: String(hideOutOfStock), group: "inventory" },
				// Products
				{ key: "products_reviews", value: String(reviewsEnabled), group: "products" },
				{ key: "products_ratings", value: String(ratingsEnabled), group: "products" },
				{ key: "products_compare", value: String(compareEnabled), group: "products" },
				{ key: "products_wishlist", value: String(wishlistEnabled), group: "products" },
				// Email
				{ key: "email_from_name", value: emailFromName, group: "email" },
				{ key: "email_from", value: emailFrom, group: "email" },
				{ key: "email_reply_to", value: emailReplyTo, group: "email" },
				{ key: "email_bcc", value: emailBcc, group: "email" },
				// Security
				{ key: "security_require_2fa", value: String(require2fa), group: "security" },
				{ key: "security_session_timeout", value: sessionTimeout, group: "security" },
				{ key: "security_max_login_attempts", value: maxLoginAttempts, group: "security" },
				// Shipping
				{ key: "shipping_free_threshold", value: freeShippingThreshold, group: "shipping" },
				{ key: "shipping_origin_country", value: defaultOriginCountry, group: "shipping" },
				// Maintenance
				{ key: "maintenance_mode", value: String(maintenanceMode), group: "maintenance" },
				{ key: "maintenance_message", value: maintenanceMessage, group: "maintenance" },
				// Performance
				{ key: "perf_image_optimization", value: String(imageOptimization), group: "performance" },
				{ key: "perf_lazy_loading", value: String(lazyLoading), group: "performance" },
				// Domain
				{ key: "storefront_url", value: storefrontUrl, group: "domain" },
				{ key: "custom_domain", value: customDomain, group: "domain" },
				{ key: "api_url", value: apiUrl, group: "domain" },
				{ key: "cdn_url", value: cdnUrl, group: "domain" },
				// Accounts
				{ key: "accounts_allow_registration", value: String(allowRegistration), group: "accounts" },
				{ key: "accounts_email_verification", value: String(emailVerificationRequired), group: "accounts" },
				{ key: "accounts_default_group", value: defaultCustomerGroup, group: "accounts" },
				{ key: "accounts_allow_deletion", value: String(accountDeletionEnabled), group: "accounts" },
				// Cart
				{ key: "cart_expiry_hours", value: cartExpiryHours, group: "cart" },
				{ key: "cart_min_items", value: cartMinItems, group: "cart" },
				{ key: "cart_show_savings", value: String(showSavings), group: "cart" },
				{ key: "cart_abandonment_delay", value: abandonmentEmailDelay, group: "cart" },
				{ key: "cart_notes", value: String(cartNotes), group: "cart" },
				{ key: "cart_upsells", value: String(cartUpsells), group: "cart" },
				// Returns
				{ key: "returns_window_days", value: returnWindowDays, group: "returns" },
				{ key: "returns_require_reason", value: String(requireReturnReason), group: "returns" },
				{ key: "returns_auto_approve", value: String(autoApproveReturns), group: "returns" },
				{ key: "returns_restocking_fee", value: restockingFee, group: "returns" },
				{ key: "returns_shipping_paid_by", value: returnShippingPaidBy, group: "returns" },
				{ key: "returns_exchanges", value: String(exchangesEnabled), group: "returns" },
				// Loyalty
				{ key: "loyalty_enabled", value: String(loyaltyEnabled), group: "loyalty" },
				{ key: "loyalty_points_per_dollar", value: pointsPerDollar, group: "loyalty" },
				{ key: "loyalty_points_expiry", value: pointsExpiryDays, group: "loyalty" },
				{ key: "loyalty_referral_bonus", value: referralBonus, group: "loyalty" },
				{ key: "loyalty_birthday_bonus", value: birthdayBonus, group: "loyalty" },
				{ key: "loyalty_redemption_min", value: pointsRedemptionMin, group: "loyalty" },
				// Gift Cards
				{ key: "gift_cards_enabled", value: String(giftCardsEnabled), group: "gift_cards" },
				{ key: "gift_card_min", value: giftCardMinValue, group: "gift_cards" },
				{ key: "gift_card_max", value: giftCardMaxValue, group: "gift_cards" },
				{ key: "gift_card_expiry_months", value: giftCardExpiryMonths, group: "gift_cards" },
				// Subscriptions
				{ key: "sub_retry_attempts", value: subRetryAttempts, group: "subscriptions" },
				{ key: "sub_grace_period", value: subGracePeriodDays, group: "subscriptions" },
				{ key: "sub_dunning_emails", value: String(subDunningEmails), group: "subscriptions" },
				{ key: "sub_pause_enabled", value: String(subPauseEnabled), group: "subscriptions" },
				{ key: "sub_skip_enabled", value: String(subSkipEnabled), group: "subscriptions" },
				// Discounts
				{ key: "discounts_max_per_order", value: maxDiscountsPerOrder, group: "discounts" },
				{ key: "discounts_stack", value: String(stackDiscounts), group: "discounts" },
				{ key: "discounts_auto_apply", value: String(autoApplyDiscounts), group: "discounts" },
				{ key: "discounts_show_field", value: String(showDiscountField), group: "discounts" },
				// Reviews extended
				{ key: "reviews_auto_approve", value: String(reviewAutoApprove), group: "reviews" },
				{ key: "reviews_min_purchase", value: String(reviewMinPurchase), group: "reviews" },
				{ key: "reviews_request_delay", value: reviewRequestDelay, group: "reviews" },
				{ key: "reviews_photos", value: String(reviewPhotos), group: "reviews" },
				// Search
				{ key: "search_autocomplete", value: String(searchAutocomplete), group: "search" },
				{ key: "search_recent", value: String(searchRecentEnabled), group: "search" },
				{ key: "search_popular", value: String(searchPopular), group: "search" },
				{ key: "search_typo_tolerance", value: String(searchTypoTolerance), group: "search" },
				// Customer Communication
				{ key: "comms_order_updates", value: String(commsOrderUpdates), group: "comms" },
				{ key: "comms_shipping_updates", value: String(commsShippingUpdates), group: "comms" },
				{ key: "comms_delivery_confirm", value: String(commsDeliveryConfirm), group: "comms" },
				{ key: "comms_review_request", value: String(commsReviewRequest), group: "comms" },
				{ key: "comms_marketing", value: String(commsMarketing), group: "comms" },
				{ key: "comms_restock", value: String(commsRestock), group: "comms" },
				// Storefront Display
				{ key: "storefront_products_per_page", value: productsPerPage, group: "storefront" },
				{ key: "storefront_default_sort", value: defaultSort, group: "storefront" },
				{ key: "storefront_show_stock", value: String(showStockCount), group: "storefront" },
				{ key: "storefront_show_sold", value: String(showSoldCount), group: "storefront" },
				{ key: "storefront_quick_view", value: String(quickView), group: "storefront" },
				{ key: "storefront_infinite_scroll", value: String(infiniteScroll), group: "storefront" },
				// Images
				{ key: "uploads_max_size_mb", value: maxUploadSizeMb, group: "uploads" },
				{ key: "uploads_allowed_formats", value: allowedFormats, group: "uploads" },
				{ key: "uploads_thumbnail_size", value: thumbnailSize, group: "uploads" },
				{ key: "uploads_watermark", value: String(watermarkEnabled), group: "uploads" },
				// Webhooks
				{ key: "webhooks_retry_attempts", value: webhookRetryAttempts, group: "webhooks" },
				{ key: "webhooks_timeout_sec", value: webhookTimeoutSec, group: "webhooks" },
				{ key: "webhooks_signature", value: String(webhookSignatureVerification), group: "webhooks" },
				// Privacy
				{ key: "privacy_data_retention", value: dataRetentionDays, group: "privacy" },
				{ key: "privacy_anonymize_after", value: anonymizeAfterDays, group: "privacy" },
				{ key: "privacy_gdpr", value: String(gdprMode), group: "privacy" },
				{ key: "privacy_cookie_consent", value: String(cookieConsent), group: "privacy" },
				{ key: "privacy_data_export", value: String(dataExportEnabled), group: "privacy" },
				// Fulfillment
				{ key: "fulfill_auto_digital", value: String(autoFulfillDigital), group: "fulfillment" },
				{ key: "fulfill_packing_slip", value: String(packingSlipEnabled), group: "fulfillment" },
				{ key: "fulfill_batch", value: String(batchProcessing), group: "fulfillment" },
				{ key: "fulfill_hold_hours", value: fulfillmentHoldHours, group: "fulfillment" },
				// Content
				{ key: "content_blog", value: String(blogEnabled), group: "content" },
				{ key: "content_comments", value: String(commentsEnabled), group: "content" },
				{ key: "content_rss", value: String(rssFeedEnabled), group: "content" },
				{ key: "content_posts_per_page", value: postsPerPage, group: "content" },
				// Mobile
				{ key: "mobile_pwa", value: String(pwaEnabled), group: "mobile" },
				{ key: "mobile_push", value: String(pushNotifications), group: "mobile" },
				{ key: "mobile_app_banner", value: String(appBanner), group: "mobile" },
				{ key: "mobile_bottom_nav", value: String(mobileBottomNav), group: "mobile" },
			])
			toast.success("All settings saved")
		} catch {
			toast.error("Failed to save settings")
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<div>
					<p className="text-muted-foreground text-sm"><span className="sm:hidden">Store configuration.</span><span className="hidden sm:inline">Store info, checkout, inventory, SEO, security, and more.</span></p>
				</div>
				<Button size="sm" onClick={handleSaveAll} disabled={saving}>
					{saving ? "Saving..." : "Save All"}
				</Button>
			</div>

			{/* Store Info */}
			<Card>
				<CardHeader>
					<CardTitle>Store Info</CardTitle>
					<CardDescription>Your store identity and branding.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Store Name</Label>
							<Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Tagline</Label>
							<Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Premium coffee, delivered." />
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Logo</Label>
								<ImageUpload
									value={logoUrl}
									onChange={setLogoUrl}
									placeholder="Upload store logo"
								/>
								<p className="text-xs text-muted-foreground">Recommended: 400×100px PNG or SVG</p>
							</div>
							<div className="space-y-2">
								<Label>Favicon</Label>
								<ImageUpload
									value={faviconUrl}
									onChange={setFaviconUrl}
									placeholder="Upload favicon"
									accept="image/png,image/x-icon,image/svg+xml"
								/>
								<p className="text-xs text-muted-foreground">Recommended: 32×32px PNG or ICO</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Contact */}
			<Card>
				<CardHeader>
					<CardTitle>Contact</CardTitle>
					<CardDescription>How customers and partners reach you.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label>Contact Email</Label>
							<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Support Email</Label>
							<Input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@..." />
						</div>
						<div className="space-y-2">
							<Label>Phone</Label>
							<Input value={phone} onChange={(e) => setPhone(e.target.value)} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Address */}
			<Card>
				<CardHeader>
					<CardTitle>Address</CardTitle>
					<CardDescription>Your business mailing address.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label>Street</Label>
						<Input value={street} onChange={(e) => setStreet(e.target.value)} />
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
						<div className="space-y-2">
							<Label>City</Label>
							<Input value={city} onChange={(e) => setCity(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Province</Label>
							<Input value={province} onChange={(e) => setProvince(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Country</Label>
							<Input value={country} onChange={(e) => setCountry(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Postal Code</Label>
							<Input value={postal} onChange={(e) => setPostal(e.target.value)} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Locale */}
			<Card>
				<CardHeader>
					<CardTitle>Locale</CardTitle>
					<CardDescription>Currency, timezone, and measurement preferences.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label>Currency</Label>
							<Select value={currency} onValueChange={setCurrency}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
									<SelectItem value="USD">USD - US Dollar</SelectItem>
									<SelectItem value="EUR">EUR - Euro</SelectItem>
									<SelectItem value="GBP">GBP - British Pound</SelectItem>
									<SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
									<SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Timezone</Label>
							<Select value={timezone} onValueChange={setTimezone}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="America/Toronto">Eastern (Toronto)</SelectItem>
									<SelectItem value="America/Vancouver">Pacific (Vancouver)</SelectItem>
									<SelectItem value="America/Edmonton">Mountain (Edmonton)</SelectItem>
									<SelectItem value="America/Winnipeg">Central (Winnipeg)</SelectItem>
									<SelectItem value="America/Halifax">Atlantic (Halifax)</SelectItem>
									<SelectItem value="America/New_York">Eastern (New York)</SelectItem>
									<SelectItem value="America/Los_Angeles">Pacific (Los Angeles)</SelectItem>
									<SelectItem value="Europe/London">GMT (London)</SelectItem>
									<SelectItem value="Europe/Paris">CET (Paris)</SelectItem>
									<SelectItem value="Asia/Tokyo">JST (Tokyo)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Date Format</Label>
							<Select value={dateFormat} onValueChange={setDateFormat}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="MMM d, yyyy">Jan 1, 2026</SelectItem>
									<SelectItem value="dd/MM/yyyy">01/01/2026</SelectItem>
									<SelectItem value="MM/dd/yyyy">01/01/2026 (US)</SelectItem>
									<SelectItem value="yyyy-MM-dd">2026-01-01 (ISO)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Measurement System</Label>
							<Select value={measurementSystem} onValueChange={handleMeasurementSystemChange}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="metric">Metric (kg, cm)</SelectItem>
									<SelectItem value="imperial">Imperial (lb, in)</SelectItem>
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">Quick switch between metric and imperial units</p>
						</div>
						<div className="space-y-2">
							<Label>Weight Unit</Label>
							<Select value={weightUnit} onValueChange={setWeightUnit}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="kg">Kilograms (kg)</SelectItem>
									<SelectItem value="g">Grams (g)</SelectItem>
									<SelectItem value="lb">Pounds (lb)</SelectItem>
									<SelectItem value="oz">Ounces (oz)</SelectItem>
									<SelectItem value="ct">Carats (ct)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Dimension Unit</Label>
							<Select value={dimensionUnit} onValueChange={setDimensionUnit}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="cm">Centimeters (cm)</SelectItem>
									<SelectItem value="m">Meters (m)</SelectItem>
									<SelectItem value="in">Inches (in)</SelectItem>
									<SelectItem value="ft">Feet (ft)</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* SEO */}
			<Card>
				<CardHeader>
					<CardTitle>SEO</CardTitle>
					<CardDescription>Search engine optimization and social sharing defaults.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Meta Title</Label>
							<Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="Quickdash - Premium Coffee" />
						</div>
						<div className="space-y-2">
							<Label>Social Share Image</Label>
							<Input value={socialImage} onChange={(e) => setSocialImage(e.target.value)} placeholder="https://..." />
						</div>
					</div>
					<div className="space-y-2">
						<Label>Meta Description</Label>
						<Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Discover premium coffee beans..." rows={3} />
					</div>
				</CardContent>
			</Card>

			{/* Social Links */}
			<Card>
				<CardHeader>
					<CardTitle>Social Links</CardTitle>
					<CardDescription>Your brand social media profiles. Leave blank to hide from site.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
						<div className="space-y-2">
							<Label>Instagram</Label>
							<Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..." />
						</div>
						<div className="space-y-2">
							<Label>X (Twitter)</Label>
							<Input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://x.com/..." />
						</div>
						<div className="space-y-2">
							<Label>Facebook</Label>
							<Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..." />
						</div>
						<div className="space-y-2">
							<Label>TikTok</Label>
							<Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="https://tiktok.com/@..." />
						</div>
						<div className="space-y-2">
							<Label>YouTube</Label>
							<Input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/..." />
						</div>
						<div className="space-y-2">
							<Label>Pinterest</Label>
							<Input value={pinterest} onChange={(e) => setPinterest(e.target.value)} placeholder="https://pinterest.com/..." />
						</div>
						<div className="space-y-2">
							<Label>LinkedIn</Label>
							<Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/company/..." />
						</div>
						<div className="space-y-2">
							<Label>Discord</Label>
							<Input value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="https://discord.gg/..." />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Legal & Policy Pages */}
			<Card>
				<CardHeader>
					<CardTitle>Legal & Policy Pages</CardTitle>
					<CardDescription>Links to your policy and legal pages. Leave blank to hide from footer.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label>Privacy Policy</Label>
							<Input value={privacyUrl} onChange={(e) => setPrivacyUrl(e.target.value)} placeholder="/privacy" />
						</div>
						<div className="space-y-2">
							<Label>Terms of Service</Label>
							<Input value={termsUrl} onChange={(e) => setTermsUrl(e.target.value)} placeholder="/terms" />
						</div>
						<div className="space-y-2">
							<Label>Refund Policy</Label>
							<Input value={refundUrl} onChange={(e) => setRefundUrl(e.target.value)} placeholder="/refund-policy" />
						</div>
						<div className="space-y-2">
							<Label>Cookie Policy</Label>
							<Input value={cookieUrl} onChange={(e) => setCookieUrl(e.target.value)} placeholder="/cookies" />
						</div>
						<div className="space-y-2">
							<Label>Shipping Policy</Label>
							<Input value={shippingPolicyUrl} onChange={(e) => setShippingPolicyUrl(e.target.value)} placeholder="/shipping" />
						</div>
						<div className="space-y-2">
							<Label>Returns Policy</Label>
							<Input value={returnsPolicyUrl} onChange={(e) => setReturnsPolicyUrl(e.target.value)} placeholder="/returns" />
						</div>
						<div className="space-y-2">
							<Label>Accessibility Statement</Label>
							<Input value={accessibilityUrl} onChange={(e) => setAccessibilityUrl(e.target.value)} placeholder="/accessibility" />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Important Pages */}
			<Card>
				<CardHeader>
					<CardTitle>Important Pages</CardTitle>
					<CardDescription>Links to key site pages.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label>About Us</Label>
							<Input value={aboutUrl} onChange={(e) => setAboutUrl(e.target.value)} placeholder="/about" />
						</div>
						<div className="space-y-2">
							<Label>Contact</Label>
							<Input value={contactUrl} onChange={(e) => setContactUrl(e.target.value)} placeholder="/contact" />
						</div>
						<div className="space-y-2">
							<Label>FAQ</Label>
							<Input value={faqUrl} onChange={(e) => setFaqUrl(e.target.value)} placeholder="/faq" />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Orders & Checkout */}
			<Card>
				<CardHeader>
					<CardTitle>Orders & Checkout</CardTitle>
					<CardDescription>Order numbering and checkout behavior.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label>Order Number Prefix</Label>
							<Input value={orderPrefix} onChange={(e) => setOrderPrefix(e.target.value)} placeholder="JB-" />
						</div>
						<div className="space-y-2">
							<Label>Auto-Archive After (days)</Label>
							<Input type="number" value={autoArchiveDays} onChange={(e) => setAutoArchiveDays(e.target.value)} />
						</div>
					</div>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<Label>Guest Checkout</Label>
								<p className="text-xs text-muted-foreground">Allow orders without account creation</p>
							</div>
							<Switch checked={guestCheckout} onCheckedChange={setGuestCheckout} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Require Phone Number</Label>
								<p className="text-xs text-muted-foreground">Phone required at checkout</p>
							</div>
							<Switch checked={requirePhone} onCheckedChange={setRequirePhone} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Terms Acceptance Required</Label>
								<p className="text-xs text-muted-foreground">Must accept terms before placing order</p>
							</div>
							<Switch checked={termsRequired} onCheckedChange={setTermsRequired} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Age Verification</Label>
								<p className="text-xs text-muted-foreground">Require age confirmation at checkout</p>
							</div>
							<Switch checked={ageVerification} onCheckedChange={setAgeVerification} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Inventory */}
			<Card>
				<CardHeader>
					<CardTitle>Inventory</CardTitle>
					<CardDescription>Stock tracking and availability behavior.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Low Stock Threshold</Label>
							<Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} />
						</div>
					</div>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<Label>Track Inventory</Label>
								<p className="text-xs text-muted-foreground">Automatically adjust stock on orders</p>
							</div>
							<Switch checked={trackInventory} onCheckedChange={setTrackInventory} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Allow Backorders</Label>
								<p className="text-xs text-muted-foreground">Accept orders when stock is zero</p>
							</div>
							<Switch checked={allowBackorders} onCheckedChange={setAllowBackorders} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Hide Out of Stock</Label>
								<p className="text-xs text-muted-foreground">Remove sold-out products from storefront</p>
							</div>
							<Switch checked={hideOutOfStock} onCheckedChange={setHideOutOfStock} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Products */}
			<Card>
				<CardHeader>
					<CardTitle>Products</CardTitle>
					<CardDescription>Product page features and customer engagement.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between">
						<div>
							<Label>Customer Reviews</Label>
							<p className="text-xs text-muted-foreground">Allow customers to leave reviews</p>
						</div>
						<Switch checked={reviewsEnabled} onCheckedChange={setReviewsEnabled} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Star Ratings</Label>
							<p className="text-xs text-muted-foreground">Show star ratings on products</p>
						</div>
						<Switch checked={ratingsEnabled} onCheckedChange={setRatingsEnabled} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Product Compare</Label>
							<p className="text-xs text-muted-foreground">Allow side-by-side product comparison</p>
						</div>
						<Switch checked={compareEnabled} onCheckedChange={setCompareEnabled} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Wishlist</Label>
							<p className="text-xs text-muted-foreground">Let customers save products for later</p>
						</div>
						<Switch checked={wishlistEnabled} onCheckedChange={setWishlistEnabled} />
					</div>
				</CardContent>
			</Card>

			{/* Email */}
			<Card>
				<CardHeader>
					<CardTitle>Email</CardTitle>
					<CardDescription>Outgoing email sender configuration.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>From Name</Label>
							<Input value={emailFromName} onChange={(e) => setEmailFromName(e.target.value)} placeholder="Quickdash" />
						</div>
						<div className="space-y-2">
							<Label>From Email</Label>
							<Input type="email" value={emailFrom} onChange={(e) => setEmailFrom(e.target.value)} placeholder="noreply@quickdash.app" />
						</div>
						<div className="space-y-2">
							<Label>Reply-To</Label>
							<Input type="email" value={emailReplyTo} onChange={(e) => setEmailReplyTo(e.target.value)} placeholder="support@quickdash.app" />
						</div>
						<div className="space-y-2">
							<Label>BCC on Orders</Label>
							<Input type="email" value={emailBcc} onChange={(e) => setEmailBcc(e.target.value)} placeholder="orders@quickdash.app" />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Notifications */}
			<Card>
				<CardHeader>
					<CardTitle>Notifications</CardTitle>
					<CardDescription>Admin notification preferences.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between">
						<div>
							<Label>New Order</Label>
							<p className="text-xs text-muted-foreground">Email when a new order is placed</p>
						</div>
						<Switch checked={notifyNewOrder} onCheckedChange={setNotifyNewOrder} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Low Stock</Label>
							<p className="text-xs text-muted-foreground">Alert when stock falls below threshold</p>
						</div>
						<Switch checked={notifyLowStock} onCheckedChange={setNotifyLowStock} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Failed Payment</Label>
							<p className="text-xs text-muted-foreground">Alert on payment failures</p>
						</div>
						<Switch checked={notifyFailedPayment} onCheckedChange={setNotifyFailedPayment} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>New Review</Label>
							<p className="text-xs text-muted-foreground">Notify when a product review is submitted</p>
						</div>
						<Switch checked={notifyReview} onCheckedChange={setNotifyReview} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Daily Digest</Label>
							<p className="text-xs text-muted-foreground">Summary of daily activity and metrics</p>
						</div>
						<Switch checked={notifyDailyDigest} onCheckedChange={setNotifyDailyDigest} />
					</div>
				</CardContent>
			</Card>

			{/* Shipping Defaults */}
			<Card>
				<CardHeader>
					<CardTitle>Shipping Defaults</CardTitle>
					<CardDescription>Default shipping origin and thresholds.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Free Shipping Threshold ({currency})</Label>
							<Input type="number" step="0.01" value={freeShippingThreshold} onChange={(e) => setFreeShippingThreshold(e.target.value)} placeholder="No free shipping" />
						</div>
						<div className="space-y-2">
							<Label>Default Origin Country</Label>
							<Select value={defaultOriginCountry} onValueChange={setDefaultOriginCountry}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="CA">Canada</SelectItem>
									<SelectItem value="US">United States</SelectItem>
									<SelectItem value="GB">United Kingdom</SelectItem>
									<SelectItem value="AU">Australia</SelectItem>
									<SelectItem value="DE">Germany</SelectItem>
									<SelectItem value="FR">France</SelectItem>
									<SelectItem value="JP">Japan</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Security */}
			<Card>
				<CardHeader>
					<CardTitle>Security</CardTitle>
					<CardDescription>Authentication and access control settings.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Session Timeout (hours)</Label>
							<Input type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Max Login Attempts</Label>
							<Input type="number" value={maxLoginAttempts} onChange={(e) => setMaxLoginAttempts(e.target.value)} />
						</div>
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Require 2FA</Label>
							<p className="text-xs text-muted-foreground">Enforce two-factor authentication for all team members</p>
						</div>
						<Switch checked={require2fa} onCheckedChange={setRequire2fa} />
					</div>
				</CardContent>
			</Card>

			{/* Performance */}
			<Card>
				<CardHeader>
					<CardTitle>Performance</CardTitle>
					<CardDescription>Image and loading optimizations.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between">
						<div>
							<Label>Image Optimization</Label>
							<p className="text-xs text-muted-foreground">Auto-compress and resize uploaded images</p>
						</div>
						<Switch checked={imageOptimization} onCheckedChange={setImageOptimization} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Lazy Loading</Label>
							<p className="text-xs text-muted-foreground">Defer off-screen image loading</p>
						</div>
						<Switch checked={lazyLoading} onCheckedChange={setLazyLoading} />
					</div>
				</CardContent>
			</Card>

			{/* Maintenance */}
			<Card>
				<CardHeader>
					<CardTitle>Maintenance</CardTitle>
					<CardDescription>Take your storefront offline temporarily.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<Label>Maintenance Mode</Label>
							<p className="text-xs text-muted-foreground">Show maintenance page to visitors</p>
						</div>
						<Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
					</div>
					{maintenanceMode && (
						<div className="space-y-2">
							<Label>Message</Label>
							<Textarea value={maintenanceMessage} onChange={(e) => setMaintenanceMessage(e.target.value)} rows={2} />
						</div>
					)}
				</CardContent>
			</Card>

			{/* Domain & URLs */}
			<Card>
				<CardHeader>
					<CardTitle>Domain & URLs</CardTitle>
					<CardDescription>Storefront, API, and CDN endpoint configuration.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Storefront URL</Label>
							<Input value={storefrontUrl} onChange={(e) => setStorefrontUrl(e.target.value)} placeholder="https://quickdash.app" />
						</div>
						<div className="space-y-2">
							<Label>Custom Domain</Label>
							<Input value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="shop.yourdomain.com" />
						</div>
						<div className="space-y-2">
							<Label>API URL</Label>
							<Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://api.quickdash.app" />
						</div>
						<div className="space-y-2">
							<Label>CDN URL</Label>
							<Input value={cdnUrl} onChange={(e) => setCdnUrl(e.target.value)} placeholder="https://cdn.quickdash.app" />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Accounts & Registration */}
			<Card>
				<CardHeader>
					<CardTitle>Accounts & Registration</CardTitle>
					<CardDescription>Customer account creation and management.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Default Customer Group</Label>
							<Select value={defaultCustomerGroup} onValueChange={setDefaultCustomerGroup}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="retail">Retail</SelectItem>
									<SelectItem value="wholesale">Wholesale</SelectItem>
									<SelectItem value="vip">VIP</SelectItem>
									<SelectItem value="staff">Staff</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<Label>Allow Registration</Label>
								<p className="text-xs text-muted-foreground">Enable customer account creation</p>
							</div>
							<Switch checked={allowRegistration} onCheckedChange={setAllowRegistration} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Email Verification Required</Label>
								<p className="text-xs text-muted-foreground">Must verify email before first purchase</p>
							</div>
							<Switch checked={emailVerificationRequired} onCheckedChange={setEmailVerificationRequired} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Account Deletion</Label>
								<p className="text-xs text-muted-foreground">Allow customers to delete their own accounts</p>
							</div>
							<Switch checked={accountDeletionEnabled} onCheckedChange={setAccountDeletionEnabled} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Cart */}
			<Card>
				<CardHeader>
					<CardTitle>Cart</CardTitle>
					<CardDescription>Shopping cart behavior and abandonment recovery.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label>Cart Expiry (hours)</Label>
							<Input type="number" value={cartExpiryHours} onChange={(e) => setCartExpiryHours(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Minimum Items</Label>
							<Input type="number" value={cartMinItems} onChange={(e) => setCartMinItems(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Abandonment Email Delay (hrs)</Label>
							<Input type="number" value={abandonmentEmailDelay} onChange={(e) => setAbandonmentEmailDelay(e.target.value)} />
						</div>
					</div>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<Label>Show Savings</Label>
								<p className="text-xs text-muted-foreground">Display amount saved in cart</p>
							</div>
							<Switch checked={showSavings} onCheckedChange={setShowSavings} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Order Notes</Label>
								<p className="text-xs text-muted-foreground">Allow customers to add notes to cart</p>
							</div>
							<Switch checked={cartNotes} onCheckedChange={setCartNotes} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Cart Upsells</Label>
								<p className="text-xs text-muted-foreground">Show product recommendations in cart</p>
							</div>
							<Switch checked={cartUpsells} onCheckedChange={setCartUpsells} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Returns & Refunds */}
			<Card>
				<CardHeader>
					<CardTitle>Returns & Refunds</CardTitle>
					<CardDescription>Return policies and refund handling.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label>Return Window (days)</Label>
							<Input type="number" value={returnWindowDays} onChange={(e) => setReturnWindowDays(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Restocking Fee (%)</Label>
							<Input type="number" value={restockingFee} onChange={(e) => setRestockingFee(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Return Shipping Paid By</Label>
							<Select value={returnShippingPaidBy} onValueChange={setReturnShippingPaidBy}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="customer">Customer</SelectItem>
									<SelectItem value="store">Store</SelectItem>
									<SelectItem value="split">Split 50/50</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<Label>Require Return Reason</Label>
								<p className="text-xs text-muted-foreground">Customer must select a reason for return</p>
							</div>
							<Switch checked={requireReturnReason} onCheckedChange={setRequireReturnReason} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Auto-Approve Returns</Label>
								<p className="text-xs text-muted-foreground">Automatically approve return requests</p>
							</div>
							<Switch checked={autoApproveReturns} onCheckedChange={setAutoApproveReturns} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Exchanges</Label>
								<p className="text-xs text-muted-foreground">Allow product exchanges instead of refunds</p>
							</div>
							<Switch checked={exchangesEnabled} onCheckedChange={setExchangesEnabled} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Loyalty & Rewards */}
			<Card>
				<CardHeader>
					<CardTitle>Loyalty & Rewards</CardTitle>
					<CardDescription>Points program, referrals, and reward incentives.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<Label>Enable Loyalty Program</Label>
							<p className="text-xs text-muted-foreground">Customers earn points on purchases</p>
						</div>
						<Switch checked={loyaltyEnabled} onCheckedChange={setLoyaltyEnabled} />
					</div>
					{loyaltyEnabled && (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label>Points per Dollar</Label>
								<Input type="number" value={pointsPerDollar} onChange={(e) => setPointsPerDollar(e.target.value)} />
							</div>
							<div className="space-y-2">
								<Label>Points Expiry (days)</Label>
								<Input type="number" value={pointsExpiryDays} onChange={(e) => setPointsExpiryDays(e.target.value)} />
							</div>
							<div className="space-y-2">
								<Label>Minimum Redemption (pts)</Label>
								<Input type="number" value={pointsRedemptionMin} onChange={(e) => setPointsRedemptionMin(e.target.value)} />
							</div>
							<div className="space-y-2">
								<Label>Referral Bonus (pts)</Label>
								<Input type="number" value={referralBonus} onChange={(e) => setReferralBonus(e.target.value)} />
							</div>
							<div className="space-y-2">
								<Label>Birthday Bonus (pts)</Label>
								<Input type="number" value={birthdayBonus} onChange={(e) => setBirthdayBonus(e.target.value)} />
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Gift Cards */}
			<Card>
				<CardHeader>
					<CardTitle>Gift Cards</CardTitle>
					<CardDescription>Digital gift card settings and limits.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<Label>Enable Gift Cards</Label>
							<p className="text-xs text-muted-foreground">Allow purchasing and redeeming gift cards</p>
						</div>
						<Switch checked={giftCardsEnabled} onCheckedChange={setGiftCardsEnabled} />
					</div>
					{giftCardsEnabled && (
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label>Minimum Value ({currency})</Label>
								<Input type="number" value={giftCardMinValue} onChange={(e) => setGiftCardMinValue(e.target.value)} />
							</div>
							<div className="space-y-2">
								<Label>Maximum Value ({currency})</Label>
								<Input type="number" value={giftCardMaxValue} onChange={(e) => setGiftCardMaxValue(e.target.value)} />
							</div>
							<div className="space-y-2">
								<Label>Expiry (months)</Label>
								<Input type="number" value={giftCardExpiryMonths} onChange={(e) => setGiftCardExpiryMonths(e.target.value)} />
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Subscriptions */}
			<Card>
				<CardHeader>
					<CardTitle>Subscriptions</CardTitle>
					<CardDescription>Recurring order billing and dunning behavior.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Payment Retry Attempts</Label>
							<Input type="number" value={subRetryAttempts} onChange={(e) => setSubRetryAttempts(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Grace Period (days)</Label>
							<Input type="number" value={subGracePeriodDays} onChange={(e) => setSubGracePeriodDays(e.target.value)} />
						</div>
					</div>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<Label>Dunning Emails</Label>
								<p className="text-xs text-muted-foreground">Send payment failure reminders</p>
							</div>
							<Switch checked={subDunningEmails} onCheckedChange={setSubDunningEmails} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Allow Pause</Label>
								<p className="text-xs text-muted-foreground">Customers can pause their subscription</p>
							</div>
							<Switch checked={subPauseEnabled} onCheckedChange={setSubPauseEnabled} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Allow Skip</Label>
								<p className="text-xs text-muted-foreground">Customers can skip an upcoming delivery</p>
							</div>
							<Switch checked={subSkipEnabled} onCheckedChange={setSubSkipEnabled} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Discounts */}
			<Card>
				<CardHeader>
					<CardTitle>Discounts</CardTitle>
					<CardDescription>Discount codes and automatic promotion rules.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Max Discounts per Order</Label>
							<Input type="number" value={maxDiscountsPerOrder} onChange={(e) => setMaxDiscountsPerOrder(e.target.value)} />
						</div>
					</div>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<Label>Stack Discounts</Label>
								<p className="text-xs text-muted-foreground">Allow multiple discount codes per order</p>
							</div>
							<Switch checked={stackDiscounts} onCheckedChange={setStackDiscounts} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Auto-Apply Discounts</Label>
								<p className="text-xs text-muted-foreground">Automatically apply eligible promotions</p>
							</div>
							<Switch checked={autoApplyDiscounts} onCheckedChange={setAutoApplyDiscounts} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Show Discount Field</Label>
								<p className="text-xs text-muted-foreground">Display coupon code input at checkout</p>
							</div>
							<Switch checked={showDiscountField} onCheckedChange={setShowDiscountField} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Reviews (Extended) */}
			<Card>
				<CardHeader>
					<CardTitle>Reviews</CardTitle>
					<CardDescription>Review moderation and collection settings.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Review Request Delay (days)</Label>
							<Input type="number" value={reviewRequestDelay} onChange={(e) => setReviewRequestDelay(e.target.value)} />
						</div>
					</div>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<Label>Auto-Approve Reviews</Label>
								<p className="text-xs text-muted-foreground">Publish reviews without manual moderation</p>
							</div>
							<Switch checked={reviewAutoApprove} onCheckedChange={setReviewAutoApprove} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Require Purchase</Label>
								<p className="text-xs text-muted-foreground">Only verified buyers can leave reviews</p>
							</div>
							<Switch checked={reviewMinPurchase} onCheckedChange={setReviewMinPurchase} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Photo Reviews</Label>
								<p className="text-xs text-muted-foreground">Allow customers to upload images with reviews</p>
							</div>
							<Switch checked={reviewPhotos} onCheckedChange={setReviewPhotos} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Search */}
			<Card>
				<CardHeader>
					<CardTitle>Search</CardTitle>
					<CardDescription>Storefront search behavior and suggestions.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between">
						<div>
							<Label>Autocomplete</Label>
							<p className="text-xs text-muted-foreground">Show search suggestions as user types</p>
						</div>
						<Switch checked={searchAutocomplete} onCheckedChange={setSearchAutocomplete} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Recent Searches</Label>
							<p className="text-xs text-muted-foreground">Show user&apos;s recent search history</p>
						</div>
						<Switch checked={searchRecentEnabled} onCheckedChange={setSearchRecentEnabled} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Popular Searches</Label>
							<p className="text-xs text-muted-foreground">Show trending searches across all users</p>
						</div>
						<Switch checked={searchPopular} onCheckedChange={setSearchPopular} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Typo Tolerance</Label>
							<p className="text-xs text-muted-foreground">Return results even with misspelled queries</p>
						</div>
						<Switch checked={searchTypoTolerance} onCheckedChange={setSearchTypoTolerance} />
					</div>
				</CardContent>
			</Card>

			{/* Customer Communication */}
			<Card>
				<CardHeader>
					<CardTitle>Customer Communication</CardTitle>
					<CardDescription>Automated customer email triggers.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between">
						<div>
							<Label>Order Updates</Label>
							<p className="text-xs text-muted-foreground">Email on order status changes</p>
						</div>
						<Switch checked={commsOrderUpdates} onCheckedChange={setCommsOrderUpdates} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Shipping Updates</Label>
							<p className="text-xs text-muted-foreground">Tracking number and shipment notifications</p>
						</div>
						<Switch checked={commsShippingUpdates} onCheckedChange={setCommsShippingUpdates} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Delivery Confirmation</Label>
							<p className="text-xs text-muted-foreground">Email when package is delivered</p>
						</div>
						<Switch checked={commsDeliveryConfirm} onCheckedChange={setCommsDeliveryConfirm} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Review Requests</Label>
							<p className="text-xs text-muted-foreground">Ask for review after delivery</p>
						</div>
						<Switch checked={commsReviewRequest} onCheckedChange={setCommsReviewRequest} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Marketing Emails</Label>
							<p className="text-xs text-muted-foreground">Promotional and campaign emails</p>
						</div>
						<Switch checked={commsMarketing} onCheckedChange={setCommsMarketing} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Restock Notifications</Label>
							<p className="text-xs text-muted-foreground">Notify when wishlisted items are back in stock</p>
						</div>
						<Switch checked={commsRestock} onCheckedChange={setCommsRestock} />
					</div>
				</CardContent>
			</Card>

			{/* Storefront Display */}
			<Card>
				<CardHeader>
					<CardTitle>Storefront Display</CardTitle>
					<CardDescription>Product listing layout and browsing experience.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Products per Page</Label>
							<Input type="number" value={productsPerPage} onChange={(e) => setProductsPerPage(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Default Sort</Label>
							<Select value={defaultSort} onValueChange={setDefaultSort}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="newest">Newest First</SelectItem>
									<SelectItem value="price_asc">Price: Low to High</SelectItem>
									<SelectItem value="price_desc">Price: High to Low</SelectItem>
									<SelectItem value="best_selling">Best Selling</SelectItem>
									<SelectItem value="alphabetical">Alphabetical</SelectItem>
									<SelectItem value="rating">Highest Rated</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<Label>Show Stock Count</Label>
								<p className="text-xs text-muted-foreground">Display remaining stock on product pages</p>
							</div>
							<Switch checked={showStockCount} onCheckedChange={setShowStockCount} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Show Sold Count</Label>
								<p className="text-xs text-muted-foreground">Display number of units sold</p>
							</div>
							<Switch checked={showSoldCount} onCheckedChange={setShowSoldCount} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Quick View</Label>
								<p className="text-xs text-muted-foreground">Enable product quick-view modals from listings</p>
							</div>
							<Switch checked={quickView} onCheckedChange={setQuickView} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Infinite Scroll</Label>
								<p className="text-xs text-muted-foreground">Load more products on scroll instead of pagination</p>
							</div>
							<Switch checked={infiniteScroll} onCheckedChange={setInfiniteScroll} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Images & Uploads */}
			<Card>
				<CardHeader>
					<CardTitle>Images & Uploads</CardTitle>
					<CardDescription>File upload limits and image processing.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label>Max Upload Size (MB)</Label>
							<Input type="number" value={maxUploadSizeMb} onChange={(e) => setMaxUploadSizeMb(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Thumbnail Size (px)</Label>
							<Input type="number" value={thumbnailSize} onChange={(e) => setThumbnailSize(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Allowed Formats</Label>
							<Input value={allowedFormats} onChange={(e) => setAllowedFormats(e.target.value)} placeholder="jpg,png,webp,gif" />
						</div>
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Watermark</Label>
							<p className="text-xs text-muted-foreground">Apply watermark to product images</p>
						</div>
						<Switch checked={watermarkEnabled} onCheckedChange={setWatermarkEnabled} />
					</div>
				</CardContent>
			</Card>

			{/* Webhooks */}
			<Card>
				<CardHeader>
					<CardTitle>Webhooks</CardTitle>
					<CardDescription>Outbound webhook delivery and security.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Retry Attempts</Label>
							<Input type="number" value={webhookRetryAttempts} onChange={(e) => setWebhookRetryAttempts(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Timeout (seconds)</Label>
							<Input type="number" value={webhookTimeoutSec} onChange={(e) => setWebhookTimeoutSec(e.target.value)} />
						</div>
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Signature Verification</Label>
							<p className="text-xs text-muted-foreground">Sign webhook payloads with HMAC-SHA256</p>
						</div>
						<Switch checked={webhookSignatureVerification} onCheckedChange={setWebhookSignatureVerification} />
					</div>
				</CardContent>
			</Card>

			{/* Data & Privacy */}
			<Card>
				<CardHeader>
					<CardTitle>Data & Privacy</CardTitle>
					<CardDescription>Data retention, GDPR compliance, and consent.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Data Retention (days)</Label>
							<Input type="number" value={dataRetentionDays} onChange={(e) => setDataRetentionDays(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Anonymize After (days)</Label>
							<Input type="number" value={anonymizeAfterDays} onChange={(e) => setAnonymizeAfterDays(e.target.value)} />
						</div>
					</div>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<Label>GDPR Mode</Label>
								<p className="text-xs text-muted-foreground">Enable EU data protection compliance features</p>
							</div>
							<Switch checked={gdprMode} onCheckedChange={setGdprMode} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Cookie Consent Banner</Label>
								<p className="text-xs text-muted-foreground">Show cookie consent dialog to visitors</p>
							</div>
							<Switch checked={cookieConsent} onCheckedChange={setCookieConsent} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Data Export</Label>
								<p className="text-xs text-muted-foreground">Allow customers to request data export</p>
							</div>
							<Switch checked={dataExportEnabled} onCheckedChange={setDataExportEnabled} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Fulfillment */}
			<Card>
				<CardHeader>
					<CardTitle>Fulfillment</CardTitle>
					<CardDescription>Order processing and packing automation.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Hold Before Fulfillment (hours)</Label>
							<Input type="number" value={fulfillmentHoldHours} onChange={(e) => setFulfillmentHoldHours(e.target.value)} />
						</div>
					</div>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<Label>Auto-Fulfill Digital</Label>
								<p className="text-xs text-muted-foreground">Immediately fulfill digital product orders</p>
							</div>
							<Switch checked={autoFulfillDigital} onCheckedChange={setAutoFulfillDigital} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Packing Slips</Label>
								<p className="text-xs text-muted-foreground">Generate packing slips with orders</p>
							</div>
							<Switch checked={packingSlipEnabled} onCheckedChange={setPackingSlipEnabled} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Batch Processing</Label>
								<p className="text-xs text-muted-foreground">Group orders for bulk fulfillment</p>
							</div>
							<Switch checked={batchProcessing} onCheckedChange={setBatchProcessing} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Content & Blog */}
			<Card>
				<CardHeader>
					<CardTitle>Content & Blog</CardTitle>
					<CardDescription>Blog, comments, and content publishing settings.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Posts per Page</Label>
							<Input type="number" value={postsPerPage} onChange={(e) => setPostsPerPage(e.target.value)} />
						</div>
					</div>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<Label>Blog</Label>
								<p className="text-xs text-muted-foreground">Enable the blog section on storefront</p>
							</div>
							<Switch checked={blogEnabled} onCheckedChange={setBlogEnabled} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>Comments</Label>
								<p className="text-xs text-muted-foreground">Allow comments on blog posts</p>
							</div>
							<Switch checked={commentsEnabled} onCheckedChange={setCommentsEnabled} />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<Label>RSS Feed</Label>
								<p className="text-xs text-muted-foreground">Publish blog content via RSS</p>
							</div>
							<Switch checked={rssFeedEnabled} onCheckedChange={setRssFeedEnabled} />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Mobile & PWA */}
			<Card>
				<CardHeader>
					<CardTitle>Mobile & PWA</CardTitle>
					<CardDescription>Progressive web app and mobile experience.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center justify-between">
						<div>
							<Label>Progressive Web App</Label>
							<p className="text-xs text-muted-foreground">Enable installable PWA experience</p>
						</div>
						<Switch checked={pwaEnabled} onCheckedChange={setPwaEnabled} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Push Notifications</Label>
							<p className="text-xs text-muted-foreground">Send browser push notifications to customers</p>
						</div>
						<Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>App Install Banner</Label>
							<p className="text-xs text-muted-foreground">Show &quot;Add to Home Screen&quot; prompt</p>
						</div>
						<Switch checked={appBanner} onCheckedChange={setAppBanner} />
					</div>
					<div className="flex items-center justify-between">
						<div>
							<Label>Bottom Navigation</Label>
							<p className="text-xs text-muted-foreground">Show mobile bottom nav bar on storefront</p>
						</div>
						<Switch checked={mobileBottomNav} onCheckedChange={setMobileBottomNav} />
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
