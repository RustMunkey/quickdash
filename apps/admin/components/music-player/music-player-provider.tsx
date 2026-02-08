"use client"

import * as React from "react"

export type Track = {
	id: string
	name: string
	url: string
	artist?: string
	duration?: number // in seconds
	type: "radio" | "uploaded"
}

export type RepeatMode = "none" | "one" | "all"

type MusicPlayerContextType = {
	// State
	tracks: Track[]
	currentTrack: Track | null
	currentTrackIndex: number
	isPlaying: boolean
	currentTime: number
	duration: number
	volume: number
	isMuted: boolean
	repeatMode: RepeatMode
	isShuffled: boolean
	isWidgetOpen: boolean
	isMinimized: boolean

	// Actions
	play: () => void
	pause: () => void
	toggle: () => void
	next: () => void
	previous: () => void
	seek: (time: number) => void
	setVolume: (volume: number) => void
	toggleMute: () => void
	setRepeatMode: (mode: RepeatMode) => void
	toggleShuffle: () => void
	playTrack: (track: Track) => void
	playTrackByIndex: (index: number) => void
	addTrack: (track: Track) => void
	removeTrack: (id: string) => void
	setTracks: (tracks: Track[]) => void
	openWidget: () => void
	closeWidget: () => void
	toggleMinimize: () => void
}

const MusicPlayerContext = React.createContext<MusicPlayerContextType | null>(null)

export function useMusicPlayer() {
	const context = React.useContext(MusicPlayerContext)
	if (!context) {
		throw new Error("useMusicPlayer must be used within MusicPlayerProvider")
	}
	return context
}

