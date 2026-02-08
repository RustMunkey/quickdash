"use client"

import { useCall } from "./call-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Call02Icon, CallEnd01Icon, Video01Icon } from "@hugeicons/core-free-icons"
import { motion, AnimatePresence } from "framer-motion"

export function IncomingCallModal() {
	const { status, incomingCall, answerCall, rejectCall } = useCall()

	if (status !== "ringing-incoming" || !incomingCall) {
		return null
	}

	const initials = incomingCall.initiator.name
		.split(" ")
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2)

	const isVideo = incomingCall.type === "video"
	const isGroup = incomingCall.isGroup

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
			>
				<motion.div
					initial={{ scale: 0.9, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					exit={{ scale: 0.9, opacity: 0 }}
					className="flex flex-col items-center gap-6 p-8"
				>
					{/* Caller avatar with pulse animation */}
					<div className="relative">
						{/* Pulse rings */}
						<motion.div
							className="absolute inset-0 rounded-full bg-primary/30"
							animate={{
								scale: [1, 1.4, 1.4],
								opacity: [0.5, 0, 0],
							}}
							transition={{
								duration: 2,
								repeat: Infinity,
								ease: "easeOut",
							}}
						/>
						<motion.div
							className="absolute inset-0 rounded-full bg-primary/30"
							animate={{
								scale: [1, 1.4, 1.4],
								opacity: [0.5, 0, 0],
							}}
							transition={{
								duration: 2,
								repeat: Infinity,
								ease: "easeOut",
								delay: 0.5,
							}}
						/>
						<motion.div
							className="absolute inset-0 rounded-full bg-primary/30"
							animate={{
								scale: [1, 1.4, 1.4],
								opacity: [0.5, 0, 0],
							}}
							transition={{
								duration: 2,
								repeat: Infinity,
								ease: "easeOut",
								delay: 1,
							}}
						/>

						<Avatar className="size-24 border-4 border-primary/50">
							{incomingCall.initiator.image && (
								<AvatarImage src={incomingCall.initiator.image} alt={incomingCall.initiator.name} />
							)}
							<AvatarFallback className="text-2xl bg-primary text-primary-foreground">
								{initials}
							</AvatarFallback>
						</Avatar>
					</div>

					{/* Caller info */}
					<div className="text-center">
						<h2 className="text-xl font-semibold text-white">{incomingCall.initiator.name}</h2>
						<p className="text-sm text-white/70 mt-1">
							{isVideo ? "Video" : "Voice"} {isGroup ? "group " : ""}call
						</p>
					</div>

					{/* Group participants preview */}
					{isGroup && incomingCall.participants.length > 0 && (
						<div className="flex -space-x-2">
							{incomingCall.participants.slice(0, 4).map((p) => {
								const pInitials = p.name
									.split(" ")
									.map((n) => n.charAt(0))
									.join("")
									.toUpperCase()
									.slice(0, 2)
								return (
									<Avatar key={p.id} className="size-8 border-2 border-black">
										{p.image && <AvatarImage src={p.image} alt={p.name} />}
										<AvatarFallback className="text-xs">{pInitials}</AvatarFallback>
									</Avatar>
								)
							})}
							{incomingCall.participants.length > 4 && (
								<div className="flex size-8 items-center justify-center rounded-full border-2 border-black bg-muted text-xs font-medium">
									+{incomingCall.participants.length - 4}
								</div>
							)}
						</div>
					)}

					{/* Action buttons */}
					<div className="flex items-center gap-6 mt-4">
						{/* Decline */}
						<motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
							<Button
								size="lg"
								variant="destructive"
								className="size-16 rounded-full"
								onClick={rejectCall}
							>
								<HugeiconsIcon icon={CallEnd01Icon} size={24} />
								<span className="sr-only">Decline</span>
							</Button>
						</motion.div>

						{/* Accept */}
						<motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
							<Button
								size="lg"
								className="size-16 rounded-full bg-green-600 hover:bg-green-700"
								onClick={answerCall}
							>
								<HugeiconsIcon icon={isVideo ? Video01Icon : Call02Icon} size={24} />
								<span className="sr-only">Accept</span>
							</Button>
						</motion.div>
					</div>

					{/* Swipe hint for mobile */}
					<p className="text-xs text-white/50 mt-4 md:hidden">
						Swipe up to accept, down to decline
					</p>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	)
}
