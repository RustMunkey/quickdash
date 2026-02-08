"use client"

import { createContext, useContext, useCallback, useEffect, useState, useRef, type ReactNode } from "react"
import { usePusher } from "@/components/pusher-provider"

// ConnectionState string values matching livekit-client
const ConnectionState = { Disconnected: "disconnected", Connecting: "connecting", Connected: "connected", Reconnecting: "reconnecting" } as const
import { useLiveKitRoom, type Participant } from "@/hooks/use-livekit-room"
import {
	initiateCall,
	acceptCall,
	declineCall,
	endCall,
	leaveCall,
	markCallAsMissed,
} from "@/app/(dashboard)/calls/actions"
import type {
	CallType,
	CallWithParticipants,
	IncomingCallEvent,
	CallAcceptedEvent,
	CallDeclinedEvent,
	CallEndedEvent,
	ParticipantJoinedEvent,
	ParticipantLeftEvent,
} from "@/app/(dashboard)/calls/types"

type CallClientStatus = "idle" | "ringing-incoming" | "ringing-outgoing" | "connecting" | "connected"

export type ViewMode = "fullscreen" | "floating" | "minimized"

type CallState = {
	status: CallClientStatus
	call: CallWithParticipants | null
	incomingCall: IncomingCallEvent | null
	token: string | null
	wsUrl: string | null
	participants: Participant[]
	dominantSpeaker: string | null
	localAudioEnabled: boolean
	localVideoEnabled: boolean
	isScreenSharing: boolean
	connectionState: string
	callDuration: number
	viewMode: ViewMode
	showChat: boolean
	callType: CallType | null
	chatChannel: string | null
}

type CallContextType = CallState & {
	startCall: (participantIds: string[], type: CallType, chatChannel?: string) => Promise<void>
	answerCall: () => Promise<void>
	rejectCall: () => Promise<void>
	hangUp: () => Promise<void>
	toggleAudio: () => void
	toggleVideo: () => void
	toggleScreenShare: () => Promise<void>
	setViewMode: (mode: ViewMode) => void
	toggleChat: () => void
	// Audio settings
	audioDevices: MediaDeviceInfo[]
	videoDevices: MediaDeviceInfo[]
	outputDevices: MediaDeviceInfo[]
	activeAudioDevice: string
	activeVideoDevice: string
	activeOutputDevice: string
	noiseSuppression: boolean
	echoCancellation: boolean
	autoGainControl: boolean
	switchAudioDevice: (deviceId: string) => Promise<void>
	switchVideoDevice: (deviceId: string) => Promise<void>
	switchOutputDevice: (deviceId: string) => Promise<void>
	setNoiseSuppression: (enabled: boolean) => Promise<void>
	setEchoCancellation: (enabled: boolean) => Promise<void>
	setAutoGainControl: (enabled: boolean) => Promise<void>
	micLevel: number
	// Backwards compat
	isFullscreen: boolean
	isMinimized: boolean
	toggleFullscreen: () => void
	toggleMinimize: () => void
}

const CallContext = createContext<CallContextType | null>(null)

export function useCall() {
	const context = useContext(CallContext)
	if (!context) {
		throw new Error("useCall must be used within CallProvider")
	}
	return context
}

// Optional hook that doesn't throw
export function useCallOptional() {
	return useContext(CallContext)
}

const RING_TIMEOUT = 30000 // 30 seconds

// Ringtone for incoming calls
const RINGTONE_PATH = "/sounds/ringtone.mp3"
// Outgoing dial tone
const DIALTONE_PATH = "/sounds/ringtone.mp3"

