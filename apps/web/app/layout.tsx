import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import "./globals.css";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-sans",
});

export const metadata: Metadata = {
	metadataBase: new URL("https://quickdash.net"),
	title: {
		default: "Quickdash",
		template: "%s • Quickdash",
	},
	description: "Premium coffee, brewing gear, and subscriptions.",
	robots: {
		index: true,
		follow: true,
	},
	openGraph: {
		type: "website",
		siteName: "Quickdash",
		title: "Quickdash",
		description: "Premium coffee and brewing gear.",
	},
	twitter: {
		card: "summary_large_image",
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className="dark" suppressHydrationWarning>
			<body className={`${inter.variable} font-sans antialiased`}>
				<Providers>
					<AnalyticsTracker />
					{children}
				</Providers>
			</body>
		</html>
	);
}
