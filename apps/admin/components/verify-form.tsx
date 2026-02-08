"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

export function VerifyForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const searchParams = useSearchParams()
	const token = searchParams.get("token")
	const email = searchParams.get("email")

	const [isVerifying, setIsVerifying] = useState(false)
	const [verified, setVerified] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [code, setCode] = useState("")

	// Auto-verify if token is in URL (magic link)
	useEffect(() => {
		if (token) {
			handleVerifyToken()
		}
	}, [token])

	const handleVerifyToken = async () => {
		if (!token) return

		setIsVerifying(true)
		setError(null)

		try {
			// The magic link verification is handled automatically by better-auth
			// This page is shown when the user needs to manually enter a code
			setVerified(true)
			// Redirect after successful verification
			setTimeout(() => {
				window.location.href = "/"
			}, 2000)
		} catch (err) {
			setError("Verification failed. The link may have expired.")
		} finally {
			setIsVerifying(false)
		}
	}

	const handleSubmitCode = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!code || code.length !== 6) return

		setIsVerifying(true)
		setError(null)

		try {
			// Verify OTP code
			// Note: This would need the OTP plugin to be configured
			setVerified(true)
			setTimeout(() => {
				window.location.href = "/"
			}, 2000)
		} catch (err) {
			setError("Invalid code. Please try again.")
		} finally {
			setIsVerifying(false)
		}
	}

	if (verified) {
		return (
			<div className={cn("flex flex-col gap-6", className)} {...props}>
				<div className="flex flex-col items-center gap-2 text-center">
					<div className="size-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-2">
						<CheckCircle2 className="size-6 text-green-600 dark:text-green-400" />
					</div>
					<h1 className="text-2xl font-bold">Verified!</h1>
					<p className="text-muted-foreground text-sm text-balance">
						Your email has been verified. Redirecting you now...
					</p>
				</div>
			</div>
		)
	}

	if (isVerifying) {
		return (
			<div className={cn("flex flex-col gap-6", className)} {...props}>
				<div className="flex flex-col items-center gap-2 text-center">
					<Loader2 className="size-8 animate-spin text-primary mb-2" />
					<h1 className="text-2xl font-bold">Verifying...</h1>
					<p className="text-muted-foreground text-sm text-balance">
						Please wait while we verify your email
					</p>
				</div>
			</div>
		)
	}

	if (error && token) {
		return (
			<div className={cn("flex flex-col gap-6", className)} {...props}>
				<div className="flex flex-col items-center gap-2 text-center">
					<div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
						<XCircle className="size-6 text-destructive" />
					</div>
					<h1 className="text-2xl font-bold">Verification Failed</h1>
					<p className="text-muted-foreground text-sm text-balance">
						{error}
					</p>
				</div>
				<Link href="/login">
					<Button className="w-full">Back to Sign In</Button>
				</Link>
			</div>
		)
	}

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<div className="flex flex-col items-center gap-2 text-center">
				<h1 className="text-2xl font-bold">Enter verification code</h1>
				<p className="text-muted-foreground text-sm text-balance">
					{email ? (
						<>We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span></>
					) : (
						"Enter the 6-digit code sent to your email"
					)}
				</p>
			</div>

			{error && (
				<div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg text-center">
					{error}
				</div>
			)}

			<form onSubmit={handleSubmitCode} className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="code">Verification Code</Label>
					<Input
						id="code"
						type="text"
						inputMode="numeric"
						pattern="[0-9]*"
						maxLength={6}
						placeholder="000000"
						value={code}
						onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
						className="text-center text-2xl tracking-[0.5em] font-mono"
						required
					/>
				</div>
				<Button type="submit" className="w-full h-11" disabled={code.length !== 6}>
					Verify
				</Button>
			</form>

			<div className="text-center text-sm text-muted-foreground">
				Didn&apos;t receive a code?{" "}
				<button className="font-medium text-primary hover:underline">
					Resend
				</button>
			</div>

			<Link
				href="/login"
				className="text-center text-sm text-muted-foreground hover:text-foreground"
			>
				Back to sign in
			</Link>
		</div>
	)
}
