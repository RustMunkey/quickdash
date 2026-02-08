/**
 * Workspace-scoped Pusher channel names.
 *
 * All data channels include the workspace ID so that different
 * workspaces cannot eavesdrop on each other's real-time events.
 *
 * Pattern: private-workspace-{workspaceId}-{channel}
 */
export function wsChannel(workspaceId: string, channel: string): string {
  return `private-workspace-${workspaceId}-${channel}`
}

/**
 * Check if a channel name matches the workspace-scoped pattern
 * and extract the workspace ID from it.
 */
export function parseWorkspaceChannel(
  channelName: string
): { workspaceId: string; channel: string } | null {
  const match = channelName.match(
    /^private-workspace-([a-zA-Z0-9_-]+)-(.+)$/
  )
  if (!match) return null
  return { workspaceId: match[1], channel: match[2] }
}
