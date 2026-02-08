"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import PusherClient from "pusher-js"

type ConnectionState = "connecting" | "connected" | "disconnected" | "unavailable" | "failed"

type PusherContextType = {
	pusher: PusherClient | null
	isConnected: boolean
	connectionState: ConnectionState
	reconnect: () => void
	workspaceId: string | null
}

const PusherContext = createContext<PusherContextType>({
	pusher: null,
	isConnected: false,
	connectionState: "disconnected",
	reconnect: () => {},
	workspaceId: null,
})

export function PusherProvider({
	pusherKey,
	pusherCluster,
	workspaceId,
	children,
}: {
	pusherKey?: string
	pusherCluster?: string
	workspaceId?: string | null
	children: ReactNode
}) {
	const [pusher, setPusher] = useState<PusherClient | null>(null)
	const [isConnected, setIsConnected] = useState(false)
	const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected")

	const reconnect = useCallback(() => {
		if (pusher && connectionState !== "connected") {
			console.log("[Pusher] Manual reconnection triggered")
			pusher.connect()
		}
	}, [pusher, connectionState])

	useEffect(() => {
		if (!pusherKey || !pusherCluster) return

		// Enable logging in development
		if (process.env.NODE_ENV === "development") {
			PusherClient.logToConsole = true
		}

		const client = new PusherClient(pusherKey, {
			cluster: pusherCluster,
			authEndpoint: "/api/pusher/auth",
			// Allow all transports — if WebSocket fails (proxy/firewall),
			// Pusher falls back to HTTP streaming/polling so events still arrive
		})

		// Handle all connection states
		client.connection.bind("connecting", () => {
			console.log("[Pusher] Connecting...")
			setConnectionState("connecting")
		})

		client.connection.bind("connected", () => {
			console.log("[Pusher] Connected")
			setIsConnected(true)
			setConnectionState("connected")
		})

		client.connection.bind("disconnected", () => {
			console.log("[Pusher] Disconnected")
			setIsConnected(false)
			setConnectionState("disconnected")
		})

		client.connection.bind("unavailable", () => {
			console.log("[Pusher] Unavailable - will retry")
			setIsConnected(false)
			setConnectionState("unavailable")
		})

		client.connection.bind("failed", () => {
			console.log("[Pusher] Connection failed")
			setIsConnected(false)
			setConnectionState("failed")
		})

		client.connection.bind("error", (err: { type: string; error: { data?: { code?: number } } }) => {
			console.error("[Pusher] Connection error:", err)
			if (err.error?.data?.code === 4004) {
				console.error("[Pusher] App key is invalid or app is disabled")
			}
		})

		// Handle subscription errors
		client.connection.bind("state_change", (states: { current: string; previous: string }) => {
			console.log(`[Pusher] State change: ${states.previous} -> ${states.current}`)
		})

		setPusher(client)

		// Reconnect on visibility change (user returns to tab)
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible" && client.connection.state !== "connected") {
				console.log("[Pusher] Tab became visible, reconnecting...")
				client.connect()
			}
		}
		document.addEventListener("visibilitychange", handleVisibilityChange)

		// Periodic health check — detect silent disconnections every 30s
		const healthCheck = setInterval(() => {
			const state = client.connection.state
			if (state !== "connected" && state !== "connecting") {
				console.log("[Pusher] Health check: not connected (state:", state, "), reconnecting...")
				client.connect()
			}
		}, 30000)

		return () => {
			clearInterval(healthCheck)
			document.removeEventListener("visibilitychange", handleVisibilityChange)
			client.disconnect()
		}
	}, [pusherKey, pusherCluster])

	return (
		<PusherContext.Provider value={{ pusher, isConnected, connectionState, reconnect, workspaceId: workspaceId ?? null }}>
			{children}
		</PusherContext.Provider>
	)
}

export function usePusher() {
	return useContext(PusherContext)
}
