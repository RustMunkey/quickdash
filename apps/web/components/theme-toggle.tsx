"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sun02Icon, GibbousMoonIcon } from "@hugeicons/core-free-icons";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="inline-flex size-8 items-center justify-center rounded-full" disabled>
        <span className="size-4.5" />
      </button>
    );
  }

  return (
    <button
      className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <HugeiconsIcon
        icon={resolvedTheme === "dark" ? GibbousMoonIcon : Sun02Icon}
        size={18}
      />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