// Default radio stations
const DEFAULT_TRACKS: Track[] = [
	{ id: "radio-1", name: "Drone Zone", url: "https://ice1.somafm.com/dronezone-128-mp3", type: "radio" },
	{ id: "radio-2", name: "Groove Salad", url: "https://ice1.somafm.com/groovesalad-128-mp3", type: "radio" },
	{ id: "radio-3", name: "Space Station", url: "https://ice1.somafm.com/spacestation-128-mp3", type: "radio" },
	{ id: "radio-4", name: "Deep Space One", url: "https://ice1.somafm.com/deepspaceone-128-mp3", type: "radio" },
	{ id: "radio-5", name: "Lush", url: "https://ice1.somafm.com/lush-128-mp3", type: "radio" },
]

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
	const [tracks, setTracksState] = React.useState<Track[]>(DEFAULT_TRACKS)
	const [currentTrackIndex, setCurrentTrackIndex] = React.useState(0)
	const [isPlaying, setIsPlaying] = React.useState(false)
	const [currentTime, setCurrentTime] = React.useState(0)
	const [duration, setDuration] = React.useState(0)
	const [volume, setVolumeState] = React.useState(0.3)
	const [isMuted, setIsMuted] = React.useState(false)
	const [repeatMode, setRepeatModeState] = React.useState<RepeatMode>("none")
	const [isShuffled, setIsShuffled] = React.useState(false)
	const [isWidgetOpen, setIsWidgetOpen] = React.useState(false)
	const [isMinimized, setIsMinimized] = React.useState(false)

	const audioRef = React.useRef<HTMLAudioElement | null>(null)
	const shuffleOrderRef = React.useRef<number[]>([])

	const currentTrack = tracks[currentTrackIndex] || null

	// Initialize audio element
	React.useEffect(() => {
		if (!audioRef.current) {
			audioRef.current = new Audio()
			audioRef.current.volume = volume
		}

		const audio = audioRef.current

		const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
		const handleDurationChange = () => setDuration(audio.duration || 0)
		const handleEnded = () => {
			if (repeatMode === "one") {
				audio.currentTime = 0
				audio.play().catch(() => {})
			} else if (repeatMode === "all" || currentTrackIndex < tracks.length - 1) {
				next()
			} else {
				setIsPlaying(false)
			}
		}
		const handlePlay = () => setIsPlaying(true)
		const handlePause = () => setIsPlaying(false)

		audio.addEventListener("timeupdate", handleTimeUpdate)
		audio.addEventListener("durationchange", handleDurationChange)
		audio.addEventListener("ended", handleEnded)
		audio.addEventListener("play", handlePlay)
		audio.addEventListener("pause", handlePause)

		return () => {
			audio.removeEventListener("timeupdate", handleTimeUpdate)
			audio.removeEventListener("durationchange", handleDurationChange)
			audio.removeEventListener("ended", handleEnded)
			audio.removeEventListener("play", handlePlay)
			audio.removeEventListener("pause", handlePause)
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [repeatMode, currentTrackIndex, tracks.length])

	// Load track when it changes
	React.useEffect(() => {
		if (!audioRef.current || !currentTrack) return

		const wasPlaying = isPlaying
		audioRef.current.src = currentTrack.url
		audioRef.current.load()

		if (wasPlaying) {
			audioRef.current.play().catch(() => {})
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentTrack?.url])

	// Update volume
	React.useEffect(() => {
		if (audioRef.current) {
			audioRef.current.volume = isMuted ? 0 : volume
		}
	}, [volume, isMuted])

	const getNextIndex = React.useCallback(() => {
		if (isShuffled) {
			if (shuffleOrderRef.current.length === 0) {
				shuffleOrderRef.current = [...Array(tracks.length).keys()].sort(() => Math.random() - 0.5)
			}
			const currentPosInShuffle = shuffleOrderRef.current.indexOf(currentTrackIndex)
			const nextPos = (currentPosInShuffle + 1) % shuffleOrderRef.current.length
			return shuffleOrderRef.current[nextPos]
		}
		return (currentTrackIndex + 1) % tracks.length
	}, [isShuffled, currentTrackIndex, tracks.length])

	const getPreviousIndex = React.useCallback(() => {
		if (isShuffled) {
			if (shuffleOrderRef.current.length === 0) {
				shuffleOrderRef.current = [...Array(tracks.length).keys()].sort(() => Math.random() - 0.5)
			}
			const currentPosInShuffle = shuffleOrderRef.current.indexOf(currentTrackIndex)
			const prevPos = currentPosInShuffle === 0 ? shuffleOrderRef.current.length - 1 : currentPosInShuffle - 1
			return shuffleOrderRef.current[prevPos]
		}
		return currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1
	}, [isShuffled, currentTrackIndex, tracks.length])

	const play = React.useCallback(() => {
		if (audioRef.current) {
			audioRef.current.play().catch(() => {})
			setIsWidgetOpen(true)
		}
	}, [])

	const pause = React.useCallback(() => {
		if (audioRef.current) {
			audioRef.current.pause()
		}
	}, [])

	const toggle = React.useCallback(() => {
		if (isPlaying) {
			pause()
		} else {
			play()
		}
	}, [isPlaying, play, pause])

	const next = React.useCallback(() => {
		setCurrentTrackIndex(getNextIndex())
	}, [getNextIndex])

	const previous = React.useCallback(() => {
		// If more than 3 seconds into track, restart it
		if (audioRef.current && audioRef.current.currentTime > 3) {
			audioRef.current.currentTime = 0
		} else {
			setCurrentTrackIndex(getPreviousIndex())
		}
	}, [getPreviousIndex])

	const seek = React.useCallback((time: number) => {
		if (audioRef.current) {
			audioRef.current.currentTime = time
		}
	}, [])

	const setVolume = React.useCallback((v: number) => {
		setVolumeState(Math.max(0, Math.min(1, v)))
		setIsMuted(false)
	}, [])

	const toggleMute = React.useCallback(() => {
		setIsMuted((m) => !m)
	}, [])

	const setRepeatMode = React.useCallback((mode: RepeatMode) => {
		setRepeatModeState(mode)
	}, [])

	const toggleShuffle = React.useCallback(() => {
		setIsShuffled((s) => {
			if (!s) {
				// Generate new shuffle order
				shuffleOrderRef.current = [...Array(tracks.length).keys()].sort(() => Math.random() - 0.5)
			}
			return !s
		})
	}, [tracks.length])

	const playTrack = React.useCallback((track: Track) => {
		const index = tracks.findIndex((t) => t.id === track.id)
		if (index !== -1) {
			setCurrentTrackIndex(index)
			setIsWidgetOpen(true)
			// Will autoplay due to effect
			setTimeout(() => {
				audioRef.current?.play().catch(() => {})
			}, 100)
		}
	}, [tracks])

	const playTrackByIndex = React.useCallback((index: number) => {
		if (index >= 0 && index < tracks.length) {
			setCurrentTrackIndex(index)
			setIsWidgetOpen(true)
			setTimeout(() => {
				audioRef.current?.play().catch(() => {})
			}, 100)
		}
	}, [tracks.length])

	const addTrack = React.useCallback((track: Track) => {
		setTracksState((prev) => [...prev, track])
	}, [])

	const removeTrack = React.useCallback((id: string) => {
		setTracksState((prev) => prev.filter((t) => t.id !== id))
	}, [])

	const setTracks = React.useCallback((newTracks: Track[]) => {
		setTracksState([...DEFAULT_TRACKS, ...newTracks])
	}, [])

	const openWidget = React.useCallback(() => {
		setIsWidgetOpen(true)
		setIsMinimized(false)
	}, [])

	const closeWidget = React.useCallback(() => {
		setIsWidgetOpen(false)
	}, [])

	const toggleMinimize = React.useCallback(() => {
		setIsMinimized((m) => !m)
	}, [])

	return (
		<MusicPlayerContext.Provider
			value={{
				tracks,
				currentTrack,
				currentTrackIndex,
				isPlaying,
				currentTime,
				duration,
				volume,
				isMuted,
				repeatMode,
				isShuffled,
				isWidgetOpen,
				isMinimized,
				play,
				pause,
				toggle,
				next,
				previous,
				seek,
				setVolume,
				toggleMute,
				setRepeatMode,
				toggleShuffle,
				playTrack,
				playTrackByIndex,
				addTrack,
				removeTrack,
				setTracks,
				openWidget,
				closeWidget,
				toggleMinimize,
			}}
		>
			{children}
		</MusicPlayerContext.Provider>
	)
}
