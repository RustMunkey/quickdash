"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn, signUp } from "@/lib/auth-client"
import { Loader2, Eye, EyeOff } from "lucide-react"

type Provider = "google" | "github"

const providerIcons: Record<Provider, React.ReactNode> = {
	google: (
		<svg className="size-5" viewBox="0 0 24 24">
			<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
			<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
			<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
			<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
		</svg>
	),
	github: (
		<svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
			<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
		</svg>
	),
}

const providerNames: Record<Provider, string> = {
	google: "Google",
	github: "GitHub",
}

export function SignupForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const router = useRouter()
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [showPassword, setShowPassword] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null)
	const [error, setError] = useState<string | null>(null)

	const handleSocialSignIn = (provider: Provider) => {
		setLoadingProvider(provider)
		setError(null)
		signIn.social({
			provider,
			callbackURL: "/",
		})
	}

	const handleEmailSignUp = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!email || !password) return

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
			const result = await signUp.email({
				email,
				password,
				name: email.split("@")[0],
			})

			if (result.error) {
				setError(result.error.message || "Failed to create account")
			} else {
				router.push("/")
			}
		} catch (err) {
			setError("Failed to create account")
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<div className="flex flex-col items-center gap-2 text-center">
				<h1 className="text-2xl font-bold">Create an account</h1>
				<p className="text-muted-foreground text-sm text-balance">
					Get started with Quickdash
				</p>
			</div>

			{error && (
				<div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg text-center">
					{error}
				</div>
			)}

			{/* Social providers */}
			<div className="flex flex-col gap-3">
				{(["google", "github"] as Provider[]).map((provider) => (
					<Button
						key={provider}
						variant="outline"
						onClick={() => handleSocialSignIn(provider)}
						disabled={loadingProvider !== null || isLoading}
						className="w-full h-10 gap-3"
					>
						{loadingProvider === provider ? (
							<Loader2 className="size-5 animate-spin" />
						) : (
							<>
								{providerIcons[provider]}
								<span>{providerNames[provider]}</span>
							</>
						)}
					</Button>
				))}
			</div>

			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<span className="w-full border-t" />
				</div>
				<div className="relative flex justify-center text-xs uppercase">
					<span className="bg-background px-2 text-muted-foreground">or</span>
				</div>
			</div>

			{/* Email/password sign up */}
			<form onSubmit={handleEmailSignUp} className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						type="email"
						placeholder="Enter your email address"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						disabled={isLoading}
						className="h-10"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="password">Password</Label>
					<div className="relative">
						<Input
							id="password"
							type={showPassword ? "text" : "password"}
							placeholder="Enter a unique password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							disabled={isLoading}
							className="h-10 pr-10"
						/>
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							tabIndex={-1}
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
						placeholder="Confirm your password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						required
						disabled={isLoading}
						className="h-10"
					/>
				</div>
				<Button type="submit" className="w-full h-11 mt-2" disabled={isLoading}>
					{isLoading ? (
						<Loader2 className="size-5 animate-spin" />
					) : (
						"Create Account"
					)}
				</Button>
				<p className="text-center text-xs text-muted-foreground">
					By creating an account, you agree to our{" "}
					<Link href="/terms" className="underline hover:text-foreground">
						Terms of Service
					</Link>{" "}
					and{" "}
					<Link href="/privacy" className="underline hover:text-foreground">
						Privacy Policy
					</Link>
				</p>
			</form>

			<p className="text-center text-sm text-muted-foreground">
				Already have an account?{" "}
				<Link href="/login" className="font-medium text-primary hover:underline">
					Sign in
				</Link>
			</p>
		</div>
	)
}
