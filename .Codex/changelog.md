# Quickdash Changelog - Codex Session Log

## Session - 2026-07-17 - Atomic PayPal Order Finalization

### Completed
- Added reusable server-side PayPal order/capture verification.
- Changed storefront order finalization to reject unverified, incomplete, mismatched-amount, mismatched-currency, inactive-product, invalid-variant, and invalid-quantity submissions.
- Made order, line-item, payment, stock-decrement, and inventory-log writes one database transaction.
- Added conditional available-stock updates so concurrent fulfillment cannot drive inventory below reserved stock.
- Added inventory audit logs linked to the fulfilled order.
- Added capture-level idempotency: retrying the same completed PayPal capture returns the existing order instead of creating or decrementing twice.
- Added a paid `inventory_review` recovery order when inventory changes after PayPal capture, ensuring a real payment is never lost merely because automatic fulfillment cannot complete.
- Added the checkout attempt ID to PayPal's `custom_id` for provider-side traceability.
- Added a database migration for the workspace/capture unique constraint.
- Checked the live database read-only and confirmed there are no duplicate non-null payment external IDs blocking the constraint.

### Files Changed
- `apps/admin/lib/paypal.ts`
- `apps/admin/app/api/storefront/payments/paypal/checkout/route.ts`
- `apps/admin/app/api/storefront/orders/route.ts`
- `packages/db/src/schema/payments.ts`
- `packages/db/migrations/payments-external-id-idempotency.sql`
- `.Codex/changelog.md`

### Verification
- Focused admin TypeScript check passed.
- Focused Biome lint passed.
- Live production duplicate-capture preflight returned zero conflicts.

### What's Next
- Apply `packages/db/migrations/payments-external-id-idempotency.sql` to production before deploying the application code.
- Deploy the branch, then test a replay of an existing capture payload without issuing another charge.
- Add operational notification for `inventory_review` orders.
- Diagnose Resend delivery and add observable/retryable transactional email.

## Session - 2026-07-17 - Storefront Customer Order Ownership

### Completed
- Fixed storefront order creation so a valid customer bearer token attaches the new order to that customer while guest checkout remains supported.
- Replaced caller-supplied customer IDs on order list/detail reads with verified storefront customer JWT identity.
- Expanded order detail responses with payment status/method/currency, line items, flat tracking fields, and metadata-backed shipping addresses.
- Added payment currency to customer order-list responses.

### Files Changed
- `apps/admin/app/api/storefront/orders/route.ts`
- `apps/admin/app/api/storefront/orders/[id]/route.ts`
- `.Codex/changelog.md`

### Verification
- Focused TypeScript check passed.
- Focused Biome lint passed.

### What's Next
- Deploy this order ownership contract before testing a signed-in Gemsutopia checkout and My Orders/order-detail flow.
- Add a workspace/storefront customer-membership model. Registration must create membership and the Customers dashboard must query membership rather than treating order history as the only proof that a customer exists.
- Add membership-aware login plus email verification, password reset, session revocation, and complete address/profile lifecycle coverage.
- Diagnose production Resend delivery and make transactional email observable/retryable. Cover guest order confirmation first, then shipping/tracking, password reset, and email verification.

## Session - 2026-07-17 - Gemsutopia Storefront Inventory Contract

### Completed
- Fixed the storefront product-list endpoint so it returns active variants and optional inventory instead of omitting both fields.
- Fixed storefront stock values to report available quantity (`quantity - reservedQuantity`) rather than inventory that has already been reserved by pending orders.
- Fixed the single-product endpoint so it returns the same sale fields, computed current price, and sale status as the product-list endpoint.
- Added editable Products, Orders, Customers, Checkout, and Inventory permission switches to Storefront settings; changing permissions retains the existing storefront API key.
- Closed the zero-variant inventory hole in product creation: every new simple product now receives a default active variant and inventory row automatically.
- Added a Stock quantity field for new products and existing products that have no variants. Saving a legacy zero-variant product creates its default inventory variant.
- Added `workspaceId` to inventory rows created through the manual Add Variant action.
- Normalized inventory writes to non-negative whole quantities.

