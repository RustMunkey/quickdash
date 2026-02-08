"use client"

import { useState } from "react"
import { useCall } from "./call-provider"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
	Mic01Icon,
	MicOff01Icon,
	Video01Icon,
	VideoOffIcon,
	ComputerIcon,
	CallEnd01Icon,
	ArrowExpandIcon,
	ArrowShrinkIcon,
	Message01Icon,
	Settings01Icon,
} from "@hugeicons/core-free-icons"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

type CallControlsProps = {
	variant?: "floating" | "fullscreen"
	className?: string
}

export function CallControls({ variant = "floating", className }: CallControlsProps) {
	const {
		localAudioEnabled,
		localVideoEnabled,
		isScreenSharing,
		viewMode,
		showChat,
		setViewMode,
		toggleChat,
		toggleAudio,
		toggleVideo,
		toggleScreenShare,
		hangUp,
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
	} = useCall()

	const [settingsOpen, setSettingsOpen] = useState(false)

	const buttonSize = variant === "fullscreen" ? "size-12" : "size-10"
	const iconSize = variant === "fullscreen" ? 20 : 18

	return (
		<div className={cn("flex items-center justify-center gap-3", className)}>
			{/* Mute/Unmute */}
			<Button
				variant={localAudioEnabled ? "secondary" : "destructive"}
				size="icon"
				className={cn("rounded-full", buttonSize)}
				onClick={toggleAudio}
				title={localAudioEnabled ? "Mute microphone" : "Unmute microphone"}
			>
				<HugeiconsIcon
					icon={localAudioEnabled ? Mic01Icon : MicOff01Icon}
					size={iconSize}
				/>
				<span className="sr-only">{localAudioEnabled ? "Mute" : "Unmute"}</span>
			</Button>

			{/* Video on/off */}
			<Button
				variant={localVideoEnabled ? "secondary" : "destructive"}
				size="icon"
				className={cn("rounded-full", buttonSize)}
				onClick={toggleVideo}
				title={localVideoEnabled ? "Turn off camera" : "Turn on camera"}
			>
				<HugeiconsIcon
					icon={localVideoEnabled ? Video01Icon : VideoOffIcon}
					size={iconSize}
				/>
				<span className="sr-only">{localVideoEnabled ? "Camera off" : "Camera on"}</span>
			</Button>

			{/* Screen share — hidden on mobile */}
			<Button
				variant={isScreenSharing ? "default" : "secondary"}
				size="icon"
				className={cn("rounded-full hidden md:inline-flex", buttonSize)}
				onClick={toggleScreenShare}
				title={isScreenSharing ? "Stop sharing" : "Share screen"}
			>
				<HugeiconsIcon icon={ComputerIcon} size={iconSize} />
				<span className="sr-only">{isScreenSharing ? "Stop sharing" : "Share screen"}</span>
			</Button>

			{/* Audio/Video Settings */}
			<Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="secondary"
						size="icon"
						className={cn("rounded-full", buttonSize)}
						title="Audio & Video Settings"
					>
						<HugeiconsIcon icon={Settings01Icon} size={iconSize} />
						<span className="sr-only">Settings</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent
					side="top"
					align="center"
					className="w-80 p-4 space-y-4 max-h-[70vh] overflow-y-auto"
				>
					{/* Microphone */}
					<div className="space-y-2">
						<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Microphone</Label>
						<select
							value={activeAudioDevice}
							onChange={(e) => switchAudioDevice(e.target.value)}
							className="w-full text-sm rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
						>
							{audioDevices.length === 0 && <option value="">No microphones found</option>}
							{audioDevices.map((d) => (
								<option key={d.deviceId} value={d.deviceId}>
									{d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
								</option>
							))}
						</select>
						{/* Mic level meter */}
						<div className="flex items-center gap-2">
							<span className="text-xs text-muted-foreground shrink-0">Level</span>
							<div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
								<div
									className="h-full bg-primary rounded-full transition-all duration-100"
									style={{ width: `${Math.min(micLevel * 100, 100)}%` }}
								/>
							</div>
						</div>
					</div>

					{/* Speaker / Output */}
					{outputDevices.length > 0 && (
						<div className="space-y-2">
							<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Speaker</Label>
							<select
								value={activeOutputDevice}
								onChange={(e) => switchOutputDevice(e.target.value)}
								className="w-full text-sm rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
							>
								{outputDevices.map((d) => (
									<option key={d.deviceId} value={d.deviceId}>
										{d.label || `Speaker ${d.deviceId.slice(0, 8)}`}
									</option>
								))}
							</select>
						</div>
					)}

					{/* Camera */}
					<div className="space-y-2">
						<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Camera</Label>
						<select
							value={activeVideoDevice}
							onChange={(e) => switchVideoDevice(e.target.value)}
							className="w-full text-sm rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
						>
							{videoDevices.length === 0 && <option value="">No cameras found</option>}
							{videoDevices.map((d) => (
								<option key={d.deviceId} value={d.deviceId}>
									{d.label || `Camera ${d.deviceId.slice(0, 8)}`}
								</option>
							))}
						</select>
					</div>

					{/* Audio Processing */}
					<div className="space-y-1">
						<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Audio Processing</Label>
					</div>

					<div className="flex items-center justify-between">
						<div>
							<Label className="text-sm">Noise Suppression</Label>
							<p className="text-xs text-muted-foreground">Reduce background noise</p>
						</div>
						<Switch
							checked={noiseSuppression}
							onCheckedChange={setNoiseSuppression}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div>
							<Label className="text-sm">Echo Cancellation</Label>
							<p className="text-xs text-muted-foreground">Prevent audio feedback</p>
						</div>
						<Switch
							checked={echoCancellation}
							onCheckedChange={setEchoCancellation}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div>
							<Label className="text-sm">Auto Gain Control</Label>
							<p className="text-xs text-muted-foreground">Normalize mic volume</p>
						</div>
						<Switch
							checked={autoGainControl}
							onCheckedChange={setAutoGainControl}
						/>
					</div>
				</PopoverContent>
			</Popover>

			{/* Chat toggle (only in fullscreen) */}
			{viewMode === "fullscreen" && (
				<Button
					variant={showChat ? "default" : "secondary"}
					size="icon"
					className={cn("rounded-full", buttonSize)}
					onClick={toggleChat}
					title={showChat ? "Hide chat" : "Show chat"}
				>
					<HugeiconsIcon icon={Message01Icon} size={iconSize} />
					<span className="sr-only">{showChat ? "Hide chat" : "Show chat"}</span>
				</Button>
			)}

			{/* View mode: PIP / Fullscreen toggle */}
			<Button
				variant="secondary"
				size="icon"
				className={cn("rounded-full", buttonSize)}
				onClick={() => setViewMode(viewMode === "fullscreen" ? "floating" : "fullscreen")}
				title={viewMode === "fullscreen" ? "Picture-in-picture" : "Fullscreen"}
			>
				<HugeiconsIcon
					icon={viewMode === "fullscreen" ? ArrowShrinkIcon : ArrowExpandIcon}
					size={iconSize}
				/>
				<span className="sr-only">{viewMode === "fullscreen" ? "Picture-in-picture" : "Fullscreen"}</span>
			</Button>

			{/* End call */}
			<Button
				variant="destructive"
				size="icon"
				className={cn("rounded-full", buttonSize)}
				onClick={hangUp}
				title="End call"
			>
				<HugeiconsIcon icon={CallEnd01Icon} size={iconSize} />
				<span className="sr-only">End call</span>
			</Button>
		</div>
	)
}
