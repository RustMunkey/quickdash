"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
} from "react";
import gsap from "gsap";

interface CardSwapProps {
  cardDistance?: number;
  verticalDistance?: number;
  delay?: number;
  pauseOnHover?: boolean;
  children: ReactElement<CardProps>[];
}

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return <div className={className}>{children}</div>;
}

export default function CardSwap({
  cardDistance = 30,
  verticalDistance = 20,
  delay = 5000,
  pauseOnHover = false,
  children,
}: CardSwapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const orderRef = useRef<number[]>([]);

  useEffect(() => {
    const cards = cardsRef.current;
    if (!cards.length) return;

    // Initialize order
    orderRef.current = cards.map((_, i) => i);

    // Position cards stacked with slight offset
    const positionCards = (animate = false) => {
      const order = orderRef.current;
      order.forEach((cardIndex, stackPos) => {
        const props = {
          x: stackPos * cardDistance,
          y: stackPos * verticalDistance,
          zIndex: cards.length - stackPos,
          scale: 1 - stackPos * 0.04,
          opacity: stackPos === 0 ? 1 : 0.6 - stackPos * 0.1,
        };
        if (animate) {
          gsap.to(cards[cardIndex], { ...props, duration: 0.6, ease: "power2.out" });
        } else {
          gsap.set(cards[cardIndex], props);
        }
      });
    };

    positionCards(false);

    const interval = setInterval(() => {
      if (isPaused) return;

      const order = orderRef.current;
      const frontCardIndex = order[0];

      // Animate front card out to the left and fade
      gsap.to(cards[frontCardIndex], {
        x: -200,
        opacity: 0,
        scale: 0.85,
        duration: 0.5,
        ease: "power2.in",
        onComplete: () => {
          // Move front to back
          order.push(order.shift()!);
          // Reposition all cards
          positionCards(true);
        },
      });
    }, delay);

    return () => clearInterval(interval);
  }, [cardDistance, verticalDistance, delay, isPaused]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full items-center justify-center"
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      {(children as ReactElement<CardProps>[]).map((child, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) cardsRef.current[i] = el;
          }}
          className="absolute"
        >
          {child}
        </div>
      ))}
    </div>
  );
}
