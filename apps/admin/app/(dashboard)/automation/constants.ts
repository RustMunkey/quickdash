// Trigger and action category definitions for the workflow builder
// These are client-safe constants that can be imported anywhere

export const TRIGGER_CATEGORIES = {
	orders: {
		label: "Orders",
		triggers: [
			{ value: "order.created", label: "Order Created" },
			{ value: "order.paid", label: "Order Paid" },
			{ value: "order.fulfilled", label: "Order Fulfilled" },
			{ value: "order.cancelled", label: "Order Cancelled" },
			{ value: "order.refunded", label: "Order Refunded" },
		],
	},
	customers: {
		label: "Customers",
		triggers: [
			{ value: "customer.created", label: "Customer Created" },
			{ value: "customer.updated", label: "Customer Updated" },
			{ value: "customer.tag_added", label: "Tag Added to Customer" },
		],
	},
	products: {
		label: "Products",
		triggers: [
			{ value: "product.created", label: "Product Created" },
			{ value: "product.updated", label: "Product Updated" },
			{ value: "product.low_stock", label: "Low Stock Alert" },
			{ value: "product.out_of_stock", label: "Out of Stock" },
		],
	},
	subscriptions: {
		label: "Subscriptions",
		triggers: [
			{ value: "subscription.created", label: "Subscription Created" },
			{ value: "subscription.renewed", label: "Subscription Renewed" },
			{ value: "subscription.cancelled", label: "Subscription Cancelled" },
			{ value: "subscription.payment_failed", label: "Payment Failed" },
		],
	},
	reviews: {
		label: "Reviews",
		triggers: [
			{ value: "review.created", label: "Review Created" },
			{ value: "review.approved", label: "Review Approved" },
			{ value: "review.reported", label: "Review Reported" },
		],
	},
	auctions: {
		label: "Auctions",
		triggers: [
			{ value: "auction.started", label: "Auction Started" },
			{ value: "auction.bid_placed", label: "Bid Placed" },
			{ value: "auction.ending_soon", label: "Ending Soon" },
			{ value: "auction.ended", label: "Auction Ended" },
		],
	},
	cart: {
		label: "Cart",
		triggers: [
			{ value: "cart.abandoned", label: "Cart Abandoned" },
			{ value: "cart.recovered", label: "Cart Recovered" },
		],
	},
	giftcards: {
		label: "Gift Cards",
		triggers: [
			{ value: "giftcard.purchased", label: "Gift Card Purchased" },
			{ value: "giftcard.redeemed", label: "Gift Card Redeemed" },
			{ value: "giftcard.low_balance", label: "Low Balance" },
		],
	},
	loyalty: {
		label: "Loyalty",
		triggers: [
			{ value: "loyalty.points_earned", label: "Points Earned" },
			{ value: "loyalty.tier_changed", label: "Tier Changed" },
			{ value: "loyalty.reward_redeemed", label: "Reward Redeemed" },
		],
	},
	inbox: {
		label: "Inbox",
		triggers: [
			{ value: "inbox.email_received", label: "Email Received" },
			{ value: "inbox.email_replied", label: "Email Replied" },
		],
	},
	webhooks: {
		label: "Webhooks",
		triggers: [{ value: "webhook.received", label: "Webhook Received" }],
	},
	forms: {
		label: "Forms",
		triggers: [{ value: "form.submitted", label: "Form Submitted" }],
	},
	referrals: {
		label: "Referrals",
		triggers: [
			{ value: "referral.signup", label: "Referral Signup" },
			{ value: "referral.conversion", label: "Referral Conversion" },
		],
	},
	schedule: {
		label: "Schedule",
		triggers: [
			{ value: "schedule.cron", label: "Cron Schedule" },
			{ value: "schedule.interval", label: "Interval" },
		],
	},
	manual: {
		label: "Manual",
		triggers: [{ value: "manual.trigger", label: "Manual Trigger" }],
	},
} as const

