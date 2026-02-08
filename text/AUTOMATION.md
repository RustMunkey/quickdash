# Quickdash Automation Pipeline

## Vision

Build a universal fulfillment pipeline that works with any supplier - even those with no API like Dripshipper. The pipeline handles order → fulfillment → tracking → customer notification automatically, with manual overrides when needed.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     quickdash FULFILLMENT PIPELINE                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CUSTOMER ORDER                                                      │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────┐                                                    │
│  │ Order       │ ← Polar webhook / manual / storefront              │
│  │ Created     │                                                    │
│  └──────┬──────┘                                                    │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────┐                                                    │
│  │ Place with  │ ← Manual (Dripshipper dashboard)                   │
│  │ Supplier    │ ← Future: API automation for supported suppliers   │
│  └──────┬──────┘                                                    │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    TRACKING INGESTION                        │    │
│  │                                                              │    │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │    │
│  │  │ Email Ingest │    │ Manual Entry │    │ API/Webhook  │   │    │
│  │  │ (Resend)     │    │ (Admin UI)   │    │ (Future)     │   │    │
│  │  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘   │    │
│  │         │                   │                   │            │    │
│  │         └───────────────────┼───────────────────┘            │    │
│  │                             ▼                                │    │
│  │                    ┌──────────────┐                          │    │
│  │                    │ Review Queue │ ← Manual override        │    │
│  │                    │ (if needed)  │                          │    │
│  │                    └──────┬───────┘                          │    │
│  └───────────────────────────┼──────────────────────────────────┘    │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    LIVE TRACKING                             │    │
│  │                                                              │    │
│  │  Tracking # → Register with 17track → Webhooks → Updates     │    │
│  │                                                              │    │
│  │  /api/webhooks/shipping/17track ← 17track webhooks           │    │
│  │                                                              │    │
│  └──────────────────────────┬───────────────────────────────────┘    │
│                             │                                        │
│                             ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                 CUSTOMER NOTIFICATIONS                       │    │
│  │                                                              │    │
│  │  Shipped → Out for Delivery → Delivered                      │    │
│  │  (Email notifications at each stage)                         │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Carrier Auto-Detection

Detect carrier from tracking number format:

| Carrier | Pattern | Example |
|---------|---------|---------|
| USPS | 20-22 digits, starts with 94/93/92 | 9400111899223456789012 |
| UPS | 1Z + 16 alphanumeric | 1Z999AA10123456784 |
| FedEx | 12-15 or 20-22 digits | 123456789012 |
| DHL | 10 digits | 1234567890 |

Auto-generates tracking URL based on carrier.

### 2. 17track Integration

Third-party service that monitors tracking across all carriers and webhooks us updates.

- **3100+ carriers supported** worldwide
- **Free tier: 100 trackings/month**
- Webhooks to our `/api/webhooks/shipping/17track`
- Normalizes status across carriers
- Auto-detect carrier from tracking number

### 3. Email Ingestion

Parse shipping emails from suppliers:

- Resend inbound webhook receives email
- Regex extracts tracking number
- Auto-detect carrier
- Match to order (by order number in subject/body)
- Add to review queue or auto-approve

### 4. Review Queue

Safety net for automated ingestion:

- Pending items at `/shipping/tracking/pending`
- Approve / Edit / Reject actions
- "Trust sender" for auto-approval
- Manual override for any tracking

### 5. Customer Notifications

Email customers on status changes:

- **Shipped**: Tracking number + link
- **Out for Delivery**: Arriving today
- **Delivered**: Confirmation

---

## Webhook Endpoints

| Endpoint | Source | Purpose |
|----------|--------|---------|
| `/api/webhooks/shipping/17track` | 17track | Live tracking status updates |
| `/api/webhooks/shipping/[carrier]` | Other carriers | Direct carrier webhooks |
| `/api/webhooks/ingest/email` | Resend inbound | Parse supplier emails |
| `/api/webhooks/polar` | Polar | Payment/subscription events |
| `/api/webhooks/resend` | Resend | Email delivery status |

---

## Environment Variables