### Files Changed
- `apps/admin/app/api/storefront/products/route.ts`
- `apps/admin/app/api/storefront/products/[slug]/route.ts`
- `apps/admin/app/(dashboard)/settings/storefronts/storefronts-client.tsx`
- `apps/admin/app/(dashboard)/products/actions.ts`
- `apps/admin/app/(dashboard)/products/[id]/product-form.tsx`
- `.Codex/changelog.md`

### Findings
- The connected Gemsutopia product currently has no variants, so Quickdash has no inventory row from which to publish stock.
- Storefront inventory access defaults to disabled. The Gemsutopia storefront must have its new Inventory switch enabled before stock is included in authenticated storefront responses.
- These local Quickdash changes will not affect `https://app.quickdash.net` until Quickdash is deployed.
- Gemsutopia can consume the new list/detail variant and stock fields without rotating or exposing a new API key.

### Verification
- Focused admin TypeScript check passed using a temporary config that excludes stale generated `.next` route types.
- Focused Biome lint passed for all five changed application files.
- The normal admin TypeScript command remains obstructed only by pre-existing stale `.next/types/validator.ts` route errors; the changed files themselves type-check cleanly.

### What's Next
- Deploy Quickdash.
- In Quickdash Storefront settings, enable Inventory for the existing Gemsutopia storefront without regenerating its key.
- Open the existing Gemsutopia product in Quickdash, enter its real stock quantity, and save once to create its default variant/inventory record.
- Re-run the Gemsutopia product list, product detail, cart, and PayPal checkout smoke tests against deployed Quickdash.

## Session - 2026-06-26

### Completed
- Investigated why newly created Quickdash products/categories may not appear on Gemsutopia.
- Reviewed storefront product/category API routes, admin product/category create actions, schema, SDK client, package manifests, and workspace package config.
- Fixed storefront category product counts so the count is scoped to the authenticated storefront workspace.
- Fixed SDK category listing to request `?count=true`, matching the SDK type that promises `productCount`.
- Verified the current Gemsutopia storefront key against the live Quickdash API: the key is valid and returns 5 categories plus 1 active product.
- Confirmed the active product returned by the API has no category, so all category product counts are 0 and Gemsutopia category pages render empty.
- Added a Quickdash product form guard that requires a category when categories exist, plus helper copy explaining that categorized products are required for Gemsutopia category pages.
- Added `.pnpm-store/` to `.gitignore` after finding a repo-local pnpm cache with 85,345 files.
- Repaired pnpm workspace security override placement for pnpm 11 compatibility:
  - Moved active overrides from root `package.json` into `pnpm-workspace.yaml`.
  - Removed stale nested `apps/web/pnpm-workspace.yaml`.
  - Added current advisory override floors for transitive packages.
  - Bumped root `turbo` dev dependency floor to `^2.10.0`.
- Refreshed `pnpm-lock.yaml` with lockfile-only installs.

