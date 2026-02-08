"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail } from "lucide-react"

export function ForgotPasswordForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<div className="flex flex-col items-center gap-2 text-center">
				<div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
					<Mail className="size-6 text-primary" />
				</div>
				<h1 className="text-2xl font-bold">Forgot password?</h1>
				<p className="text-muted-foreground text-sm text-balance">
					Password reset is coming soon. For now, please contact support to reset your password.
				</p>
			</div>

			<Button asChild className="w-full h-11">
				<a href="mailto:support@quickdash.net?subject=Password Reset Request">
					Contact Support
				</a>
			</Button>

			<Link
				href="/login"
				className="text-center text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
			>
				<ArrowLeft className="size-4" />
				Back to sign in
			</Link>
		</div>
	)
}
