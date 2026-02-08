import { Suspense } from "react"
import { AuthLayout } from "@/components/auth-layout"
import { VerifyForm } from "@/components/verify-form"
import { Loader2 } from "lucide-react"

function VerifyFormFallback() {
	return (
		<div className="flex items-center justify-center p-8">
			<Loader2 className="size-8 animate-spin text-muted-foreground" />
		</div>
	)
}

export default function VerifyPage() {
	return (
		<AuthLayout>
			<Suspense fallback={<VerifyFormFallback />}>
				<VerifyForm />
			</Suspense>
		</AuthLayout>
	)
}
