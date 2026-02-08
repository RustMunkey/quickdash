"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown02Icon, Copy01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type ConversionCategory = "weight" | "volume" | "temperature"

const CONVERSIONS: Record<ConversionCategory, {
	units: string[]
	convert: (value: number, from: string, to: string) => number
}> = {
	weight: {
		units: ["ct", "g", "oz", "lbs", "kg"],
		convert: (value, from, to) => {
			// Convert to grams first (1 carat = 0.2 grams)
			const toGrams: Record<string, number> = {
				ct: 0.2,
				g: 1,
				oz: 28.3495,
				lbs: 453.592,
				kg: 1000,
			}
			const grams = value * toGrams[from]
			return grams / toGrams[to]
		},
	},
	volume: {
		units: ["L", "mL", "gal", "fl oz", "cups"],
		convert: (value, from, to) => {
			// Convert to mL first
			const toMl: Record<string, number> = {
				L: 1000,
				mL: 1,
				gal: 3785.41,
				"fl oz": 29.5735,
				cups: 236.588,
			}
			const ml = value * toMl[from]
			return ml / toMl[to]
		},
	},
	temperature: {
		units: ["°C", "°F", "K"],
		convert: (value, from, to) => {
			// Convert to Celsius first
			let celsius: number
			switch (from) {
				case "°C":
					celsius = value
					break
				case "°F":
					celsius = (value - 32) * (5 / 9)
					break
				case "K":
					celsius = value - 273.15
					break
				default:
					celsius = value
			}
			// Convert from Celsius to target
			switch (to) {
				case "°C":
					return celsius
				case "°F":
					return celsius * (9 / 5) + 32
				case "K":
					return celsius + 273.15
				default:
					return celsius
			}
		},
	},
}

export function ConverterWidget() {
	const [category, setCategory] = React.useState<ConversionCategory>("weight")
	const [value, setValue] = React.useState("1")
	const [fromUnit, setFromUnit] = React.useState("ct")
	const [toUnit, setToUnit] = React.useState("g")

	const conversion = CONVERSIONS[category]

	// Reset units when category changes
	React.useEffect(() => {
		setFromUnit(conversion.units[0])
		setToUnit(conversion.units[1])
	}, [category, conversion.units])

	const result = React.useMemo(() => {
		const num = parseFloat(value) || 0
		return conversion.convert(num, fromUnit, toUnit)
	}, [value, fromUnit, toUnit, conversion])

	const swap = () => {
		const temp = fromUnit
		setFromUnit(toUnit)
		setToUnit(temp)
	}

	const copyResult = () => {
		navigator.clipboard.writeText(result.toFixed(4))
		toast.success("Copied to clipboard")
	}

	return (
		<div className="p-4 space-y-4">
			{/* Category tabs */}
			<div className="flex gap-1 p-1 bg-muted rounded-lg">
				{(Object.keys(CONVERSIONS) as ConversionCategory[]).map((cat) => (
					<button
						key={cat}
						type="button"
						onClick={() => setCategory(cat)}
						className={cn(
							"flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors capitalize",
							category === cat
								? "bg-background shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						)}
					>
						{cat}
					</button>
				))}
			</div>

			{/* From */}
			<div className="space-y-2">
				<div className="flex gap-2">
					<Input
						type="number"
						value={value}
						onChange={(e) => setValue(e.target.value)}
						className="text-lg font-mono"
					/>
					<select
						value={fromUnit}
						onChange={(e) => setFromUnit(e.target.value)}
						className="bg-muted text-sm font-medium rounded-md px-3 border-none focus:outline-none cursor-pointer min-w-[70px]"
					>
						{conversion.units.map((unit) => (
							<option key={unit} value={unit}>{unit}</option>
						))}
					</select>
				</div>
			</div>

			{/* Swap button */}
			<div className="flex justify-center">
				<Button
					variant="ghost"
					size="icon"
					className="size-8 rounded-full"
					onClick={swap}
				>
					<HugeiconsIcon icon={ArrowDown02Icon} size={16} className="rotate-180" />
					<HugeiconsIcon icon={ArrowDown02Icon} size={16} className="-mt-2" />
				</Button>
			</div>

			{/* To */}
			<div className="space-y-2">
				<div className="flex gap-2">
					<div className="flex-1 flex items-center px-3 bg-muted/50 rounded-md border">
						<span className="text-lg font-mono text-primary">
							{result.toLocaleString(undefined, { maximumFractionDigits: 4 })}
						</span>
					</div>
					<select
						value={toUnit}
						onChange={(e) => setToUnit(e.target.value)}
						className="bg-muted text-sm font-medium rounded-md px-3 border-none focus:outline-none cursor-pointer min-w-[70px]"
					>
						{conversion.units.map((unit) => (
							<option key={unit} value={unit}>{unit}</option>
						))}
					</select>
				</div>
			</div>

			{/* Copy button */}
			<Button
				variant="outline"
				size="sm"
				className="w-full"
				onClick={copyResult}
			>
				<HugeiconsIcon icon={Copy01Icon} size={14} className="mr-2" />
				Copy Result
			</Button>

			{/* Quick reference */}
			<div className="text-[10px] text-muted-foreground text-center">
				{category === "weight" && "Great for gemstone measurements"}
				{category === "volume" && "Perfect for liquid conversions"}
				{category === "temperature" && "Useful for shipping & storage"}
			</div>
		</div>
	)
}
