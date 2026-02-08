import { Skeleton } from "@/components/ui/skeleton"

export default function CustomersLoading() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<div className="space-y-1">
				<Skeleton className="h-5 w-32" />
				<Skeleton className="h-4 w-56" />
			</div>

			{/* Search + filters */}
			<div className="flex items-center gap-2">
				<Skeleton className="h-9 w-64" />
			</div>

			{/* Table */}
			<div className="rounded-lg border">
				<div className="border-b px-4 py-3 flex items-center gap-4">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-16" />
				</div>
				{Array.from({ length: 8 }).map((_, i) => (
					<div key={i} className="border-b last:border-b-0 px-4 py-3 flex items-center gap-4">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-4 w-20" />
					</div>
				))}
			</div>
		</div>
	)
}
