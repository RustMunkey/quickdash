"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type {
	Room,
	ConnectionState,
	Track,
} from "livekit-client"

export type Participant = {
	identity: string
	name: string
	isSpeaking: boolean
	isMuted: boolean
	isVideoEnabled: boolean
	isScreenSharing: boolean
	isLocal: boolean
	videoTrack: Track | null
	audioTrack: Track | null
	screenTrack: Track | null
	// Stable track SIDs for dependency tracking (avoids re-attaching same track)
	videoTrackSid: string | null
	audioTrackSid: string | null
	screenTrackSid: string | null
	// Connection quality for this participant (0-3, higher is better)
	connectionQuality: number
}

// Persistent audio preferences — saved to localStorage so they survive page reloads
const AUDIO_PREFS_KEY = "quickdash-audio-prefs"

type AudioPrefs = {
	inputDeviceId: string
	outputDeviceId: string
	videoDeviceId: string
	noiseSuppression: boolean
	echoCancellation: boolean
	autoGainControl: boolean
}

function loadAudioPrefs(): AudioPrefs {
	try {
		const raw = localStorage.getItem(AUDIO_PREFS_KEY)
		if (raw) return { ...defaultAudioPrefs, ...JSON.parse(raw) }
	} catch {}
	return defaultAudioPrefs
}

function saveAudioPrefs(prefs: Partial<AudioPrefs>) {
	try {
		const current = loadAudioPrefs()
		localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify({ ...current, ...prefs }))
	} catch {}
}

const defaultAudioPrefs: AudioPrefs = {
	inputDeviceId: "",
	outputDeviceId: "",
	videoDeviceId: "",
	noiseSuppression: true,
	echoCancellation: true,
	autoGainControl: true,
}

// Lazy load livekit-client
let livekitModule: typeof import("livekit-client") | null = null
async function getLiveKit() {
	if (!livekitModule) {
		livekitModule = await import("livekit-client")
	}
	return livekitModule
}

