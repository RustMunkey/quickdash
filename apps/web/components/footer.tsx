import Image from "next/image";
import Link from "next/link";

const footerLinks = {
  Product: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Templates", href: "/templates" },
    { label: "Changelog", href: "/changelog" },
  ],
  Resources: [
    { label: "Docs", href: "/docs" },
    { label: "API Reference", href: "/docs/api" },
    { label: "Blog", href: "/blog" },
    { label: "Status", href: "/status" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Why Quickdash", href: "/why" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

export function Footer() {
  return (
    <footer className="rounded-t-[2.5rem] border-t border-border/40 bg-card">
      <div className="mx-auto px-8 py-16 sm:px-12 md:px-18">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 md:gap-12">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-foreground">
                {category}
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 sm:flex-row">
          <Link href="/" className="shrink-0">
            <Image
              src="/logos/wordmark.svg"
              alt="Quickdash"
              width={100}
              height={20}
              className="h-4 w-auto"
            />
          </Link>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Quickdash. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
