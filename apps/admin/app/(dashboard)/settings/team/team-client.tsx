"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { DataTable, Column } from "@/components/data-table"
import { createInvite, revokeInvite, removeMember, updateMemberRole, bulkRemoveMembers } from "./actions"
import { toast } from "sonner"

type Member = {
  id: string
  name: string | null
  email: string
  role: "owner" | "admin" | "member" | "viewer"
  image: string | null
  joinedAt: Date
}

type Invite = {
  id: string
  email: string
  role: "owner" | "admin" | "member" | "viewer"
  expiresAt: Date
  createdAt: Date
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function TeamClient({
  members,
  membersTotalCount,
  membersCurrentPage,
  pendingInvites,
  isOwner,
}: {
  members: Member[]
  membersTotalCount: number
  membersCurrentPage: number
  pendingInvites: Invite[]
  isOwner: boolean
}) {
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState("admin")
  const [inviteError, setInviteError] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [roleFilter, setRoleFilter] = React.useState("all")
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])

  const handleInvite = async () => {
    if (!inviteEmail) return
    setLoading(true)
    setInviteError("")
    try {
      await createInvite(inviteEmail, inviteRole)
      setInviteEmail("")
      setInviteOpen(false)
      router.refresh()
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : "Failed to send invite")
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (inviteId: string) => {
    await revokeInvite(inviteId)
    router.refresh()
  }

  const handleRemove = async (userId: string) => {
    await removeMember(userId)
    router.refresh()
  }

  const handleBulkRemove = async () => {
    if (selectedIds.length === 0) return
    setLoading(true)
    try {
      await bulkRemoveMembers(selectedIds)
      setSelectedIds([])
      router.refresh()
      toast.success(`Removed ${selectedIds.length} member(s)`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove members")
    } finally {
      setLoading(false)
    }
  }

  const memberColumns: Column<Member>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.image ? (
            <img src={row.image} alt={row.name ?? ""} className="size-8 rounded-full" />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {(row.name ?? row.email).charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium">{row.name ?? row.email}</span>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      cell: (row) => <span className="text-sm text-muted-foreground">{row.email}</span>,
    },
    {
      key: "role",
      header: "Role",
      cell: (row) => (
        isOwner && row.role !== "owner" ? (
          <Select
            value={row.role || "member"}
            onValueChange={async (role) => {
              await updateMemberRole(row.id, role)
              router.refresh()
            }}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant={row.role === "owner" ? "default" : "secondary"}>
            {row.role}
          </Badge>
        )
      ),
    },
    {
      key: "joinedAt",
      header: "Joined",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.joinedAt)}</span>
      ),
    },
    ...(isOwner ? [{
      key: "actions",
      header: "",
      cell: (row: Member) => (
        row.role !== "owner" ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove team member?</AlertDialogTitle>
                <AlertDialogDescription>
                  {row.name} will lose access to the admin panel immediately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => handleRemove(row.id)}
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null
      ),
      className: "text-right",
    }] : []),
  ]

  const inviteColumns: Column<Invite>[] = [
    {
      key: "email",
      header: "Email",
      cell: (row) => <span className="text-sm">{row.email}</span>,
    },
    {
      key: "role",
      header: "Role",
      cell: (row) => <Badge variant="outline">{row.role}</Badge>,
    },
    {
      key: "expiresAt",
      header: "Expires",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.expiresAt)}</span>
      ),
    },
    ...(isOwner ? [{
      key: "actions",
      header: "",
      cell: (row: Invite) => (
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => handleRevoke(row.id)}
        >
          Revoke
        </Button>
      ),
      className: "text-right",
    }] : []),
  ]

  const filteredMembers = roleFilter === "all"
    ? members
    : members.filter((m) => m.role === roleFilter)

  return (
    <div className="space-y-6">
      <DataTable
        columns={memberColumns}
        data={filteredMembers}
        searchPlaceholder="Search members..."
        totalCount={membersTotalCount}
        currentPage={membersCurrentPage}
        pageSize={25}
        getId={(row) => row.id}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={
          isOwner ? (
            <Button size="sm" variant="destructive" disabled={loading} onClick={handleBulkRemove}>
              Remove ({selectedIds.length})
            </Button>
          ) : undefined
        }
        emptyMessage="No team members yet"
        filters={
          <>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9 w-[120px] text-xs">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
            {isOwner && (
              <Button size="sm" className="h-9 hidden sm:flex" onClick={() => setInviteOpen(true)}>
                Invite Member
              </Button>
            )}
          </>
        }
      />

      {pendingInvites.length > 0 && (
        <>
          <h3 className="text-sm font-medium">Pending Invites</h3>
          <DataTable
            columns={inviteColumns}
            data={pendingInvites}
            searchPlaceholder="Search invites..."
            getId={(row) => row.id}
            emptyMessage="No pending invites"
          />
        </>
      )}

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Invite Team Member</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              They&apos;ll receive an email and can sign in with Google.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium" htmlFor="invite-email">
                  Email
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="invite-role">
                  Role
                </label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {inviteError && (
                <p className="text-sm text-destructive">{inviteError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setInviteOpen(false)
                    setInviteError("")
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={loading || !inviteEmail}>
                  {loading ? "Sending..." : "Send Invite"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
