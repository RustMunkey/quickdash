export type MessageAttachment = {
	type: "image" | "video" | "file" | "audio"
	url: string
	name: string
	size?: number
	mimeType?: string
	width?: number
	height?: number
	duration?: number
}

export type CallMessageData = {
	callId: string
	callType: "voice" | "video"
	callStatus: "initiated" | "accepted" | "declined" | "missed" | "ended"
	durationSeconds?: number
	participantIds: string[]
}

export type TeamMessage = {
	id: string
	senderId: string | null // null for webhook-originated messages
	senderName: string
	senderImage: string | null
	channel: string
	body: string | null
	contentType?: "text" | "markdown" | "call"
	callData?: CallMessageData | null
	attachments?: MessageAttachment[] | null
	createdAt: string
	readAt: string | null
}

export type TeamMember = {
	id: string
	name: string
	email: string
	image: string | null
}

export type Conversation = {
	type: "channel" | "dm"
	id: string
	label: string
}


export type InboxEmailReply = {
	id: string
	from: string
	body: string
	sentAt: string
}

export type InboxEmail = {
	id: string
	fromName: string
	fromEmail: string
	subject: string
	body: string
	receivedAt: string
	status: "unread" | "read" | "replied"
	replies: InboxEmailReply[]
}
