import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const nextConfig: NextConfig = {}

export default withSentryConfig(nextConfig, {
	org: "quickdash",
	project: "quickdash-web",
	silent: !process.env.CI,
	widenClientFileUpload: true,
})