export function CallProvider({
	userId,
	userName,
	userImage,
	children,
}: {
	userId: string
	userName: string
	userImage: string | null
	children: ReactNode
}) {
	const { pusher } = usePusher()
	const [status, setStatus] = useState<CallClientStatus>("idle")
	const statusRef = useRef<CallClientStatus>("idle")
	const [call, setCall] = useState<CallWithParticipants | null>(null)
	const [incomingCall, setIncomingCall] = useState<IncomingCallEvent | null>(null)
	const [activeCallId, setActiveCallId] = useState<string | null>(null)
	const [token, setToken] = useState<string | null>(null)
	const [wsUrl, setWsUrl] = useState<string | null>(null)
	const [callDuration, setCallDuration] = useState(0)
	const [viewMode, setViewModeState] = useState<ViewMode>("fullscreen")
	const [showChat, setShowChat] = useState(false)
	const [callType, setCallType] = useState<CallType | null>(null)
	const [chatChannel, setChatChannel] = useState<string | null>(null)
	const [ringTimeout, setRingTimeout] = useState<NodeJS.Timeout | null>(null)

	// LiveKit room hook
	const {
		connectionState,
		participants,
		dominantSpeaker,
		localAudioEnabled,
		localVideoEnabled,
		isScreenSharing,
		toggleAudio,
		toggleVideo,
		toggleScreenShare,
		setMediaIntents,
		disconnect,
		audioDevices,
		videoDevices,
		outputDevices,
		activeAudioDevice,
		activeVideoDevice,
		activeOutputDevice,
		noiseSuppression,
		echoCancellation,
		autoGainControl,
		switchAudioDevice,
		switchVideoDevice,
		switchOutputDevice,
		setNoiseSuppression,
		setEchoCancellation,
		setAutoGainControl,
		micLevel,
	} = useLiveKitRoom(token, wsUrl)

	const resetCallStateRef = useRef<() => void>(() => {})

	// Keep statusRef in sync
	useEffect(() => {
		statusRef.current = status
	}, [status])

	// Duration timer
	useEffect(() => {
		if (status !== "connected") {
			setCallDuration(0)
			return
		}

		const interval = setInterval(() => {
			setCallDuration((d) => d + 1)
		}, 1000)

		return () => clearInterval(interval)
	}, [status])

	// Clear ring timeout on cleanup
	useEffect(() => {
		return () => {
			if (ringTimeout) clearTimeout(ringTimeout)
		}
	}, [ringTimeout])

	// Listen for Pusher events
	// This subscription is critical — if it fails, incoming calls don't work
	useEffect(() => {
		if (!pusher || !userId) return

		const channelName = `private-user-${userId}`
		const channel = pusher.subscribe(channelName)

		// Track subscription status — retry on failure
		let retryTimer: NodeJS.Timeout | null = null

		const handleSubscriptionSucceeded = () => {
			console.log("[Call] Subscribed to", channelName)
			if (retryTimer) {
				clearTimeout(retryTimer)
				retryTimer = null
			}
		}

		const handleSubscriptionError = (err: unknown) => {
			console.error("[Call] Subscription failed for", channelName, err)
			// Retry subscription after 3 seconds
			retryTimer = setTimeout(() => {
				console.log("[Call] Retrying subscription to", channelName)
				pusher.subscribe(channelName)
			}, 3000)
		}

		channel.bind("pusher:subscription_succeeded", handleSubscriptionSucceeded)
		channel.bind("pusher:subscription_error", handleSubscriptionError)

		const handleIncomingCall = (event: IncomingCallEvent) => {
			// Don't interrupt an active call
			if (statusRef.current !== "idle") return

			// Reject stale events (older than 30 seconds) — prevents ghost incoming calls
			if (event.sentAt && Date.now() - event.sentAt > 30000) {
				console.log("[Call] Ignoring stale incoming call event, age:", Date.now() - event.sentAt, "ms")
				return
			}

			setIncomingCall(event)
			setStatus("ringing-incoming")
			setCallType(event.type)
			setChatChannel(event.chatChannel || null)

			// Play ringtone
			try {
				const audio = new Audio(RINGTONE_PATH)
				audio.loop = true
				audio.volume = 0.5
				audio.play().catch(() => {})
				// Store ref to stop later
				;(window as unknown as { __ringtone?: HTMLAudioElement }).__ringtone = audio
			} catch {}

			// Auto-decline after timeout
			const timeout = setTimeout(async () => {
				if (statusRef.current === "ringing-incoming") {
					try {
						await markCallAsMissed(event.callId)
					} catch {}
					setIncomingCall(null)
					setStatus("idle")
					stopRingtone()
				}
			}, RING_TIMEOUT)
			setRingTimeout(timeout)
		}

		const handleCallAccepted = (event: CallAcceptedEvent) => {
			// Someone accepted our outgoing call
			if (statusRef.current === "ringing-outgoing" || statusRef.current === "connecting") {
				setStatus("connecting")
			}
		}

		const handleCallDeclined = (event: CallDeclinedEvent) => {
			// For 1-on-1 calls, if the recipient declines, end the call for the caller
			if (statusRef.current === "ringing-outgoing" || statusRef.current === "connecting") {
				resetCallStateRef.current()
			}
		}

		const handleCallEnded = (event: CallEndedEvent) => {
			resetCallStateRef.current()
		}

		const handleParticipantJoined = (event: ParticipantJoinedEvent) => {
			// LiveKit handles this, but we could show a toast
		}

		const handleParticipantLeft = (event: ParticipantLeftEvent) => {
			// LiveKit handles this
		}

		channel.bind("incoming-call", handleIncomingCall)
		channel.bind("call-accepted", handleCallAccepted)
		channel.bind("call-declined", handleCallDeclined)
		channel.bind("call-ended", handleCallEnded)
		channel.bind("participant-joined", handleParticipantJoined)
		channel.bind("participant-left", handleParticipantLeft)

		return () => {
			if (retryTimer) clearTimeout(retryTimer)
			channel.unbind("pusher:subscription_succeeded", handleSubscriptionSucceeded)
			channel.unbind("pusher:subscription_error", handleSubscriptionError)
			channel.unbind("incoming-call", handleIncomingCall)
			channel.unbind("call-accepted", handleCallAccepted)
			channel.unbind("call-declined", handleCallDeclined)
			channel.unbind("call-ended", handleCallEnded)
			channel.unbind("participant-joined", handleParticipantJoined)
			channel.unbind("participant-left", handleParticipantLeft)
		}
	}, [pusher, userId])

	const stopRingtone = () => {
		const ringtone = (window as unknown as { __ringtone?: HTMLAudioElement }).__ringtone
		if (ringtone) {
			ringtone.pause()
			ringtone.currentTime = 0
			delete (window as unknown as { __ringtone?: HTMLAudioElement }).__ringtone
		}
	}

	const playDialtone = () => {
		try {
			const audio = new Audio(DIALTONE_PATH)
			audio.loop = true
			audio.volume = 0.4
			audio.play().catch(() => {})
			;(window as unknown as { __dialtone?: HTMLAudioElement }).__dialtone = audio
		} catch {}
	}

	const stopDialtone = () => {
		const dialtone = (window as unknown as { __dialtone?: HTMLAudioElement }).__dialtone
		if (dialtone) {
			dialtone.pause()
			dialtone.currentTime = 0
			delete (window as unknown as { __dialtone?: HTMLAudioElement }).__dialtone
		}
	}

	const resetCallState = useCallback(() => {
		disconnect()
		setStatus("idle")
		setCall(null)
		setIncomingCall(null)
		setActiveCallId(null)
		setToken(null)
		setWsUrl(null)
		setCallDuration(0)
		setViewModeState("fullscreen")
		setShowChat(false)
		setCallType(null)
		setChatChannel(null)
		stopRingtone()
		stopDialtone()
		if (ringTimeout) {
			clearTimeout(ringTimeout)
			setRingTimeout(null)
		}
	}, [disconnect, ringTimeout])

	// Keep ref in sync for use in Pusher event handlers
	useEffect(() => {
		resetCallStateRef.current = resetCallState
	}, [resetCallState])

	// Update status based on connection state and participants
	// Auto-fullscreen when call connects
	const connectingTimerRef = useRef<NodeJS.Timeout | null>(null)
	useEffect(() => {
		// Only transition to "connected" once LiveKit is connected AND there's at least one remote participant
		const hasRemoteParticipants = participants.filter(p => !p.isLocal).length > 0
		if (connectionState === ConnectionState.Connected && status === "connecting" && hasRemoteParticipants) {
			console.log("[Call] LiveKit connected with remote participants, transitioning to connected status")
			setStatus("connected")
			stopDialtone()
			// Auto-fullscreen when call connects
			setViewModeState("fullscreen")
			// Clear any ringing timeout since we're now connected
			if (ringTimeout) {
				clearTimeout(ringTimeout)
				setRingTimeout(null)
			}
			// Clear connecting timeout
			if (connectingTimerRef.current) {
				clearTimeout(connectingTimerRef.current)
				connectingTimerRef.current = null
			}
		}

		// Start a timeout when we enter "connecting" — if no remote participant joins in 45s, fail
		if (status === "connecting" && connectionState === ConnectionState.Connected && !hasRemoteParticipants && !connectingTimerRef.current) {
			connectingTimerRef.current = setTimeout(() => {
				if (statusRef.current === "connecting") {
					console.error("[Call] Timed out waiting for remote participant")
					resetCallState()
				}
				connectingTimerRef.current = null
			}, 45000)
		}

		// Handle connection failure
		if (connectionState === "failed" && (status === "connecting" || status === "ringing-outgoing")) {
			console.error("[Call] LiveKit connection failed, resetting call state")
			resetCallState()
		}

		return () => {
			if (connectingTimerRef.current && status !== "connecting") {
				clearTimeout(connectingTimerRef.current)
				connectingTimerRef.current = null
			}
		}
	}, [connectionState, status, participants, resetCallState, ringTimeout])

	const startCall = useCallback(
		async (participantIds: string[], type: CallType, channel?: string) => {
			if (status !== "idle") {
				throw new Error("Already in a call")
			}

			setCallType(type)
			setChatChannel(channel || null)

			// Set media intents based on call type:
			// Voice call: mic on, camera off
			// Video call: mic on, camera on
			setMediaIntents(true, type === "video")

			setStatus("ringing-outgoing")
			playDialtone()

			try {
				const result = await initiateCall({ participantIds, type, chatChannel: channel })
				setActiveCallId(result.callId)
				setToken(result.token)
				setWsUrl(result.wsUrl)
				setStatus("connecting")

				// Caller-side timeout: if no one answers within 30s, end the call
				const timeout = setTimeout(async () => {
					if (statusRef.current === "connecting" || statusRef.current === "ringing-outgoing") {
						try {
							await endCall(result.callId)
						} catch {}
						resetCallState()
					}
				}, RING_TIMEOUT)
				setRingTimeout(timeout)
			} catch (err) {
				resetCallState()
				throw err
			}
		},
		[status, resetCallState, setMediaIntents]
	)

	const answerCall = useCallback(async () => {
		if (!incomingCall) return

		stopRingtone()
		if (ringTimeout) {
			clearTimeout(ringTimeout)
			setRingTimeout(null)
		}

		// Set media intents based on incoming call type
		const type = incomingCall.type || "video"
		setCallType(type)
		setMediaIntents(true, type === "video")

		setStatus("connecting")
		setActiveCallId(incomingCall.callId)

		try {
			const result = await acceptCall(incomingCall.callId)
			setToken(result.token)
			setWsUrl(result.wsUrl)
		} catch (err) {
			resetCallState()
			throw err
		}
	}, [incomingCall, ringTimeout, resetCallState, setMediaIntents])

	const rejectCall = useCallback(async () => {
		if (!incomingCall) return

		stopRingtone()
		if (ringTimeout) {
			clearTimeout(ringTimeout)
			setRingTimeout(null)
		}

		try {
			await declineCall(incomingCall.callId)
		} catch {}

		resetCallState()
	}, [incomingCall, ringTimeout, resetCallState])

	const hangUp = useCallback(async () => {
		const callIdToEnd = activeCallId || incomingCall?.callId || call?.id
		if (callIdToEnd) {
			try {
				await endCall(callIdToEnd)
			} catch {}
		}
		resetCallState()
	}, [activeCallId, call, incomingCall, resetCallState])

	const setViewMode = useCallback((mode: ViewMode) => {
		setViewModeState(mode)
	}, [])

	const toggleChat = useCallback(() => {
		setShowChat((c) => !c)
	}, [])

	// Backwards compat helpers
	const toggleFullscreen = useCallback(() => {
		setViewModeState((m) => m === "fullscreen" ? "floating" : "fullscreen")
	}, [])

	const toggleMinimize = useCallback(() => {
		setViewModeState((m) => m === "minimized" ? "floating" : "minimized")
	}, [])

	return (
		<CallContext.Provider
			value={{
				status,
				call,
				incomingCall,
				token,
				wsUrl,
				participants,
				dominantSpeaker,
				localAudioEnabled,
				localVideoEnabled,
				isScreenSharing,
				connectionState,
				callDuration,
				viewMode,
				showChat,
				callType,
				chatChannel,
				startCall,
				answerCall,
				rejectCall,
				hangUp,
				toggleAudio,
				toggleVideo,
				toggleScreenShare,
				setViewMode,
				toggleChat,
				// Audio settings
				audioDevices,
				videoDevices,
				outputDevices,
				activeAudioDevice,
				activeVideoDevice,
				activeOutputDevice,
				noiseSuppression,
				echoCancellation,
				autoGainControl,
				switchAudioDevice,
				switchVideoDevice,
				switchOutputDevice,
				setNoiseSuppression,
				setEchoCancellation,
				setAutoGainControl,
				micLevel,
				// Backwards compat
				isFullscreen: viewMode === "fullscreen",
				isMinimized: viewMode === "minimized",
				toggleFullscreen,
				toggleMinimize,
			}}
		>
			{children}
		</CallContext.Provider>
	)
}
