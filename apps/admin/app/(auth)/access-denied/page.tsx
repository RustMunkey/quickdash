import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AccessDeniedPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left side - Hero image with logo overlay */}
      <div className="relative hidden lg:flex flex-col">
        <img
          src="/images/login.jpg"
          alt="Quickdash Coffee"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
        {/* Logo overlay on image */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-white/90 overflow-hidden">
              <img
                src="/logos/coffee.png"
                alt="Quickdash"
                className="size-6"
              />
            </div>
            <span className="font-[family-name:var(--font-rubik-mono)] text-white text-lg tracking-wide">
              QUICKDASH
            </span>
          </div>
        </div>
      </div>

      {/* Right side - Access denied message */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        {/* Mobile logo - only shows on small screens */}
        <div className="flex justify-center gap-2 lg:hidden">
          <div className="flex items-center gap-2 font-medium">
            <div className="flex size-8 items-center justify-center rounded-lg bg-foreground overflow-hidden">
              <img
                src="/logos/coffee-white.png"
                alt="Quickdash"
                className="size-5 dark:hidden"
              />
              <img
                src="/logos/coffee.png"
                alt="Quickdash"
                className="size-5 hidden dark:block"
              />
            </div>
            <span className="font-[family-name:var(--font-rubik-mono)] text-sm tracking-wide">
              QUICKDASH
            </span>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs space-y-6 text-center">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Access Denied</h1>
              <p className="text-sm text-muted-foreground text-balance">
                You need an invitation to access this admin panel.
                Contact an existing team member for access.
              </p>
            </div>
            <Button variant="outline" asChild className="w-full h-11">
              <Link href="/login">Try another account</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