```env
# Tracking Service (17track.net)
TRACK17_API_KEY=your-api-key-here

# Email Ingestion (optional)
RESEND_INBOUND_WEBHOOK_SECRET=

# Existing (already configured)
POLAR_WEBHOOK_SECRET=
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
```

---

## Implementation Tasks

### Phase 1: Carrier Auto-Detection
- [x] Create `lib/tracking/carrier-detector.ts`
- [x] Update order detail tracking dialog
- [x] Auto-fill carrier and generate tracking URL

### Phase 2: Enhanced Tracking UI
- [x] Show live status on order detail page
- [x] Add tracking timeline component
- [x] Show estimated delivery

### Phase 3: 17track Integration
- [x] Create `lib/tracking/service.ts` (17track client)
- [x] Register tracking on add
- [x] Handle 17track webhooks

### Phase 4: Email Ingestion
- [x] Create `/api/webhooks/ingest/email`
- [x] Create `lib/tracking/parser.ts`
- [x] Extract tracking from email body
- [x] Match to orders

### Phase 5: Review Queue
- [x] Add `reviewStatus` to shipmentTracking schema
- [x] Create `/shipping/tracking/pending` page
- [x] Approve/Edit/Reject actions
- [x] Trusted senders list

### Phase 6: Customer Notifications
- [ ] Create `lib/email/shipping-notifications.ts`
- [ ] Email templates for each status
- [ ] Trigger on webhook status change

---

## Setup Guide

### Step 1: 17track API Setup

1. Go to [17track.net](https://www.17track.net) and create an account
2. Navigate to API settings in your dashboard
3. Generate an API key
4. Add to your `.env.local`:
   ```
   TRACK17_API_KEY=your-api-key-here
   ```

### Step 2: Configure 17track Webhooks

1. In your 17track dashboard, go to Webhook settings
2. Add webhook URL: `https://your-domain.com/api/webhooks/shipping/17track`
3. Select events: All tracking status updates
4. Save the webhook

### Step 3: Email Ingestion (Optional)

To auto-parse shipping emails from Dripshipper:

1. In Resend dashboard, set up an inbound email address
2. Configure the inbound webhook URL: `https://your-domain.com/api/webhooks/ingest/email`
3. Forward Dripshipper shipping notifications to your Resend inbound address
4. Tracking numbers will be auto-extracted and matched to orders

### Step 4: Review Queue

When email parsing extracts tracking but isn't 100% confident:

1. Go to `/shipping/tracking/pending` in admin
2. Review pending items
3. Approve (associates with order), Edit (fix order association), or Reject
4. Optionally "Trust sender" to auto-approve future emails from that sender

---

## Testing

### Test Page Location
Go to **Developers → Test Page** (`/developers/test`) to test all webhook integrations.

### Testing Shipping Webhooks
1. Navigate to `/developers/test`
2. Find the "Shipping Webhook Test" section
3. Select a carrier (USPS, UPS, FedEx, etc.)
4. Choose a status to simulate (in_transit, delivered, etc.)
5. Enter an order ID to update
6. Click "Send Test Webhook"
7. Check the order page for real-time updates

### Testing Tracking Registration
1. Go to any order detail page
2. Click "Add Tracking"
3. Enter a tracking number (carrier auto-detects)
4. Enable "Track with live updates"
5. Save - tracking registers with 17track
6. Check `/developers/webhooks` for registration logs

### Testing Email Ingestion
1. Send a test email to your Resend inbound address
2. Include a tracking number in the body (e.g., "Tracking: 1Z999AA10123456784")
3. Check `/shipping/tracking/pending` for the parsed result
4. Approve to link with an order

---

## Future: Subscription Pipelines

Automation for recurring orders:

```
Success Flow:
Charge → Create Order → Notify → Fulfill → Track → Deliver

Failure Flow:
Charge Failed → Retry (3x) → Notify Customer → Pause Subscription
```

---

## Future: Node-Based Workflow Builder

Visual automation builder in the admin sidebar:

- Drag-and-drop nodes
- Triggers: order.created, payment.received, tracking.delivered
- Actions: send email, update status, call webhook, delay
- Conditions: if status is X, if amount > Y
- Custom flows for any business logic

Think: n8n / Pipedream built into Quickdash