export const ACTION_CATEGORIES = {
	email: {
		label: "Email",
		actions: [
			{ value: "email.send", label: "Send Email" },
			{ value: "email.send_template", label: "Send Template Email" },
		],
	},
	notifications: {
		label: "Notifications",
		actions: [
			{ value: "notification.push", label: "Push Notification" },
			{ value: "notification.sms", label: "Send SMS" },
		],
	},
	data: {
		label: "Data",
		actions: [
			{ value: "customer.add_tag", label: "Add Customer Tag" },
			{ value: "customer.remove_tag", label: "Remove Customer Tag" },
			{ value: "customer.update_field", label: "Update Customer Field" },
			{ value: "order.add_note", label: "Add Order Note" },
			{ value: "order.update_status", label: "Update Order Status" },
			{ value: "product.update_stock", label: "Update Stock" },
		],
	},
	ai: {
		label: "AI & Bots",
		actions: [
			{ value: "ai.generate_text", label: "Generate Text" },
			{ value: "ai.analyze_sentiment", label: "Analyze Sentiment" },
			{ value: "ai.categorize", label: "Auto-Categorize" },
			{ value: "ai.translate", label: "Translate Text" },
			{ value: "ai.summarize", label: "Summarize Content" },
		],
	},
	social: {
		label: "Social Media",
		actions: [
			{ value: "twitter.post", label: "Post to X/Twitter" },
			{ value: "twitter.dm", label: "Send Twitter DM" },
			{ value: "facebook.post", label: "Post to Facebook" },
			{ value: "facebook.message", label: "Send Messenger Message" },
			{ value: "instagram.post", label: "Post to Instagram" },
			{ value: "instagram.story", label: "Post Instagram Story" },
			{ value: "linkedin.post", label: "Post to LinkedIn" },
			{ value: "tiktok.post", label: "Post to TikTok" },
			{ value: "pinterest.pin", label: "Create Pinterest Pin" },
			{ value: "threads.post", label: "Post to Threads" },
		],
	},
	communication: {
		label: "Communication",
		actions: [
			{ value: "slack.send_message", label: "Send Slack Message" },
			{ value: "discord.send_message", label: "Send Discord Message" },
			{ value: "discord.create_thread", label: "Create Discord Thread" },
			{ value: "teams.send_message", label: "Send Teams Message" },
			{ value: "telegram.send_message", label: "Send Telegram Message" },
			{ value: "whatsapp.send_message", label: "Send WhatsApp Message" },
		],
	},
	google: {
		label: "Google Suite",
		actions: [
			{ value: "google_sheets.add_row", label: "Add Google Sheet Row" },
			{ value: "google_sheets.update_row", label: "Update Google Sheet Row" },
			{ value: "google_docs.create", label: "Create Google Doc" },
			{ value: "google_slides.create", label: "Create Google Slides" },
			{ value: "google_drive.upload", label: "Upload to Google Drive" },
			{ value: "google_drive.create_folder", label: "Create Drive Folder" },
			{ value: "google_calendar.create_event", label: "Create Calendar Event" },
			{ value: "gmail.send", label: "Send Gmail" },
		],
	},
	microsoft: {
		label: "Microsoft Suite",
		actions: [
			{ value: "outlook.send_email", label: "Send Outlook Email" },
			{ value: "excel.add_row", label: "Add Excel Row" },
			{ value: "word.create_doc", label: "Create Word Doc" },
			{ value: "powerpoint.create", label: "Create PowerPoint" },
			{ value: "onedrive.upload", label: "Upload to OneDrive" },
			{ value: "microsoft_todo.create_task", label: "Create Microsoft To Do" },
		],
	},
	productivity: {
		label: "Productivity",
		actions: [
			{ value: "notion.create_page", label: "Create Notion Page" },
			{ value: "notion.update_database", label: "Update Notion Database" },
			{ value: "airtable.create_record", label: "Create Airtable Record" },
			{ value: "trello.create_card", label: "Create Trello Card" },
			{ value: "asana.create_task", label: "Create Asana Task" },
			{ value: "monday.create_item", label: "Create Monday Item" },
			{ value: "clickup.create_task", label: "Create ClickUp Task" },
			{ value: "jira.create_issue", label: "Create Jira Issue" },
			{ value: "linear.create_issue", label: "Create Linear Issue" },
		],
	},
	github: {
		label: "GitHub",
		actions: [
			{ value: "github.create_issue", label: "Create GitHub Issue" },
			{ value: "github.create_pr_comment", label: "Comment on PR" },
			{ value: "github.trigger_workflow", label: "Trigger Workflow" },
			{ value: "github.create_release", label: "Create Release" },
		],
	},
	cloudflare: {
		label: "Cloudflare",
		actions: [
			{ value: "cloudflare.purge_cache", label: "Purge Cache" },
			{ value: "cloudflare.create_dns_record", label: "Create DNS Record" },
			{ value: "cloudflare_r2.upload", label: "Upload to R2" },
		],
	},
	aws: {
		label: "AWS",
		actions: [
			{ value: "aws_s3.upload", label: "Upload to S3" },
			{ value: "aws_sns.publish", label: "Publish to SNS" },
			{ value: "aws_sqs.send_message", label: "Send SQS Message" },
			{ value: "aws_lambda.invoke", label: "Invoke Lambda" },
			{ value: "aws_ses.send_email", label: "Send SES Email" },
		],
	},
	deployment: {
		label: "Deployment",
		actions: [
			{ value: "vercel.deploy", label: "Deploy to Vercel" },
			{ value: "vercel.redeploy", label: "Redeploy Vercel" },
			{ value: "netlify.trigger_build", label: "Trigger Netlify Build" },
		],
	},
	crm: {
		label: "CRM & Sales",
		actions: [
			{ value: "hubspot.create_contact", label: "Create HubSpot Contact" },
			{ value: "hubspot.create_deal", label: "Create HubSpot Deal" },
			{ value: "salesforce.create_lead", label: "Create Salesforce Lead" },
			{ value: "pipedrive.create_deal", label: "Create Pipedrive Deal" },
			{ value: "zendesk.create_ticket", label: "Create Zendesk Ticket" },
			{ value: "intercom.send_message", label: "Send Intercom Message" },
			{ value: "freshdesk.create_ticket", label: "Create Freshdesk Ticket" },
		],
	},
	ecommerce: {
		label: "E-commerce",
		actions: [
			{ value: "shopify.create_order", label: "Create Shopify Order" },
			{ value: "stripe.create_invoice", label: "Create Stripe Invoice" },
			{ value: "mailchimp.add_subscriber", label: "Add Mailchimp Subscriber" },
			{ value: "klaviyo.add_profile", label: "Add Klaviyo Profile" },
			{ value: "sendgrid.send_email", label: "Send via SendGrid" },
		],
	},
	analytics: {
		label: "Analytics",
		actions: [
			{ value: "segment.track", label: "Track Segment Event" },
			{ value: "mixpanel.track", label: "Track Mixpanel Event" },
			{ value: "posthog.capture", label: "Capture PostHog Event" },
		],
	},
	integrations: {
		label: "Webhooks & HTTP",
		actions: [
			{ value: "webhook.send", label: "Send Webhook" },
			{ value: "http.request", label: "HTTP Request" },
		],
	},
	utilities: {
		label: "Utilities",
		actions: [
			{ value: "transform.data", label: "Transform Data" },
			{ value: "branch.split", label: "A/B Split Test" },
			{ value: "loop.foreach", label: "Loop (For Each)" },
		],
	},
	flow: {
		label: "Flow Control",
		actions: [
			{ value: "condition.if", label: "If/Then Condition" },
			{ value: "delay.wait", label: "Wait" },
			{ value: "delay.wait_until", label: "Wait Until" },
		],
	},
} as const

