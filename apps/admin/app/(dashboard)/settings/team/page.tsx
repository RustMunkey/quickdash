import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getTeamMembers, getPendingInvites } from "./actions"
import { TeamClient } from "./team-client"

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function TeamPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const pageSize = 25

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const [membersData, pendingInvites] = await Promise.all([
    getTeamMembers({ page, pageSize }),
    getPendingInvites(),
  ])

  const OWNER_WHITELIST = [
    "wilson.asher00@gmail.com",
    "reeseroberge10@gmail.com",
  ]
  const currentMember = membersData.items.find((m) => m.id === session?.user.id)
  const isOwner = currentMember?.role === "owner" && OWNER_WHITELIST.includes(currentMember.email)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <p className="text-sm text-muted-foreground">
        Manage who has access to the admin panel.
      </p>
      <TeamClient
        members={membersData.items}
        membersTotalCount={membersData.totalCount}
        membersCurrentPage={page}
        pendingInvites={pendingInvites}
        isOwner={isOwner}
      />
    </div>
  )
}
