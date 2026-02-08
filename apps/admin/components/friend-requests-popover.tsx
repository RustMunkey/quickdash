"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { AddTeamIcon, Tick01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useSession } from "@/lib/auth-client"
import { usePusher } from "@/components/pusher-provider"
import {
  getPendingFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
} from "@/app/(dashboard)/discover/actions"

type IncomingRequest = {
  id: string
  requesterId: string
  createdAt: Date
  requesterName: string | null
  requesterUsername: string | null
  requesterImage: string | null
}

export function FriendRequestsPopover() {
  const router = useRouter()
  const { data: session } = useSession()
  const { pusher, isConnected } = usePusher()
  const [incoming, setIncoming] = React.useState<IncomingRequest[]>([])
  const [loading, setLoading] = React.useState(true)
  const [acting, setActing] = React.useState<string | null>(null)

  // Load pending requests on mount
  React.useEffect(() => {
    async function load() {
      try {
        const data = await getPendingFriendRequests()
        setIncoming(data.incoming)
      } catch {
        // Ignore - user may not be authenticated yet
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Subscribe to Pusher for real-time friend requests
  React.useEffect(() => {
    if (!pusher || !isConnected || !session?.user?.id) return

    const channel = pusher.subscribe(`private-user-${session.user.id}`)

    const handler = (data: { from: { id: string; name: string; image: string | null } }) => {
      setIncoming((prev) => {
        // Don't add duplicates
        if (prev.some((r) => r.requesterId === data.from.id)) return prev
        return [
          {
            id: crypto.randomUUID(),
            requesterId: data.from.id,
            createdAt: new Date(),
            requesterName: data.from.name,
            requesterUsername: null,
            requesterImage: data.from.image,
          },
          ...prev,
        ]
      })
    }

    channel.bind("friend-request", handler)

    return () => {
      channel.unbind("friend-request", handler)
    }
  }, [pusher, isConnected, session?.user?.id])

  async function handleAccept(requesterId: string) {
    setActing(requesterId)
    try {
      await acceptFriendRequest(requesterId)
      setIncoming((prev) => prev.filter((r) => r.requesterId !== requesterId))
    } catch {
      // Ignore
    } finally {
      setActing(null)
    }
  }

  async function handleDecline(requesterId: string) {
    setActing(requesterId)
    try {
      await declineFriendRequest(requesterId)
      setIncoming((prev) => prev.filter((r) => r.requesterId !== requesterId))
    } catch {
      // Ignore
    } finally {
      setActing(null)
    }
  }

  const count = incoming.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8"
          title="Friends & Discover"
        >
          <HugeiconsIcon icon={AddTeamIcon} size={16} />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-[9px] font-medium text-primary-foreground">
              {count}
            </span>
          )}
          <span className="sr-only">Friends & Discover</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-medium">Friend Requests</h3>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => router.push("/discover")}
          >
            View All
          </Button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : count === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No pending requests
            </div>
          ) : (
            <div className="divide-y">
              {incoming.map((request) => (
                <div key={request.requesterId} className="flex items-center gap-3 px-4 py-3">
                  <Link href={`/profile/${request.requesterId}`} className="shrink-0">
                    <Avatar size="sm">
                      {request.requesterImage && (
                        <AvatarImage src={request.requesterImage} alt={request.requesterName || ""} />
                      )}
                      <AvatarFallback>
                        {(request.requesterName || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <Link href={`/profile/${request.requesterId}`} className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate hover:underline">
                      {request.requesterName || "Unknown"}
                    </p>
                    {request.requesterUsername && (
                      <p className="text-xs text-muted-foreground truncate">
                        @{request.requesterUsername}
                      </p>
                    )}
                  </Link>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                      onClick={() => handleAccept(request.requesterId)}
                      disabled={acting === request.requesterId}
                      title="Accept"
                    >
                      <HugeiconsIcon icon={Tick01Icon} size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDecline(request.requesterId)}
                      disabled={acting === request.requesterId}
                      title="Decline"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