### Files Changed
- `apps/admin/app/api/storefront/categories/route.ts`
- `apps/admin/app/(dashboard)/products/[id]/product-form.tsx`
- `packages/sdk/src/client.ts`
- `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `.gitignore`
- `apps/web/pnpm-workspace.yaml` (removed)
- `.Codex/changelog.md`

### Findings
- Storefront product lists only return products where `isActive = true`; inactive products will not show on Gemsutopia.
- Storefront access is fully determined by `X-Storefront-Key`; if Gemsutopia uses an old key or a key from another workspace, new records from the current workspace will not show.
- Gemsutopia category pages only show products assigned to the matching Quickdash category. Creating a product with no category makes it effectively invisible from those category pages even when it is active.
- The Gemsutopia site only needs a Storefront API key for reads/customer-safe operations. An Admin/API key is only needed for trusted server-side management writes and must never be exposed as `NEXT_PUBLIC_*`.
- Product/category slugs are globally unique in the schema, not workspace-scoped. This can block duplicate slugs across tenants and should be migrated to workspace-scoped unique indexes.
- `pnpm lint` now clears pnpm's build-script approval guard, but fails on existing repo lint debt:
  - `apps/web` ESLint crashes in `@eslint/eslintrc`/AJV.
  - `apps/admin` Biome reports a large pre-existing formatting/rule backlog.
- Audit is reduced to two remaining high advisories, both from `xlsx@0.18.5`.
- The local `.env.local` points to Postgres on `localhost:5434`; the DB was not running, so live Gemsutopia workspace data could not be verified from this checkout.
- A repo-local `.pnpm-store` cache existed with 85,345 files and about 1.2GB of data. It should not be committed.

### Verification
- `pnpm audit --json` now reports only `xlsx` advisories: 2 high, 0 critical.
- `biome lint apps/admin/app/api/storefront/categories/route.ts packages/sdk/src/client.ts` passed.
- `biome lint apps/admin/app/(dashboard)/products/[id]/product-form.tsx apps/admin/app/api/storefront/categories/route.ts packages/sdk/src/client.ts` passed.
- `tsc --noEmit -p packages/sdk/tsconfig.json` passed via the local TypeScript package.
- `tsc --noEmit -p apps/admin/tsconfig.json` passed via the local TypeScript package.

### What's Next
- Update existing uncategorized products in Reese's Quickdash workspace by assigning a category, then refresh/deploy Gemsutopia.
- Confirm Gemsutopia production has `NEXT_PUBLIC_STOREFRONT_API_KEY` and `NEXT_PUBLIC_STOREFRONT_URL` set to the current Quickdash workspace values.
- Replace `xlsx` or switch to the maintained SheetJS distribution source to clear the last audit advisories.
- Add a database migration to make product/category slugs unique per workspace instead of globally unique.
- Triage full lint separately: fix the web ESLint/AJV crash, then decide whether to mass-format admin or relax formatting checks.

## Session - 2026-06-27

### Completed
- Re-scanned the Quickdash/Gemsutopia product and category publishing flow after Reese still saw broken storefront behavior.
- Verified the live Storefront API now returns the active product under category `natural-rough1`, but `/categories?count=true` still reports `productCount: 0` for that category.
- Reworked the storefront categories endpoint to compute active product counts with an explicit grouped product query instead of a raw correlated count subquery.
- Added `Cache-Control: no-store, max-age=0` to authenticated Storefront API responses so storefront publish testing cannot receive stale API payloads.
- Audited the dashboard route map, API route map, navigation model, and database schema against the desired ecommerce-only Quickdash direction.
- Tightened Storefront API CORS handling so registered storefront domains tolerate protocol and `www`/non-`www` differences instead of failing deployed browser requests on exact-domain mismatches.
- Removed the first layer of communication bloat from the admin shell: global calls provider/overlays, message sound listener, notification provider, right sidebar panel, header notification/call/friend controls, workspace-bar Messages/Calls buttons, notification nav, sales calls nav, command-palette entries, and related shortcuts.
- Soft-disabled legacy messaging/calling/notification entry pages by redirecting them back to the dashboard or settings instead of loading the retired UI.
- Fixed the post-cleanup global crash by removing the last dashboard-level `useChat` dependency from breadcrumbs after `ChatProvider` was removed.
- Removed the CRM section from the admin sidebar and command palette, then soft-disabled CRM/Sales and Scheduling routes with redirects.
- Removed the Recent section from the admin sidebar.
- Removed Billing from sidebar/search, converted billing dashboard/subpages to redirects, removed the storage footer billing link, and changed feature-gate upgrade CTAs into disabled unavailable states.
- Removed Discover/new-people entry points from the workspace rail, command palette, dashboard route, and onboarding flow.
- Removed Automation from the Operations sidebar section and command palette, then soft-disabled Automation routes with redirects.
- Removed Permissions from the Settings sidebar submenu.
- Removed the standalone Developers, System/Settings, and Growth sidebar sections.
- Moved Marketing and Content into the Operations sidebar section while keeping their routes intact.
- Added a toolbar Settings dropdown beside search for settings routes, Activity Log, and Developer Tools.
- Moved Developer Tools into the toolbar Settings dropdown and nested API Keys under Developer Tools without deleting any developer routes.
- Removed the top workspace title/role header from the main sidebar to reduce vertical clutter.
- Removed the noisy Collapse All control from the top of the main sidebar.
- Removed the empty desktop sidebar header spacer in normal mode so the Overview section aligns with the dashboard breadcrumb row.
- Tuned desktop sidebar top spacing so the first sidebar section aligns with the dashboard breadcrumb row without restoring the old header clutter.
- Removed lower-priority sidebar/search entries: Orders Returns & Refunds, Reviews Reported, Shipping Zones, Shipping Pending Review, and Marketing SEO.
- Soft-disabled `/marketing/seo` with redirects back to Marketing while leaving deeper SEO code for a later deletion pass.

### Files Changed
- `apps/admin/app/api/storefront/categories/route.ts`
- `apps/admin/lib/storefront-auth.ts`
- `apps/admin/app/(dashboard)/layout.tsx`
- `apps/admin/app/(dashboard)/messages/page.tsx`
- `apps/admin/app/(dashboard)/calls/page.tsx`
- `apps/admin/app/(dashboard)/notifications/page.tsx`
- `apps/admin/app/(dashboard)/notifications/messages/page.tsx`
- `apps/admin/app/(dashboard)/notifications/alerts/page.tsx`
- `apps/admin/app/(dashboard)/settings/notifications/page.tsx`
- `apps/admin/app/(dashboard)/sales/calls/page.tsx`
- `apps/admin/app/(dashboard)/sales/layout.tsx`
- `apps/admin/app/(dashboard)/sales/contacts/page.tsx`
- `apps/admin/app/(dashboard)/sales/contacts/[id]/page.tsx`
- `apps/admin/app/(dashboard)/sales/companies/page.tsx`
- `apps/admin/app/(dashboard)/sales/companies/[id]/page.tsx`
- `apps/admin/app/(dashboard)/sales/deals/page.tsx`
- `apps/admin/app/(dashboard)/sales/deals/[id]/page.tsx`
- `apps/admin/app/(dashboard)/sales/pipeline/page.tsx`
- `apps/admin/app/(dashboard)/sales/tasks/page.tsx`
- `apps/admin/app/(dashboard)/scheduling/layout.tsx`
- `apps/admin/app/(dashboard)/scheduling/page.tsx`
- `apps/admin/app/(dashboard)/billing/page.tsx`
- `apps/admin/app/(dashboard)/billing/invoices/page.tsx`
- `apps/admin/app/(dashboard)/billing/payment-methods/page.tsx`
- `apps/admin/app/(dashboard)/billing/usage/page.tsx`
- `apps/admin/app/(dashboard)/discover/page.tsx`
- `apps/admin/app/(dashboard)/automation/layout.tsx`
- `apps/admin/app/(dashboard)/automation/page.tsx`
- `apps/admin/app/(dashboard)/automation/[id]/page.tsx`
- `apps/admin/app/(dashboard)/automation/triggers/page.tsx`
- `apps/admin/app/(dashboard)/automation/history/page.tsx`
- `apps/admin/app/onboarding/profile-step.tsx`
- `apps/admin/app/onboarding/workspace/workspace-step.tsx`
- `apps/admin/app/onboarding/discover/page.tsx`
- `apps/admin/app/(dashboard)/layout.tsx`
- `apps/admin/components/app-sidebar.tsx`
- `apps/admin/components/breadcrumb-nav.tsx`
- `apps/admin/components/command-menu.tsx`
- `apps/admin/components/feature-gate.tsx`
- `apps/admin/components/header-toolbar.tsx`
- `apps/admin/components/keyboard-shortcuts.tsx`
- `apps/admin/components/nav-main.tsx`
- `apps/admin/components/storage-indicator.tsx`
- `apps/admin/components/workspace-sidebar.tsx`
- `apps/admin/app/(dashboard)/marketing/seo/layout.tsx`
- `apps/admin/app/(dashboard)/marketing/seo/page.tsx`
- `apps/admin/lib/keybindings.ts`
- `.Codex/changelog.md`

### Findings
- Quickdash currently mixes ecommerce backend, generic CMS/BaaS, CRM, messaging/calling, workflow automation, billing/subscription SaaS, and developer platform concepts.
- The live Storefront API returns category/product data correctly after the category-count fix, so an empty deployed Gemsutopia categories page points to a frontend browser fetch issue such as CORS, missing production env, or a client-side runtime error.
- Storefront CORS was previously pinned to `https://${storefront.domain}`, which can block legitimate storefronts when the saved domain includes a protocol or the deployed site uses the opposite `www` form.
- Messaging, calling, notifications, and the right sidebar were deeply mounted in the global dashboard shell, so removing visible entry points alone was not enough; the first cleanup pass also needed to remove always-on providers/listeners.
- Breadcrumbs still depended on chat state after `ChatProvider` was removed, which caused the live dashboard to crash globally until the breadcrumb special-case was removed.
- Billing removal has to include secondary links like storage usage and feature-gate upgrade CTAs, otherwise retired billing routes remain reachable from locked-feature screens.
- Discover/new-people was also present in onboarding, not only the dashboard workspace rail.
- Automation still has deeper editor/actions/constants code behind redirects; that can be deleted in a later deeper-code pass after the visible product shape is settled.
- Developer routes remain intact after the sidebar restructure; only their navigation entry point moved into the toolbar Settings dropdown.
- Settings routes also remain intact, but are no longer shown as a sidebar section.
- The main sidebar no longer needs workspace name/role props because the workspace switcher rail already owns workspace identity.
- Desktop normal sidebar mode no longer needs a header block because search lives in the top toolbar there; the sidebar header is still kept for mobile search and workflow mode.
- Returns/refunds, reported reviews, shipping zones, shipping pending review, and SEO are now hidden from primary navigation/search but can be deeper-deleted later if the team confirms those workflows are out.
- The first pass intentionally leaves deeper route folders, actions, schemas, and dependencies in place for a later deletion pass so ecommerce/product/order flows remain low-risk.
- The ecommerce core is present and worth preserving: dashboard, analytics, orders, products, categories, variants, reviews, auctions, customers, inventory, subscriptions, shipping, suppliers, storefront API, storefront settings, payment settings, tax, team/settings, and API keys/webhooks.
- The strongest removal candidates are automation/workflows, marketing campaigns/email/referrals/SEO, CRM/sales/calls/scheduling, notifications/messages/activity-log duplication, billing/pricing/Polar subscription gating, music/social/server/presence features, and generic content/blog/pages if Quickdash is being narrowed to ecommerce store operations.
- Product and category slugs are still globally unique instead of workspace/store-scoped.
- Gemsutopia product detail rendering still hardcodes placeholder media in `ProductContent`, so product images can appear unpublished even when Quickdash returns product images correctly.

