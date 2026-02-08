import { Suspense } from "react"
import { AuthLayout } from "@/components/auth-layout"
import { ResetPasswordForm } from "@/components/reset-password-form"
import { Loader2 } from "lucide-react"

function ResetPasswordFormFallback() {
	return (
		<div className="flex items-center justify-center p-8">
			<Loader2 className="size-8 animate-spin text-muted-foreground" />
		</div>
	)
}

export default function ResetPasswordPage() {
	return (
		<AuthLayout>
			<Suspense fallback={<ResetPasswordFormFallback />}>
				<ResetPasswordForm />
			</Suspense>
		</AuthLayout>
	)
}
