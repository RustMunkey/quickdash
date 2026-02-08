import { NextResponse } from "next/server"
import { db } from "@quickdash/db/client"
import { analyticsEvents } from "@quickdash/db/schema"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, visitorId, pathname, referrer, hostname } = body

    if (!sessionId || !visitorId || !pathname) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await db.insert(analyticsEvents).values({
      sessionId: String(sessionId).slice(0, 64),
      visitorId: String(visitorId).slice(0, 64),
      pathname: String(pathname).slice(0, 2048),
      referrer: referrer ? String(referrer).slice(0, 2048) : null,
      hostname: hostname ? String(hostname).slice(0, 255) : null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