### Verification
- `biome lint apps/admin/app/api/storefront/categories/route.ts apps/admin/lib/storefront-auth.ts` passed using the local binary.
- `biome lint apps/admin/lib/storefront-auth.ts` passed using the local binary.
- Focused Biome lint passed for the changed dashboard shell/navigation/redirect files.
- Focused Biome lint passed for the breadcrumb crash fix, CRM sidebar/search removal, and CRM/Scheduling redirect files.
- Focused Biome lint passed for Recent/Billing/Discover removal, billing/discover redirects, and onboarding flow adjustments.
- Focused Biome lint passed for Automation/Permissions sidebar cleanup and Automation route redirects.
- Focused Biome lint passed for the sidebar/settings/developer navigation restructure.
- Focused Biome lint passed for removing the sidebar workspace title/role header.
- Focused Biome lint passed for removing the Collapse All sidebar control and aligning the first sidebar section with the breadcrumb row.
- Focused Biome lint passed for the latest sidebar/search pruning and SEO redirect stubs.
- `tsc --noEmit -p apps/admin/tsconfig.json` passed using the app-local TypeScript binary.
- `pnpm exec` commands are currently blocked by pnpm attempting an interactive modules purge; direct local binaries work.

### What's Next
- Push/deploy the category-count/no-store fix, then re-check `https://app.quickdash.net/api/storefront/categories?count=true` with the Gemsutopia key.
- Patch Gemsutopia `ProductContent` to use Quickdash product images instead of `placeholderMedia`.
- Continue the cleanup in phases: next remove or redirect remaining CRM/marketing/automation/billing surfaces, then delete dead message/call/notification components/actions/schema/dependencies after confirming no ecommerce flows depend on them.