// Icon mapping for triggers (to be used with HugeIcons)
export const TRIGGER_ICON_MAP: Record<string, string> = {
	// Orders
	"order.created": "ShoppingCartCheck01Icon",
	"order.paid": "CreditCardIcon",
	"order.fulfilled": "PackageDeliveredIcon",
	"order.cancelled": "CancelCircleIcon",
	"order.refunded": "MoneyReceive01Icon",
	// Customers
	"customer.created": "UserAdd01Icon",
	"customer.updated": "UserEdit01Icon",
	"customer.tag_added": "Tag01Icon",
	// Products
	"product.created": "PackageAddIcon",
	"product.updated": "Edit01Icon",
	"product.low_stock": "Alert01Icon",
	"product.out_of_stock": "PackageRemoveIcon",
	// Subscriptions
	"subscription.created": "CheckmarkCircle02Icon",
	"subscription.renewed": "RefreshIcon",
	"subscription.cancelled": "CancelCircleIcon",
	"subscription.payment_failed": "CreditCardNotFoundIcon",
	// Reviews
	"review.created": "Edit01Icon",
	"review.approved": "ThumbsUpIcon",
	"review.reported": "Flag01Icon",
	// Auctions
	"auction.started": "PlayIcon",
	"auction.bid_placed": "AuctionIcon",
	"auction.ending_soon": "TimerIcon",
	"auction.ended": "HourglassIcon",
	// Cart
	"cart.abandoned": "ShoppingCartRemove01Icon",
	"cart.recovered": "ShoppingCartCheck01Icon",
	// Gift Cards
	"giftcard.purchased": "GiftIcon",
	"giftcard.redeemed": "Ticket01Icon",
	"giftcard.low_balance": "WalletNotFoundIcon",
	// Loyalty
	"loyalty.points_earned": "StarIcon",
	"loyalty.tier_changed": "Trophy01Icon",
	"loyalty.reward_redeemed": "Gift01Icon",
	// Inbox
	"inbox.email_received": "MailOpen01Icon",
	"inbox.email_replied": "MailReply01Icon",
	// Webhooks
	"webhook.received": "WebhookIcon",
	// Forms
	"form.submitted": "Form01Icon",
	// Referrals
	"referral.signup": "Share01Icon",
	"referral.conversion": "MoneyBag01Icon",
	// Schedule
	"schedule.cron": "CalendarCheckIn01Icon",
	"schedule.interval": "Clock01Icon",
	// Manual
	"manual.trigger": "Cursor01Icon",
}

