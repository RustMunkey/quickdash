"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import CurvedLoop from "@/components/CurvedLoop";
// import Marquee from "react-fast-marquee";

const videos = [
  "/videos/city.mp4",
  "/videos/developer.mp4",
  "/videos/warehouse.mp4",
  "/videos/packing.mp4",
  "/videos/printing.mp4",
  "/videos/hustle.mp4",
];

export default function Page() {
  const videoA = useRef<HTMLVideoElement>(null);
  const videoB = useRef<HTMLVideoElement>(null);
  const indexRef = useRef(0);
  const [aVisible, setAVisible] = useState(true);
  const [heroReady, setHeroReady] = useState(false);
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);

  // Hero text animation on mount
  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Features animation — fires every time section enters viewport
  useEffect(() => {
    const el = featuresRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setFeaturesVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const a = videoA.current!;
    const b = videoB.current!;
    let locked = false;

    a.src = videos[0];
    a.load();
    a.play().catch(() => {});
    b.src = videos[1];
    b.load();

    const advance = () => {
      indexRef.current = (indexRef.current + 1) % videos.length;
    };

    // Start crossfade 1s before current video ends
    const onATime = () => {
      if (locked || !a.duration) return;
      if (a.currentTime >= a.duration - 1) {
        locked = true;
        advance();

        b.currentTime = 0;
        b.play().catch(() => {});
        setAVisible(false);

        setTimeout(() => {
          const next = (indexRef.current + 1) % videos.length;
          a.src = videos[next];
          a.load();
          locked = false;
        }, 1100);
      }
    };

    const onBTime = () => {
      if (locked || !b.duration) return;
      if (b.currentTime >= b.duration - 1) {
        locked = true;
        advance();

        a.currentTime = 0;
        a.play().catch(() => {});
        setAVisible(true);

        setTimeout(() => {
          const next = (indexRef.current + 1) % videos.length;
          b.src = videos[next];
          b.load();
          locked = false;
        }, 1100);
      }
    };

    a.addEventListener("timeupdate", onATime);
    b.addEventListener("timeupdate", onBTime);
    return () => {
      a.removeEventListener("timeupdate", onATime);
      b.removeEventListener("timeupdate", onBTime);
    };
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-svh items-center justify-center overflow-hidden">
        <video
          ref={videoB}
          muted
          playsInline
          className="absolute inset-0 z-1 h-full w-full object-cover"
        />
        <video
          ref={videoA}
          muted
          playsInline
          className={`absolute inset-0 z-2 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
            aVisible ? "opacity-100" : "opacity-0"
          }`}
        />

        <div className="absolute inset-0 z-3 bg-black/40" />

        <div className="relative z-10 mx-auto w-full px-4 text-center">
          <h1 className={`text-4xl font-medium tracking-tight text-white sm:text-5xl sm:whitespace-nowrap md:text-6xl transition-all duration-1000 ease-out ${heroReady ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"}`}>
            <em className="font-bold italic">Quick</em> to launch. <em className="font-bold italic">Dash</em> to scale.
          </h1>
          <p className="mt-4 text-base text-white/70 sm:text-lg">
            One dashboard. Every tool your business needs to launch, sell, and grow.
          </p>

          {/* Email signup */}
          <form className="relative mt-8 mx-auto max-w-xl">
            <input
              type="email"
              placeholder="Enter your email"
              className="h-12 w-full rounded-full bg-white/10 pl-5 pr-36 text-sm text-white placeholder:text-white/50 backdrop-blur-xl outline-none focus:ring-2 focus:ring-white/30"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 rounded-full bg-white px-5 text-sm font-medium text-black transition-colors hover:bg-white/90"
            >
              Get Started
            </button>
          </form>
          <p className="mt-3 text-xs text-white/40">
            By signing up, you agree to receive marketing emails. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 -mt-6 rounded-t-[2.5rem] bg-background px-8 pt-24 pb-24 sm:px-12 md:px-18">
        <div className="mx-auto">
          <div ref={featuresRef} className="text-center">
            <h2 className={`text-3xl font-bold tracking-tight text-foreground sm:text-4xl transition-all duration-700 ${featuresVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              Everything you need to run your business
            </h2>
            <p className={`mt-3 text-muted-foreground sm:text-lg transition-all duration-700 delay-150 ${featuresVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              Manage it all from one place. Connect any frontend.
            </p>
          </div>

          {/* Bento grid */}
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Payments — large */}
            <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card sm:row-span-2">
              <div className="relative h-72 sm:h-full sm:min-h-[28rem]">
                <Image
                  src="/images/terminal.jpg"
                  alt="Payments"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 p-6">
                  <h3 className="text-xl font-semibold text-white">Payments</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">
                    Accept payments with Stripe, PayPal, and more. Test and live modes built in.
                  </p>
                </div>
              </div>
            </div>

            {/* Orders */}
            <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card">
              <div className="relative h-56">
                <Image
                  src="/images/orders.jpg"
                  alt="Orders"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 p-5">
                  <h3 className="text-lg font-semibold text-white">Orders</h3>
                  <p className="mt-1 text-sm text-white/70">
                    Track every order from checkout to delivery.
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card">
              <div className="relative h-56">
                <Image
                  src="/images/content.jpg"
                  alt="Content"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 p-5">
                  <h3 className="text-lg font-semibold text-white">Content</h3>
                  <p className="mt-1 text-sm text-white/70">
                    Dynamic collections for products, posts, and pages.
                  </p>
                </div>
              </div>
            </div>

            {/* Templates — wide */}
            <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card sm:col-span-2">
              <div className="relative h-52">
                <Image
                  src="/images/template.jpg"
                  alt="Templates"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 p-6">
                  <h3 className="text-xl font-semibold text-white">Templates</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">
                    Launch with pre-built frontends. Framework-agnostic, one-time purchase.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="bg-background px-8 py-24 sm:px-12 md:px-18">
        <div className="mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Up and running in minutes
          </h2>
          <p className="mt-3 text-muted-foreground sm:text-lg">
            Three steps. That&apos;s it.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8">
          {[
            {
              step: "01",
              title: "Connect",
              description: "Sign up, create a workspace, and plug in your API keys. Stripe, Resend, whatever you need.",
            },
            {
              step: "02",
              title: "Build",
              description: "Use our storefront API to wire up any frontend — your own stack, a template, or an existing site.",
            },
            {
              step: "03",
              title: "Launch",
              description: "Go live. Manage orders, content, payments, and customers from one dashboard.",
            },
          ].map((item) => (
            <div key={item.step} className="text-center sm:text-left">
              <div className="text-4xl font-bold text-muted-foreground/30">
                {item.step}
              </div>
              <h3 className="mt-3 text-xl font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Curved Loop */}
      <section className="bg-background">
        <CurvedLoop
          marqueeText="PAYMENTS ✦ ORDERS ✦ CONTENT ✦ TEMPLATES ✦ AUTH ✦ EMAIL ✦ "
          speed={2}
          curveAmount={200}
          direction="left"
          interactive
        />
      </section>

      {/* Integrations */}
      <section className="bg-background px-8 py-24 sm:px-12 md:px-18">
        <div className="mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Works with what you already use
          </h2>
          <p className="mt-3 text-muted-foreground sm:text-lg">
            Bring your own keys. Connect the tools your business runs on.
          </p>
        </div>

        {/* Placeholder for integration logos */}
        <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-8">
          {["Stripe", "PayPal", "Resend", "Vercel", "Shopify", "WordPress"].map((name) => (
            <div
              key={name}
              className="flex h-12 items-center rounded-lg border border-border/50 bg-card px-5"
            >
              <span className="text-sm font-medium text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-background px-8 py-24 sm:px-12 md:px-18">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-3 text-muted-foreground sm:text-lg">
              Everything you need to know.
            </p>
          </div>

          <div className="mt-12 divide-y divide-border/50">
            {[
              {
                q: "What is Quickdash?",
                a: "Quickdash is a headless backend-as-a-service. It gives you a full admin dashboard for managing products, orders, content, payments, and more — and a storefront API that any frontend can connect to.",
              },
              {
                q: "What frontends does it work with?",
                a: "Anything. Your own React/Next.js app, a template from our marketplace, or even an existing Shopify, WordPress, or Wix site. If it can make API calls, it works with Quickdash.",
              },
              {
                q: "Do I need to know how to code?",
                a: "Not necessarily. Our templates are plug-and-play. But if you're a developer, you'll love the flexibility of the storefront API.",
              },
              {
                q: "How does pricing work?",
                a: "We're finalizing pricing. Sign up for early access and you'll be the first to know — plus get a free month when we launch.",
              },
              {
                q: "What payment providers are supported?",
                a: "Stripe and PayPal out of the box, with more coming. You bring your own API keys so you keep full control of your funds.",
              },
              {
                q: "Can I use my own domain?",
                a: "Absolutely. Your frontend lives wherever you want — your domain, your hosting, your rules. Quickdash is just the backend.",
              },
            ].map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between text-left text-base font-medium text-foreground">
                  {item.q}
                  <span className="ml-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-background px-8 py-24 sm:px-12 md:px-18">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ready to ship?
          </h2>
          <p className="mt-3 text-muted-foreground sm:text-lg">
            Get started in minutes.
          </p>
          <form className="relative mx-auto mt-8 max-w-xl">
            <input
              type="email"
              placeholder="Enter your email"
              className="h-12 w-full rounded-full border border-border/50 bg-card pl-5 pr-36 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