### Parked TODO — Gemsutopia Transactional Email DNS (2026-07-17)
- The replacement `RESEND_API_KEY` in Gemsutopia's local `.env.local` authenticated successfully with the Resend API; the key itself is valid.
- Resend reports the `gemsutopia.ca` sending domain as `failed` because the required MX record for `send.gemsutopia.ca` is missing from public DNS.
- DKIM at `resend._domainkey.gemsutopia.ca` is verified, and the SPF TXT record at `send.gemsutopia.ca` is publicly present.
- DNS is hosted by DreamHost. Reese must provide DNS access before this can be completed.
- DreamHost may not expose subdomain MX creation in the normal DNS record UI for Reese's current hosting configuration. After access is available, inspect the separate **Custom MX** area and the domain's hosting/email configuration before changing anything; do not replace the root domain's mail routing.
- Required result: an MX record at `send.gemsutopia.ca` with value `feedback-smtp.us-east-1.amazonses.com` and priority `10`, while keeping the existing DKIM and SPF TXT records. If Reese's DreamHost configuration truly cannot publish that subdomain MX record, move authoritative DNS to a provider that supports it or delegate the email-sending subdomain rather than repeatedly deleting/re-adding the Resend domain.
- After the MX record propagates, trigger Resend domain verification again. Only then replace the Gemsutopia production workspace integration key and run a real transactional-email delivery test.

