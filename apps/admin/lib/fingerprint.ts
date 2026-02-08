/**
 * Device Fingerprinting
 *
 * Generates a stable fingerprint based on device characteristics.
 * Used to prevent promotional offer abuse (same device, different emails).
 * This is NOT for tracking — only for one-time offer gating.
 */

async function sha256(message: string): Promise<string> {
	const msgBuffer = new TextEncoder().encode(message)
	const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

function getCanvasFingerprint(): string {
	try {
		const canvas = document.createElement("canvas")
		canvas.width = 200
		canvas.height = 50
		const ctx = canvas.getContext("2d")
		if (!ctx) return "no-canvas"

		// Draw text with specific font rendering
		ctx.textBaseline = "top"
		ctx.font = "14px Arial"
		ctx.fillStyle = "#f60"
		ctx.fillRect(125, 1, 62, 20)
		ctx.fillStyle = "#069"
		ctx.fillText("Quickdash fp", 2, 15)
		ctx.fillStyle = "rgba(102, 204, 0, 0.7)"
		ctx.fillText("Quickdash fp", 4, 17)

		return canvas.toDataURL()
	} catch {
		return "canvas-error"
	}
}

function getWebGLFingerprint(): string {
	try {
		const canvas = document.createElement("canvas")
		const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
		if (!gl || !(gl instanceof WebGLRenderingContext)) return "no-webgl"

		const debugInfo = gl.getExtension("WEBGL_debug_renderer_info")
		const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "unknown"
		const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "unknown"

		return `${vendor}~${renderer}`
	} catch {
		return "webgl-error"
	}
}

function getScreenFingerprint(): string {
	try {
		return [
			screen.width,
			screen.height,
			screen.colorDepth,
			window.devicePixelRatio || 1,
		].join("x")
	} catch {
		return "screen-error"
	}
}

/**
 * Generate a device fingerprint hash.
 * Combines canvas rendering, WebGL info, screen properties, timezone, and platform.
 * Returns a SHA-256 hex string.
 */
export async function generateDeviceFingerprint(): Promise<string> {
	const components = [
		getCanvasFingerprint(),
		getWebGLFingerprint(),
		getScreenFingerprint(),
		Intl.DateTimeFormat().resolvedOptions().timeZone,
		navigator.language,
		navigator.hardwareConcurrency?.toString() || "unknown",
		navigator.platform || "unknown",
		// @ts-expect-error -- deviceMemory is not in all browsers
		navigator.deviceMemory?.toString() || "unknown",
	]

	return sha256(components.join("|"))
}
