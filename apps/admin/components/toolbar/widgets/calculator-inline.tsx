"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon, Copy01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type Operation = "+" | "-" | "×" | "÷" | null

function formatNumber(num: number): string {
	if (Math.abs(num) >= 1e10 || (Math.abs(num) < 1e-6 && num !== 0)) {
		return num.toExponential(4)
	}
	return num.toLocaleString("en-US", {
		maximumFractionDigits: 8,
		minimumFractionDigits: 0,
	})
}

function CalcButton({
	children,
	onClick,
	variant = "number",
	className,
}: {
	children: React.ReactNode
	onClick: () => void
	variant?: "number" | "operation" | "function"
	className?: string
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"size-11 rounded-full flex items-center justify-center text-base font-medium transition-all active:scale-95",
				variant === "number" && "bg-muted hover:bg-muted/80 text-foreground",
				variant === "operation" && "bg-primary hover:bg-primary/90 text-primary-foreground",
				variant === "function" && "bg-muted/60 hover:bg-muted/40 text-muted-foreground",
				className
			)}
		>
			{children}
		</button>
	)
}

export function BasicCalculator() {
	const [display, setDisplay] = React.useState("0")
	const [previousValue, setPreviousValue] = React.useState<number | null>(null)
	const [operation, setOperation] = React.useState<Operation>(null)
	const [waitingForOperand, setWaitingForOperand] = React.useState(false)
	const [history, setHistory] = React.useState<string[]>([])

	const inputDigit = (digit: string) => {
		if (waitingForOperand) {
			setDisplay(digit)
			setWaitingForOperand(false)
		} else {
			setDisplay(display === "0" ? digit : display + digit)
		}
	}

	const inputDecimal = () => {
		if (waitingForOperand) {
			setDisplay("0.")
			setWaitingForOperand(false)
		} else if (!display.includes(".")) {
			setDisplay(display + ".")
		}
	}

	const clear = () => {
		setDisplay("0")
		setPreviousValue(null)
		setOperation(null)
		setWaitingForOperand(false)
	}

	const backspace = () => {
		if (display.length === 1 || (display.length === 2 && display.startsWith("-"))) {
			setDisplay("0")
		} else {
			setDisplay(display.slice(0, -1))
		}
	}

	const toggleSign = () => {
		const value = parseFloat(display)
		setDisplay(String(-value))
	}

	const percentage = () => {
		const value = parseFloat(display)
		setDisplay(String(value / 100))
	}

	const performOperation = (nextOperation: Operation) => {
		const inputValue = parseFloat(display)

		if (previousValue === null) {
			setPreviousValue(inputValue)
		} else if (operation) {
			const currentValue = previousValue
			let result: number

			switch (operation) {
				case "+":
					result = currentValue + inputValue
					break
				case "-":
					result = currentValue - inputValue
					break
				case "×":
					result = currentValue * inputValue
					break
				case "÷":
					result = currentValue / inputValue
					break
				default:
					result = inputValue
			}

			setDisplay(formatNumber(result))
			setPreviousValue(result)
		}

		setWaitingForOperand(true)
		setOperation(nextOperation)
	}

	const calculate = () => {
		if (operation === null || previousValue === null) return

		const inputValue = parseFloat(display)
		let result: number

		switch (operation) {
			case "+":
				result = previousValue + inputValue
				break
			case "-":
				result = previousValue - inputValue
				break
			case "×":
				result = previousValue * inputValue
				break
			case "÷":
				result = previousValue / inputValue
				break
			default:
				return
		}

		const historyEntry = `${formatNumber(previousValue)} ${operation} ${formatNumber(inputValue)} = ${formatNumber(result)}`
		setHistory((prev) => [historyEntry, ...prev].slice(0, 5))

		setDisplay(formatNumber(result))
		setPreviousValue(null)
		setOperation(null)
		setWaitingForOperand(true)
	}

	const copyResult = () => {
		navigator.clipboard.writeText(display.replace(/,/g, ""))
		toast.success("Copied to clipboard")
	}

	return (
		<div className="p-3">
			{/* Display */}
			<div className="mb-3 px-2">
				<div className="flex items-center justify-between mb-1">
					<Button
						variant="ghost"
						size="icon"
						className="size-6"
						onClick={copyResult}
					>
						<HugeiconsIcon icon={Copy01Icon} size={12} />
					</Button>
					{history.length > 0 && (
						<span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
							{history[0]}
						</span>
					)}
				</div>
				<div className="text-right text-3xl font-light tracking-tight truncate">
					{display}
				</div>
			</div>

			{/* Keypad */}
			<div className="grid grid-cols-4 gap-1.5 justify-items-center">
				<CalcButton variant="function" onClick={backspace}>
					<HugeiconsIcon icon={Delete02Icon} size={16} />
				</CalcButton>
				<CalcButton variant="function" onClick={clear}>AC</CalcButton>
				<CalcButton variant="function" onClick={percentage}>%</CalcButton>
				<CalcButton variant="operation" onClick={() => performOperation("÷")}>÷</CalcButton>

				<CalcButton onClick={() => inputDigit("7")}>7</CalcButton>
				<CalcButton onClick={() => inputDigit("8")}>8</CalcButton>
				<CalcButton onClick={() => inputDigit("9")}>9</CalcButton>
				<CalcButton variant="operation" onClick={() => performOperation("×")}>×</CalcButton>

				<CalcButton onClick={() => inputDigit("4")}>4</CalcButton>
				<CalcButton onClick={() => inputDigit("5")}>5</CalcButton>
				<CalcButton onClick={() => inputDigit("6")}>6</CalcButton>
				<CalcButton variant="operation" onClick={() => performOperation("-")}>−</CalcButton>

				<CalcButton onClick={() => inputDigit("1")}>1</CalcButton>
				<CalcButton onClick={() => inputDigit("2")}>2</CalcButton>
				<CalcButton onClick={() => inputDigit("3")}>3</CalcButton>
				<CalcButton variant="operation" onClick={() => performOperation("+")}>+</CalcButton>

				<CalcButton onClick={toggleSign}>±</CalcButton>
				<CalcButton onClick={() => inputDigit("0")}>0</CalcButton>
				<CalcButton onClick={inputDecimal}>.</CalcButton>
				<CalcButton variant="operation" onClick={calculate}>=</CalcButton>
			</div>
		</div>
	)
}
