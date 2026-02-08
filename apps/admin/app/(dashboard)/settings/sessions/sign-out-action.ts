"use server"

import { logAudit } from "@/lib/audit"

export async function logSignOut() {
  await logAudit({
    action: "auth.sign_out",
  })
}
