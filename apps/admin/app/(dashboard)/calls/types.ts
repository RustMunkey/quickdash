// Call status types
export type CallStatus = "ringing" | "connected" | "ended" | "missed" | "declined" | "failed"
export type CallType = "voice" | "video"
export type ParticipantStatus = "invited" | "ringing" | "joined" | "left" | "declined" | "missed"
export type ParticipantRole = "initiator" | "participant"
export type CallEndReason = "completed" | "missed" | "declined" | "error" | "timeout"

// Database types
export type Call = {
	id: string
	roomName: string
	initiatorId: string
	type: CallType
	status: CallStatus
	isGroup: boolean
	chatChannel: string | null
	startedAt: Date | null
	endedAt: Date | null
	createdAt: Date
	endReason: string | null
	durationSeconds: number | null
	metadata: {
		screenShareUsed?: boolean
		recordingUrl?: string
		maxParticipants?: number
	}
}

export type CallParticipant = {
	id: string
	callId: string
	userId: string
	status: ParticipantStatus
	role: ParticipantRole
	invitedAt: Date
	joinedAt: Date | null
	leftAt: Date | null
	hadVideo: boolean
	hadAudio: boolean
	sharedScreen: boolean
}

// Pusher event payloads (sent on private-user-{userId} channel)
export type IncomingCallEvent = {
	callId: string
	roomName: string
	initiator: {
		id: string
		name: string
		image: string | null
	}
	type: CallType
	isGroup: boolean
	chatChannel: string | null
	participants: Array<{
		id: string
		name: string
		image: string | null
	}>
	sentAt: number // Unix timestamp ms — used to reject stale events
}

export type CallAcceptedEvent = {
	callId: string
	userId: string
	userName: string
}

export type CallDeclinedEvent = {
	callId: string
	userId: string
	userName: string
}

export type CallEndedEvent = {
	callId: string
	endReason: CallEndReason
	endedBy: string
}

export type ParticipantJoinedEvent = {
	callId: string
	userId: string
	userName: string
	userImage: string | null
}

export type ParticipantLeftEvent = {
	callId: string
	userId: string
	userName: string
}

// Client state types
export type CallClientStatus = "idle" | "ringing-incoming" | "ringing-outgoing" | "connecting" | "connected"

export type CallWithParticipants = Call & {
	initiator: {
		id: string
		name: string
		image: string | null
	}
	participants: Array<{
		id: string
		name: string
		image: string | null
		status: ParticipantStatus
		role: ParticipantRole
	}>
}

// Call history item for list display
export type CallHistoryItem = {
	id: string
	type: CallType
	status: CallStatus
	isGroup: boolean
	chatChannel: string | null
	startedAt: string
	endedAt: string | null
	durationSeconds: number | null
	isInitiator: boolean
	participants: Array<{
		id: string
		name: string
		image: string | null
		isInitiator: boolean
	}>
}
