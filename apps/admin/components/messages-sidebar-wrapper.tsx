"use client"

import { MessagesSidebar } from "@/components/messages-sidebar"
import { useMessagesSidebar } from "@/components/messages-sidebar-context"

export function MessagesSidebarWrapper() {
	const { open, setOpen } = useMessagesSidebar()

	return <MessagesSidebar open={open} onOpenChange={setOpen} />
}
