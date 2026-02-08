import { Skeleton } from "@/components/ui/skeleton"

export default function TrafficLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="space-y-1">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-8 rounded-md" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-6 space-y-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-52" />
        </div>
        <Skeleton className="h-[120px] w-full rounded-lg" />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-4 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-[220px] w-full rounded-lg" />
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-4 space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
