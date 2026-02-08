import { Skeleton } from "@/components/ui/skeleton"

export default function OrderDetailLoading() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Skeleton className="h-6 w-28" />
					<Skeleton className="h-5 w-16 rounded-full" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-8 w-28" />
					<Skeleton className="h-8 w-24" />
				</div>
			</div>

			{/* Customer + Line items */}
			<div className="grid gap-4 md:grid-cols-3">
				<div className="md:col-span-2 rounded-lg border px-4 py-4 space-y-3">
					<Skeleton className="h-4 w-20" />
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Skeleton className="h-10 w-10 rounded" />
								<div className="space-y-1">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-20" />
								</div>
							</div>
							<Skeleton className="h-4 w-16" />
						</div>
					))}
				</div>
				<div className="rounded-lg border px-4 py-4 space-y-3">
					<Skeleton className="h-4 w-24" />
					<div className="space-y-1">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-3 w-40" />
					</div>
				</div>
			</div>

			{/* Payment + Address */}
			<div className="grid gap-4 md:grid-cols-2">
				<div className="rounded-lg border px-4 py-4 space-y-2">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-24" />
				</div>
				<div className="rounded-lg border px-4 py-4 space-y-2">
					<Skeleton className="h-4 w-28" />
					<Skeleton className="h-4 w-36" />
					<Skeleton className="h-4 w-28" />
				</div>
			</div>
		</div>
	)
}