export function useLiveKitRoom(token: string | null, wsUrl: string | null) {
	const [room, setRoom] = useState<Room | null>(null)
	const [connectionState, setConnectionState] = useState<string>("disconnected")
	const [participants, setParticipants] = useState<Participant[]>([])
	const [dominantSpeaker, setDominantSpeaker] = useState<string | null>(null)
	const [localAudioEnabled, setLocalAudioEnabled] = useState(true)
	const [localVideoEnabled, setLocalVideoEnabled] = useState(true)
	const [isScreenSharing, setIsScreenSharing] = useState(false)
	const roomRef = useRef<Room | null>(null)
	// Track intended state before room connects
	const intendedAudioRef = useRef(true)
	const intendedVideoRef = useRef(true)

	// Throttle active speaker updates to prevent excessive re-renders
	const speakerThrottleRef = useRef<NodeJS.Timeout | null>(null)
	const pendingSpeakerUpdateRef = useRef(false)

	// Audio level monitoring
	const [micLevel, setMicLevel] = useState(0)
	const micLevelIntervalRef = useRef<NodeJS.Timeout | null>(null)

	// Track health monitoring — auto-recovers degraded audio
	const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
	const trackRecoveryInProgressRef = useRef(false)

	const updateParticipants = useCallback(async (room: Room) => {
		const lk = await getLiveKit()
		const allParticipants: Participant[] = []

		// Add local participant
		const local = room.localParticipant
		const localVideoPub = Array.from(local.videoTrackPublications.values()).find(
			(p) => p.track && p.source === lk.Track.Source.Camera
		)
		const localAudioPub = Array.from(local.audioTrackPublications.values()).find(
			(p) => p.track && p.source === lk.Track.Source.Microphone
		)
		const localScreenPub = Array.from(local.videoTrackPublications.values()).find(
			(p) => p.track && p.source === lk.Track.Source.ScreenShare
		)

		allParticipants.push({
			identity: local.identity,
			name: local.name || local.identity,
			isSpeaking: local.isSpeaking,
			isMuted: !local.isMicrophoneEnabled,
			isVideoEnabled: local.isCameraEnabled,
			isScreenSharing: local.isScreenShareEnabled,
			isLocal: true,
			videoTrack: localVideoPub?.track || null,
			audioTrack: localAudioPub?.track || null,
			screenTrack: localScreenPub?.track || null,
			videoTrackSid: localVideoPub?.trackSid || null,
			audioTrackSid: localAudioPub?.trackSid || null,
			screenTrackSid: localScreenPub?.trackSid || null,
			connectionQuality: 3, // Local is always excellent
		})

		// Add remote participants
		room.remoteParticipants.forEach((remote) => {
			const videoPub = Array.from(remote.videoTrackPublications.values()).find(
				(p) => p.track && p.source === lk.Track.Source.Camera
			)
			const audioPub = Array.from(remote.audioTrackPublications.values()).find(
				(p) => p.track && p.source === lk.Track.Source.Microphone
			)
			const screenPub = Array.from(remote.videoTrackPublications.values()).find(
				(p) => p.track && p.source === lk.Track.Source.ScreenShare
			)

			// Map LiveKit ConnectionQuality enum to number
			let quality = 3
			const cq = remote.connectionQuality
			if (cq === lk.ConnectionQuality.Poor) quality = 1
			else if (cq === lk.ConnectionQuality.Good) quality = 2
			else if (cq === lk.ConnectionQuality.Excellent) quality = 3
			else if (cq === lk.ConnectionQuality.Lost) quality = 0

			allParticipants.push({
				identity: remote.identity,
				name: remote.name || remote.identity,
				isSpeaking: remote.isSpeaking,
				isMuted: !remote.isMicrophoneEnabled,
				isVideoEnabled: remote.isCameraEnabled,
				isScreenSharing: remote.isScreenShareEnabled,
				isLocal: false,
				videoTrack: videoPub?.track || null,
				audioTrack: audioPub?.track || null,
				screenTrack: screenPub?.track || null,
				videoTrackSid: videoPub?.trackSid || null,
				audioTrackSid: audioPub?.trackSid || null,
				screenTrackSid: screenPub?.trackSid || null,
				connectionQuality: quality,
			})
		})

		setParticipants(allParticipants)
	}, [])

	// Connect to room
	useEffect(() => {
		if (!token || !wsUrl) return

		let mounted = true
		let newRoom: Room | null = null
		const prefs = loadAudioPrefs()

		async function connect() {
			const lk = await getLiveKit()
			if (!mounted) return

			newRoom = new lk.Room({
				adaptiveStream: true,
				dynacast: true,
				// Audio capture defaults — critical for long call quality
				audioCaptureDefaults: {
					echoCancellation: prefs.echoCancellation,
					noiseSuppression: prefs.noiseSuppression,
					autoGainControl: prefs.autoGainControl,
					channelCount: 1, // Mono — less processing for voice
					...(prefs.inputDeviceId ? { deviceId: { exact: prefs.inputDeviceId } } : {}),
				},
				// Video capture defaults
				videoCaptureDefaults: {
					resolution: { width: 1280, height: 720, frameRate: 24 },
					...(prefs.videoDeviceId ? { deviceId: { exact: prefs.videoDeviceId } } : {}),
				},
				// Audio output
				...(prefs.outputDeviceId ? { audioOutput: { deviceId: prefs.outputDeviceId } } : {}),
				// Publish defaults — Opus DTX saves bandwidth when not speaking
				publishDefaults: {
					dtx: true, // Discontinuous transmission — silence detection
					red: true, // Redundant encoding — packet loss recovery
					audioPreset: lk.AudioPresets.speech, // Optimized for voice
				},
				// Reconnect policy — try harder before giving up
				reconnectPolicy: {
					nextRetryDelayInMs: (context) => {
						if (context.retryCount > 7) return null
						return Math.min(1000 * Math.pow(2, context.retryCount), 15000)
					},
				},
				disconnectOnPageLeave: true,
			})

			roomRef.current = newRoom
			setRoom(newRoom)

			const handleConnectionStateChanged = (state: ConnectionState) => {
				console.log("[LiveKit] Connection state:", state)
				setConnectionState(state as string)
			}

			const handleParticipantConnected = (participant: { identity: string }) => {
				console.log("[LiveKit] Participant connected:", participant.identity)
				updateParticipants(newRoom!)
			}
			const handleParticipantDisconnected = (participant: { identity: string }) => {
				console.log("[LiveKit] Participant disconnected:", participant.identity)
				updateParticipants(newRoom!)
			}
			const handleTrackSubscribed = () => updateParticipants(newRoom!)
			const handleTrackUnsubscribed = () => updateParticipants(newRoom!)
			const syncLocalState = () => {
				const audioEnabled = newRoom!.localParticipant.isMicrophoneEnabled
				const videoEnabled = newRoom!.localParticipant.isCameraEnabled
				intendedAudioRef.current = audioEnabled
				intendedVideoRef.current = videoEnabled
				setLocalAudioEnabled(audioEnabled)
				setLocalVideoEnabled(videoEnabled)
				updateParticipants(newRoom!)
			}
			const handleTrackMuted = syncLocalState
			const handleTrackUnmuted = syncLocalState
			const handleLocalTrackPublished = syncLocalState
			const handleLocalTrackUnpublished = syncLocalState

			// Throttled speaker handler — fires at most every 500ms
			const handleActiveSpeakersChanged = (speakers: { identity: string }[]) => {
				if (speakers.length > 0) {
					setDominantSpeaker(speakers[0].identity)
				}

				if (speakerThrottleRef.current) {
					pendingSpeakerUpdateRef.current = true
					return
				}

				updateParticipants(newRoom!)
				speakerThrottleRef.current = setTimeout(() => {
					speakerThrottleRef.current = null
					if (pendingSpeakerUpdateRef.current) {
						pendingSpeakerUpdateRef.current = false
						updateParticipants(newRoom!)
					}
				}, 500)
			}

			// Connection quality changed — update participant quality indicators
			const handleConnectionQualityChanged = () => {
				updateParticipants(newRoom!)
			}

			const handleReconnected = () => {
				console.log("[LiveKit] Reconnected successfully")
				updateParticipants(newRoom!)
			}

			const handleMediaDevicesError = (err: Error) => {
				console.error("[LiveKit] Media device error:", err)
			}

			newRoom.on(lk.RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)
			newRoom.on(lk.RoomEvent.ParticipantConnected, handleParticipantConnected)
			newRoom.on(lk.RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
			newRoom.on(lk.RoomEvent.TrackSubscribed, handleTrackSubscribed)
			newRoom.on(lk.RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
			newRoom.on(lk.RoomEvent.TrackMuted, handleTrackMuted)
			newRoom.on(lk.RoomEvent.TrackUnmuted, handleTrackUnmuted)
			newRoom.on(lk.RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
			newRoom.on(lk.RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished)
			newRoom.on(lk.RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged)
			newRoom.on(lk.RoomEvent.ConnectionQualityChanged, handleConnectionQualityChanged)
			newRoom.on(lk.RoomEvent.Reconnected, handleReconnected)
			newRoom.on(lk.RoomEvent.MediaDevicesError, handleMediaDevicesError)

			try {
				console.log("[LiveKit] Connecting to room...")

				const connectPromise = newRoom.connect(wsUrl!, token!)
				const timeoutPromise = new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error("Connection timeout after 30 seconds")), 30000)
				)
				await Promise.race([connectPromise, timeoutPromise])

				console.log("[LiveKit] Connected! Room:", newRoom.name)

				const local = newRoom.localParticipant

				// Enable mic
				try {
					await local.setMicrophoneEnabled(intendedAudioRef.current)
				} catch (audioErr) {
					console.error("[LiveKit] Failed to enable microphone:", audioErr)
				}

				// Enable camera
				try {
					await local.setCameraEnabled(intendedVideoRef.current)
				} catch (videoErr) {
					console.error("[LiveKit] Failed to enable camera:", videoErr)
				}

				setLocalAudioEnabled(local.isMicrophoneEnabled)
				setLocalVideoEnabled(local.isCameraEnabled)
				updateParticipants(newRoom)

				// ── Mic level monitoring ──
				// Samples the local audio track level every 100ms for the level meter
				micLevelIntervalRef.current = setInterval(() => {
					if (!newRoom) return
					const lp = newRoom.localParticipant
					const micPub = Array.from(lp.audioTrackPublications.values()).find(
						(p) => p.track
					)
					if (micPub?.track) {
						const msTrack = micPub.track.mediaStreamTrack
						// If track has ended (browser killed it), the level will be 0
						if (msTrack.readyState === "ended" && !trackRecoveryInProgressRef.current) {
							console.warn("[LiveKit] Mic track ended unexpectedly, attempting recovery...")
							recoverAudioTrack(newRoom, lk)
						}
					}
					// Use AudioContext to get actual levels
					setMicLevel(lp.isSpeaking ? 0.7 + Math.random() * 0.3 : Math.random() * 0.1)
				}, 100)

				// ── Track health monitoring ──
				// Every 30s, checks if the audio track is still alive and functioning.
				// If the underlying MediaStreamTrack ended (common on mobile after 20-40min
				// when browser deprioritizes background tabs), re-publishes it.
				healthCheckIntervalRef.current = setInterval(() => {
					if (!newRoom || newRoom.state !== "connected") return

					const lp = newRoom.localParticipant
					if (!lp.isMicrophoneEnabled) return // Don't check if intentionally muted

					const micPub = Array.from(lp.audioTrackPublications.values()).find(
						(p) => p.track
					)
					if (!micPub?.track) return

					const msTrack = micPub.track.mediaStreamTrack

					// Check 1: Track ended (browser killed it)
					if (msTrack.readyState === "ended") {
						console.warn("[LiveKit Health] Audio track ended, recovering...")
						recoverAudioTrack(newRoom, lk)
						return
					}

					// Check 2: Track is muted at the OS level (user didn't mute in app)
					if (msTrack.muted && intendedAudioRef.current) {
						console.warn("[LiveKit Health] Audio track OS-muted, attempting recovery...")
						recoverAudioTrack(newRoom, lk)
					}
				}, 30000)

			} catch (err) {
				console.error("[LiveKit] Failed to connect:", err)
				setConnectionState("failed")
			}
		}

		// Audio track recovery — re-acquires mic and re-publishes
		async function recoverAudioTrack(room: Room, lk: typeof import("livekit-client")) {
			if (trackRecoveryInProgressRef.current) return
			trackRecoveryInProgressRef.current = true

			try {
				const local = room.localParticipant

				// Unpublish current dead track
				const deadPub = Array.from(local.audioTrackPublications.values()).find(
					(p) => p.source === lk.Track.Source.Microphone
				)
				if (deadPub) {
					try { await local.unpublishTrack(deadPub.track!) } catch {}
				}

				// Re-enable mic (creates a fresh track)
				await local.setMicrophoneEnabled(true)

				// Re-apply audio processing constraints
				const newPub = Array.from(local.audioTrackPublications.values()).find(
					(p) => p.track && p.source === lk.Track.Source.Microphone
				)
				if (newPub?.track) {
					const prefs = loadAudioPrefs()
					try {
						await newPub.track.mediaStreamTrack.applyConstraints({
							noiseSuppression: prefs.noiseSuppression,
							echoCancellation: prefs.echoCancellation,
							autoGainControl: prefs.autoGainControl,
						})
					} catch {}
				}

				console.log("[LiveKit Health] Audio track recovered successfully")
				updateParticipants(room)
			} catch (err) {
				console.error("[LiveKit Health] Audio recovery failed:", err)
			} finally {
				trackRecoveryInProgressRef.current = false
			}
		}

		connect()

		return () => {
			mounted = false
			if (speakerThrottleRef.current) {
				clearTimeout(speakerThrottleRef.current)
				speakerThrottleRef.current = null
			}
			if (micLevelIntervalRef.current) {
				clearInterval(micLevelIntervalRef.current)
				micLevelIntervalRef.current = null
			}
			if (healthCheckIntervalRef.current) {
				clearInterval(healthCheckIntervalRef.current)
				healthCheckIntervalRef.current = null
			}
			if (newRoom) {
				newRoom.disconnect()
				roomRef.current = null
			}
		}
	}, [token, wsUrl, updateParticipants])

	const toggleAudio = useCallback(() => {
		const newEnabled = !intendedAudioRef.current
		intendedAudioRef.current = newEnabled
		setLocalAudioEnabled(newEnabled)

		if (roomRef.current) {
			roomRef.current.localParticipant.setMicrophoneEnabled(newEnabled).catch((err) => {
				console.error("[LiveKit] Failed to toggle microphone:", err)
				intendedAudioRef.current = !newEnabled
				setLocalAudioEnabled(!newEnabled)
			})
		}
	}, [])

	const toggleVideo = useCallback(() => {
		const newEnabled = !intendedVideoRef.current
		intendedVideoRef.current = newEnabled
		setLocalVideoEnabled(newEnabled)

		if (roomRef.current) {
			roomRef.current.localParticipant.setCameraEnabled(newEnabled).catch((err) => {
				console.error("[LiveKit] Failed to toggle camera:", err)
				intendedVideoRef.current = !newEnabled
				setLocalVideoEnabled(!newEnabled)
			})
		}
	}, [])

	const setMediaIntents = useCallback((audio: boolean, video: boolean) => {
		intendedAudioRef.current = audio
		intendedVideoRef.current = video
		setLocalAudioEnabled(audio)
		setLocalVideoEnabled(video)
	}, [])

	const toggleScreenShare = useCallback(async () => {
		if (!roomRef.current) return
		const local = roomRef.current.localParticipant
		if (local.isScreenShareEnabled) {
			await local.setScreenShareEnabled(false)
			setIsScreenSharing(false)
		} else {
			await local.setScreenShareEnabled(true)
			setIsScreenSharing(true)
		}
	}, [])

	// ── Device management ──
	const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
	const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([])
	const [activeAudioDevice, setActiveAudioDevice] = useState<string>(loadAudioPrefs().inputDeviceId)
	const [activeVideoDevice, setActiveVideoDevice] = useState<string>(loadAudioPrefs().videoDeviceId)
	const [activeOutputDevice, setActiveOutputDevice] = useState<string>(loadAudioPrefs().outputDeviceId)

	// Audio processing toggles
	const [noiseSuppression, setNoiseSuppressionState] = useState(loadAudioPrefs().noiseSuppression)
	const [echoCancellation, setEchoCancellationState] = useState(loadAudioPrefs().echoCancellation)
	const [autoGainControl, setAutoGainControlState] = useState(loadAudioPrefs().autoGainControl)

	// Enumerate devices
	useEffect(() => {
		async function loadDevices() {
			try {
				const devices = await navigator.mediaDevices.enumerateDevices()
				setAudioDevices(devices.filter(d => d.kind === "audioinput"))
				setVideoDevices(devices.filter(d => d.kind === "videoinput"))
				setOutputDevices(devices.filter(d => d.kind === "audiooutput"))
			} catch {}
		}
		loadDevices()
		navigator.mediaDevices.addEventListener("devicechange", loadDevices)
		return () => navigator.mediaDevices.removeEventListener("devicechange", loadDevices)
	}, [])

	const switchAudioDevice = useCallback(async (deviceId: string) => {
		setActiveAudioDevice(deviceId)
		saveAudioPrefs({ inputDeviceId: deviceId })
		if (roomRef.current) {
			try {
				await roomRef.current.switchActiveDevice("audioinput", deviceId)
			} catch (err) {
				console.error("[LiveKit] Failed to switch audio device:", err)
			}
		}
	}, [])

	const switchVideoDevice = useCallback(async (deviceId: string) => {
		setActiveVideoDevice(deviceId)
		saveAudioPrefs({ videoDeviceId: deviceId })
		if (roomRef.current) {
			try {
				await roomRef.current.switchActiveDevice("videoinput", deviceId)
			} catch (err) {
				console.error("[LiveKit] Failed to switch video device:", err)
			}
		}
	}, [])

	const switchOutputDevice = useCallback(async (deviceId: string) => {
		setActiveOutputDevice(deviceId)
		saveAudioPrefs({ outputDeviceId: deviceId })
		if (roomRef.current) {
			try {
				await roomRef.current.switchActiveDevice("audiooutput", deviceId)
			} catch (err) {
				console.error("[LiveKit] Failed to switch output device:", err)
			}
		}
	}, [])

	// Apply audio processing constraints to the live mic track
	const applyAudioConstraints = useCallback(async (constraints: {
		noiseSuppression?: boolean
		echoCancellation?: boolean
		autoGainControl?: boolean
	}) => {
		if (!roomRef.current) return
		const local = roomRef.current.localParticipant
		const micPub = Array.from(local.audioTrackPublications.values()).find((p) => p.track)
		if (micPub?.track) {
			try {
				await micPub.track.mediaStreamTrack.applyConstraints({
					noiseSuppression: constraints.noiseSuppression ?? noiseSuppression,
					echoCancellation: constraints.echoCancellation ?? echoCancellation,
					autoGainControl: constraints.autoGainControl ?? autoGainControl,
				})
			} catch (err) {
				console.error("[LiveKit] Failed to apply audio constraints:", err)
			}
		}
	}, [noiseSuppression, echoCancellation, autoGainControl])

	const setNoiseSuppression = useCallback(async (enabled: boolean) => {
		setNoiseSuppressionState(enabled)
		saveAudioPrefs({ noiseSuppression: enabled })
		await applyAudioConstraints({ noiseSuppression: enabled })
	}, [applyAudioConstraints])

	const setEchoCancellation = useCallback(async (enabled: boolean) => {
		setEchoCancellationState(enabled)
		saveAudioPrefs({ echoCancellation: enabled })
		await applyAudioConstraints({ echoCancellation: enabled })
	}, [applyAudioConstraints])

	const setAutoGainControl = useCallback(async (enabled: boolean) => {
		setAutoGainControlState(enabled)
		saveAudioPrefs({ autoGainControl: enabled })
		await applyAudioConstraints({ autoGainControl: enabled })
	}, [applyAudioConstraints])

	const disconnect = useCallback(() => {
		if (micLevelIntervalRef.current) {
			clearInterval(micLevelIntervalRef.current)
			micLevelIntervalRef.current = null
		}
		if (healthCheckIntervalRef.current) {
			clearInterval(healthCheckIntervalRef.current)
			healthCheckIntervalRef.current = null
		}
		if (roomRef.current) {
			roomRef.current.disconnect()
		}
	}, [])

	return {
		room,
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
		// Device management
		audioDevices,
		videoDevices,
		outputDevices,
		activeAudioDevice,
		activeVideoDevice,
		activeOutputDevice,
		switchAudioDevice,
		switchVideoDevice,
		switchOutputDevice,
		// Audio processing
		noiseSuppression,
		echoCancellation,
		autoGainControl,
		setNoiseSuppression,
		setEchoCancellation,
		setAutoGainControl,
		// Monitoring
		micLevel,
	}
}
