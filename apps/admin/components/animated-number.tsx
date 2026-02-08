"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface AnimatedNumberProps {
  value: number
  format?: "currency" | "number" | "percent"
  duration?: number
  className?: string
}

function formatValue(value: number, format?: "currency" | "number" | "percent"): string {
  switch (format) {
    case "currency":
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    case "percent":
      return `${value.toFixed(1)}%`
    default:
      return value.toLocaleString()
  }
}

/**
 * Animated number component with odometer-like effect
 * Numbers roll up/down when value changes
 */
export function AnimatedNumber({
  value,
  format,
  duration = 500,
  className,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)
  const prevValueRef = useRef(value)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const prevValue = prevValueRef.current
    if (prevValue === value) return

    setIsAnimating(true)
    const startTime = performance.now()
    const startValue = prevValue
    const endValue = value
    const diff = endValue - startValue

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3)

      const currentValue = startValue + (diff * easeProgress)
      setDisplayValue(Math.round(currentValue * 100) / 100)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
        setIsAnimating(false)
        prevValueRef.current = value
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, duration])

  // Determine direction for styling
  const direction = value > prevValueRef.current ? "up" : value < prevValueRef.current ? "down" : null

  return (
    <span
      className={cn(
        "tabular-nums transition-colors duration-300",
        isAnimating && direction === "up" && "text-stat-up",
        isAnimating && direction === "down" && "text-stat-down",
        className
      )}
    >
      {formatValue(displayValue, format)}
    </span>
  )
}
