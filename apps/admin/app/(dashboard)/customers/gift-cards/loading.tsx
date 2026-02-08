import { Skeleton } from "@/components/ui/skeleton"

export default function GiftCardsLoading() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<div className="space-y-1">
				<Skeleton className="h-5 w-24" />
				<Skeleton className="h-4 w-56" />
			</div>

			<div className="flex justify-end">
				<Skeleton className="h-8 w-32" />
			</div>

			<div className="rounded-lg border divide-y">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className="px-4 py-3 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Skeleton className="h-4 w-36 font-mono" />
							<Skeleton className="h-5 w-14 rounded-full" />
						</div>
						<div className="flex items-center gap-4">
							<div className="text-right space-y-1">
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-3 w-12" />
							</div>
							<Skeleton className="h-3 w-20" />
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
