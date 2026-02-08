"use client";

import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";
import { AccentThemeProvider } from "@/components/accent-theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<NuqsAdapter>
			<ThemeProvider
				attribute="class"
				defaultTheme="dark"
				enableSystem
				disableTransitionOnChange
				storageKey="quickdash-theme"
			>
				<AccentThemeProvider>
					{children}
				</AccentThemeProvider>
				<Toaster />
			</ThemeProvider>
		</NuqsAdapter>
	);
}
