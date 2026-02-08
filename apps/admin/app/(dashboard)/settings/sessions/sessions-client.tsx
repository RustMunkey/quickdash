"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { signOut } from "@/lib/auth-client"
import { revokeSession, getSessionActivity } from "./actions"
import { usePresence } from "@/hooks/use-presence"
import { UserStatusBadge } from "@/components/presence"

type SessionItem = {
  id: string
  userId: string
  userName: string
  userEmail: string
  token: string
  ipAddress: string | null
  userAgent: string | null
  expiresAt: string
  createdAt: string
  isCurrent: boolean
}

type ActivityEntry = {
  id: string
  action: string
  targetLabel: string | null
  createdAt: string
}

const actionLabels: Record<string, string> = {
  "auth.sign_in": "Signed in",
  "auth.sign_out": "Signed out",
  "invite.created": "Invited member",
  "invite.revoked": "Revoked invite",
  "member.removed": "Removed member",
  "member.role_changed": "Changed role",
  "product.created": "Created product",
  "product.updated": "Updated product",
  "product.deleted": "Deleted product",
  "order.updated": "Updated order",
  "order.fulfilled": "Fulfilled order",
  "order.refunded": "Refunded order",
  "settings.updated": "Updated settings",
  "category.created": "Created category",
  "category.updated": "Updated category",
  "category.deleted": "Deleted category",
}

function parseOS(ua: string | null): string {
  if (!ua) return ""
  if (ua.includes("Mac OS")) return "macOS"
  if (ua.includes("Windows")) return "Windows"
  if (ua.includes("Linux")) return "Linux"
  if (ua.includes("Android")) return "Android"
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS"
  return ""
}

function formatIp(ip: string | null): string | null {
  if (!ip) return null
  if (/^[0:]+$/.test(ip.replace(/:/g, "0"))) return "localhost"
  if (ip === "::1" || ip === "127.0.0.1") return "localhost"
  if (ip.includes(":")) {
    const compressed = ip.replace(/(^|:)0+/g, "$1").replace(/:{2,}/, "::")
    return compressed === "::" ? "localhost" : compressed
  }
  return ip
}

export function SessionsList({
  sessions,
  isOwner,
  currentUserId,
}: {
  sessions: SessionItem[]
  isOwner: boolean
  currentUserId: string
}) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activity, setActivity] = useState<Record<string, ActivityEntry[]>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const { members } = usePresence()

  // Get set of online user IDs from presence
  const onlineUserIds = new Set(members.map((m) => m.id))

  const handleExpand = async (sessionId: string) => {
    if (expandedId === sessionId) {
      setExpandedId(null)
      return
    }
    setExpandedId(sessionId)
    if (!activity[sessionId]) {
      setLoading(sessionId)
      try {
        const entries = await getSessionActivity(sessionId)
        setActivity((prev) => ({ ...prev, [sessionId]: entries }))
      } catch {
        setActivity((prev) => ({ ...prev, [sessionId]: [] }))
      } finally {
        setLoading(null)
      }
    }
  }

  const handleRevoke = async (sessionId: string) => {
    await revokeSession(sessionId)
    router.refresh()
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
        No sessions found
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <div className="divide-y">
        {sessions.map((s) => {
          const os = parseOS(s.userAgent)
          const isExpired = new Date(s.expiresAt) < new Date()
          const isExpanded = expandedId === s.id
          const entries = activity[s.id]

          const isUserOnline = onlineUserIds.has(s.userId)

          return (
            <div key={s.id}>
              <div
                className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleExpand(s.id)}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <div className="flex items-center gap-1.5">
                      <UserStatusBadge status={isUserOnline ? "online" : "offline"} size="sm" />
                      <p className="text-sm font-medium truncate">
                        {s.userName}{os ? ` — ${os}` : ""}
                      </p>
                    </div>
                    {s.isCurrent && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">
                        Current
                      </Badge>
                    )}
                    {isExpired && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Expired
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {isOwner && <span>{s.userEmail}</span>}
                    {formatIp(s.ipAddress) && <span>{formatIp(s.ipAddress)}</span>}
                    <span>{new Date(s.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                {s.isCurrent ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      signOut({ fetchOptions: { onSuccess: () => router.push("/sign-in") } })
                    }}
                  >
                    Sign Out
                  </Button>
                ) : s.userId === currentUserId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRevoke(s.id)
                    }}
                  >
                    Revoke
                  </Button>
                ) : null}
              </div>
              {isExpanded && (
                <div className="border-t bg-muted/30 px-4 py-3">
                  {loading === s.id ? (
                    <p className="text-xs text-muted-foreground">Loading activity...</p>
                  ) : entries && entries.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Session Activity</p>
                      <div className="space-y-1.5">
                        {entries.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span>{actionLabels[entry.action] ?? entry.action}</span>
                              {entry.targetLabel && (
                                <span className="text-muted-foreground">{entry.targetLabel}</span>
                              )}
                            </div>
                            <span className="text-muted-foreground whitespace-nowrap">
                              {new Date(entry.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No activity recorded for this session.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