### Transactional Email Reliability (2026-07-17)
- Made direct Resend delivery persist pending/sent/failed message state and update the workspace integration's last-use/last-error diagnostics.
- Resend API errors now fail explicitly instead of being treated as successful responses.
- Storefront order confirmation delivery is awaited so serverless execution cannot terminate before the request is sent; payment/order completion remains successful if email delivery fails.
- Workspace email settings now validate the API key and verified sending domain before saving, expose the last delivery error, and provide a test-recipient/send-test-email action.
- Updated workflow email handling to use the throwing delivery contract.

### Transactional Email Files Changed
- `apps/admin/lib/send-email.ts`
- `apps/admin/app/api/storefront/orders/route.ts`
- `apps/admin/app/(dashboard)/settings/actions.ts`
- `apps/admin/app/(dashboard)/settings/integrations/integrations-client.tsx`
- `apps/admin/lib/workflows/actions/email.ts`
- `.Codex/changelog.md`

### Transactional Email Verification
- Focused TypeScript check passed with `/tmp/quickdash-tsconfig.json`.
- Focused Biome lint passed for all five transactional-email implementation files.

## Storefront Contact Delivery — 2026-07-18

### Completed
- Added a workspace-scoped storefront contact endpoint that validates and rate-limits public messages.
- Contact submissions are stored in the workspace's `contact-submissions` collection before delivery.
- Messages are delivered through the workspace Resend integration to its configured reply-to address, with the customer's address set as the email reply-to.
- User-provided content is escaped before HTML email rendering.

### Files Changed
- `apps/admin/app/api/storefront/contact/route.ts`
- `.Codex/changelog.md`

### What's Next
- Deploy Quickdash, then submit a real Gemsutopia contact form and confirm Reese receives the message.
