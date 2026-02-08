"use client"

import { useState } from "react"

export default function ContactPage() {
	const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
	const [message, setMessage] = useState("")

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		setStatus("loading")

		const formData = new FormData(e.currentTarget)
		const data = {
			name: formData.get("name") as string,
			email: formData.get("email") as string,
			subject: formData.get("subject") as string,
			message: formData.get("message") as string,
		}

		try {
			const res = await fetch("/api/contact", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			})

			if (!res.ok) throw new Error("Failed to send")

			setStatus("success")
			setMessage("Message sent! We'll get back to you soon.")
			e.currentTarget.reset()
		} catch {
			setStatus("error")
			setMessage("Something went wrong. Please try again.")
		}
	}

	return (
		<main className="min-h-screen bg-black text-white">
			<div className="max-w-xl mx-auto px-4 py-16">
				<h1 className="text-3xl font-bold mb-2">Contact Us</h1>
				<p className="text-zinc-400 mb-8">
					Questions about your order? Want to collaborate? Drop us a line.
				</p>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label htmlFor="name" className="block text-sm font-medium mb-1">
							Name
						</label>
						<input
							type="text"
							id="name"
							name="name"
							required
							className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
						/>
					</div>

					<div>
						<label htmlFor="email" className="block text-sm font-medium mb-1">
							Email
						</label>
						<input
							type="email"
							id="email"
							name="email"
							required
							className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
						/>
					</div>

					<div>
						<label htmlFor="subject" className="block text-sm font-medium mb-1">
							Subject
						</label>
						<input
							type="text"
							id="subject"
							name="subject"
							required
							className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
						/>
					</div>

					<div>
						<label htmlFor="message" className="block text-sm font-medium mb-1">
							Message
						</label>
						<textarea
							id="message"
							name="message"
							rows={5}
							required
							className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
						/>
					</div>

					<button
						type="submit"
						disabled={status === "loading"}
						className="w-full py-2 px-4 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{status === "loading" ? "Sending..." : "Send Message"}
					</button>

					{message && (
						<p className={`text-sm ${status === "success" ? "text-green-400" : "text-red-400"}`}>
							{message}
						</p>
					)}
				</form>
			</div>
		</main>
	)
}
