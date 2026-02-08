"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import { Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react"

export function ResetPasswordForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const searchParams = useSearchParams()
	const token = searchParams.get("token")

	const [password, setPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [showPassword, setShowPassword] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [success, setSuccess] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (password !== confirmPassword) {
			setError("Passwords don't match")
			return
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters")
			return
		}

		setIsLoading(true)
		setError(null)

		try {
			const result = await authClient.resetPassword({
				newPassword: password,
				token: token!,
			})
			if (result.error) {
				setError(result.error.message || "Failed to reset password")
			} else {
				setSuccess(true)
			}
		} catch (err) {
			setError("Failed to reset password. Please try again.")
		} finally {
			setIsLoading(false)
		}
	}

	if (!token) {
		return (
			<div className={cn("flex flex-col gap-6", className)} {...props}>
				<div className="flex flex-col items-center gap-2 text-center">
					<h1 className="text-2xl font-bold">Invalid Link</h1>
					<p className="text-muted-foreground text-sm text-balance">
						This password reset link is invalid or has expired.
					</p>
				</div>
				<Link href="/forgot-password">
					<Button className="w-full">Request New Link</Button>
				</Link>
			</div>
		)
	}

	if (success) {
		return (
			<div className={cn("flex flex-col gap-6", className)} {...props}>
				<div className="flex flex-col items-center gap-2 text-center">
					<div className="size-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-2">
						<CheckCircle2 className="size-6 text-green-600 dark:text-green-400" />
					</div>
					<h1 className="text-2xl font-bold">Password Reset</h1>
					<p className="text-muted-foreground text-sm text-balance">
						Your password has been successfully reset.
					</p>
				</div>
				<Link href="/login">
					<Button className="w-full">Sign In</Button>
				</Link>
			</div>
		)
	}

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<div className="flex flex-col items-center gap-2 text-center">
				<h1 className="text-2xl font-bold">Reset Password</h1>
				<p className="text-muted-foreground text-sm text-balance">
					Enter your new password below
				</p>
			</div>

			{error && (
				<div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg text-center">
					{error}
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="password">New Password</Label>
					<div className="relative">
						<Input
							id="password"
							type={showPassword ? "text" : "password"}
							placeholder="••••••••"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							disabled={isLoading}
							className="pr-10"
						/>
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							{showPassword ? (
								<EyeOff className="size-4" />
							) : (
								<Eye className="size-4" />
							)}
						</button>
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor="confirmPassword">Confirm Password</Label>
					<Input
						id="confirmPassword"
						type={showPassword ? "text" : "password"}
						placeholder="••••••••"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						required
						disabled={isLoading}
					/>
				</div>
				<Button type="submit" className="w-full h-11" disabled={isLoading}>
					{isLoading ? (
						<Loader2 className="size-5 animate-spin" />
					) : (
						"Reset Password"
					)}
				</Button>
			</form>

			<Link
				href="/login"
				className="text-center text-sm text-muted-foreground hover:text-foreground"
			>
				Back to sign in
			</Link>
		</div>
	)
}