// Icon mapping for actions (to be used with HugeIcons)
export const ACTION_ICON_MAP: Record<string, string> = {
	// ========================================
	// Email
	// ========================================
	"email.send": "MailSend01Icon",
	"email.send_template": "FileEditIcon",

	// ========================================
	// Notifications
	// ========================================
	"notification.push": "SmartPhone01Icon",
	"notification.sms": "MessageEdit01Icon",

	// ========================================
	// Data
	// ========================================
	"customer.add_tag": "Tag01Icon",
	"customer.remove_tag": "Tag02Icon",
	"customer.update_field": "UserEdit01Icon",
	"order.add_note": "NoteEditIcon",
	"order.update_status": "Edit01Icon",
	"product.update_stock": "Layers01Icon",

	// ========================================
	// AI & Bots
	// ========================================
	"ai.generate_text": "AiChat02Icon",
	"ai.analyze_sentiment": "AnalysisTextLinkIcon",
	"ai.categorize": "FolderLibraryIcon",
	"ai.translate": "LanguageSkillIcon",
	"ai.summarize": "TextSummaryIcon",

	// ========================================
	// Social Media
	// ========================================
	"twitter.post": "NewTwitterIcon",
	"twitter.dm": "NewTwitterIcon",
	"facebook.post": "Facebook01Icon",
	"facebook.message": "MessengerIcon",
	"instagram.post": "InstagramIcon",
	"instagram.story": "InstagramIcon",
	"linkedin.post": "Linkedin01Icon",
	"tiktok.post": "TiktokIcon",
	"pinterest.pin": "PinterestIcon",
	"threads.post": "ThreadsIcon",

	// ========================================
	// Communication
	// ========================================
	"slack.send_message": "SlackIcon",
	"discord.send_message": "DiscordIcon",
	"discord.create_thread": "DiscordIcon",
	"teams.send_message": "TeamsIcon",
	"telegram.send_message": "TelegramIcon",
	"whatsapp.send_message": "WhatsappIcon",

	// ========================================
	// Google Suite
	// ========================================
	"google_sheets.add_row": "GoogleSheetsIcon",
	"google_sheets.update_row": "GoogleSheetsIcon",
	"google_docs.create": "GoogleDocIcon",
	"google_slides.create": "GoogleIcon",
	"google_drive.upload": "GoogleDriveIcon",
	"google_drive.create_folder": "FolderAdd01Icon",
	"google_calendar.create_event": "Calendar01Icon",
	"gmail.send": "MailSend01Icon",

	// ========================================
	// Microsoft Suite
	// ========================================
	"outlook.send_email": "Mail01Icon",
	"excel.add_row": "FileExcelIcon",
	"word.create_doc": "FileWordIcon",
	"powerpoint.create": "FilePptIcon",
	"onedrive.upload": "CloudUploadIcon",
	"microsoft_todo.create_task": "CheckmarkSquare01Icon",

	// ========================================
	// Productivity
	// ========================================
	"notion.create_page": "NotionIcon",
	"notion.update_database": "NotionIcon",
	"airtable.create_record": "TableIcon",
	"trello.create_card": "TrelloIcon",
	"asana.create_task": "TaskDone02Icon",
	"monday.create_item": "Calendar03Icon",
	"clickup.create_task": "CheckmarkCircle01Icon",
	"jira.create_issue": "JiraIcon",
	"linear.create_issue": "Ticket02Icon",

	// ========================================
	// GitHub
	// ========================================
	"github.create_issue": "GithubIcon",
	"github.create_pr_comment": "GitPullRequestIcon",
	"github.trigger_workflow": "WorkflowSquare03Icon",
	"github.create_release": "Tag01Icon",

	// ========================================
	// Cloudflare
	// ========================================
	"cloudflare.purge_cache": "CloudIcon",
	"cloudflare.create_dns_record": "Globe02Icon",
	"cloudflare_r2.upload": "CloudUploadIcon",

	// ========================================
	// AWS
	// ========================================
	"aws_s3.upload": "CloudUploadIcon",
	"aws_sns.publish": "BellRing01Icon",
	"aws_sqs.send_message": "QueueIcon",
	"aws_lambda.invoke": "FunctionIcon",
	"aws_ses.send_email": "MailSend01Icon",

	// ========================================
	// Deployment
	// ========================================
	"vercel.deploy": "RocketIcon",
	"vercel.redeploy": "RefreshIcon",
	"netlify.trigger_build": "BuildingIcon",

	// ========================================
	// CRM & Sales
	// ========================================
	"hubspot.create_contact": "ContactIcon",
	"hubspot.create_deal": "SaleTag01Icon",
	"salesforce.create_lead": "CloudIcon",
	"pipedrive.create_deal": "Chart01Icon",
	"zendesk.create_ticket": "Ticket01Icon",
	"intercom.send_message": "MessageCircle01Icon",
	"freshdesk.create_ticket": "TicketStar01Icon",

	// ========================================
	// E-commerce
	// ========================================
	"shopify.create_order": "ShoppingBag01Icon",
	"stripe.create_invoice": "Invoice02Icon",
	"mailchimp.add_subscriber": "MailAdd01Icon",
	"klaviyo.add_profile": "UserAdd02Icon",
	"sendgrid.send_email": "MailSend02Icon",

	// ========================================
	// Analytics
	// ========================================
	"segment.track": "Analytics01Icon",
	"mixpanel.track": "ChartHistogramIcon",
	"posthog.capture": "ChartLineData01Icon",

	// ========================================
	// Webhooks & HTTP
	// ========================================
	"webhook.send": "WebhookIcon",
	"http.request": "Globe02Icon",

	// ========================================
	// Utilities
	// ========================================
	"transform.data": "Transform01Icon",
	"branch.split": "GitBranchIcon",
	"loop.foreach": "Repeat01Icon",

	// ========================================
	// Flow Control
	// ========================================
	"condition.if": "FilterIcon",
	"delay.wait": "PauseIcon",
	"delay.wait_until": "CalendarCheckIn01Icon",
}
