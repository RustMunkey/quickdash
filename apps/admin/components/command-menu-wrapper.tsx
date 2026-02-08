"use client"

import dynamic from "next/dynamic"

const CommandMenu = dynamic(
	() => import("@/components/command-menu").then((m) => ({ default: m.CommandMenu })),
	{ ssr: false }
)

export function CommandMenuWrapper() {
	return <CommandMenu />
}
