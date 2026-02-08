"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
	Calculator01Icon,
	ArrowUp01Icon,
	ArrowDown01Icon,
	Cancel01Icon,
	Copy01Icon,
	Delete02Icon,
	ArrowDown02Icon,
} from "@hugeicons/core-free-icons"
import { motion, AnimatePresence, useDragControls } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useCalculatorWidget, type CalculatorMode } from "./calculator-provider"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// Currency rates (in a real app, fetch from API)
const CURRENCY_RATES: Record<string, number> = {
	CAD: 1,
	USD: 0.74,
	MXN: 12.8,
	EUR: 0.68,
	GBP: 0.58,
	COP: 2900,
}

const CURRENCY_SYMBOLS: Record<string, string> = {
	CAD: "$",
	USD: "$",
	MXN: "$",
	EUR: "€",
	GBP: "£",
	COP: "$",
}

type Operation = "+" | "-" | "×" | "÷" | null

function formatNumber(num: number): string {
	if (Math.abs(num) >= 1e10 || (Math.abs(num) < 1e-6 && num !== 0)) {
		return num.toExponential(4)
	}
	const formatted = num.toLocaleString("en-US", {
		maximumFractionDigits: 8,
		minimumFractionDigits: 0,
	})
	return formatted
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
				"size-12 rounded-full flex items-center justify-center text-lg font-medium transition-all active:scale-95",
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

function BasicCalculator() {
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
						<span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
							{history[0]}
						</span>
					)}
				</div>
				<div className="text-right text-3xl font-light tracking-tight truncate">
					{display}
				</div>
			</div>

			{/* Keypad */}
			<div className="grid grid-cols-4 gap-2">
				<CalcButton variant="function" onClick={backspace}>
					<HugeiconsIcon icon={Delete02Icon} size={18} />
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

function CurrencyCalculator() {
	const [amount, setAmount] = React.useState("0")
	const [fromCurrency, setFromCurrency] = React.useState("CAD")
	const [toCurrency, setToCurrency] = React.useState("USD")
	const [waitingForInput, setWaitingForInput] = React.useState(false)

	const convertedAmount = React.useMemo(() => {
		const value = parseFloat(amount.replace(/,/g, "")) || 0
		const inCAD = value / CURRENCY_RATES[fromCurrency]
		const converted = inCAD * CURRENCY_RATES[toCurrency]
		return converted
	}, [amount, fromCurrency, toCurrency])

	const inputDigit = (digit: string) => {
		if (waitingForInput) {
			setAmount(digit)
			setWaitingForInput(false)
		} else {
			setAmount(amount === "0" ? digit : amount + digit)
		}
	}

	const inputDecimal = () => {
		if (waitingForInput) {
			setAmount("0.")
			setWaitingForInput(false)
		} else if (!amount.includes(".")) {
			setAmount(amount + ".")
		}
	}

	const clear = () => {
		setAmount("0")
		setWaitingForInput(false)
	}

	const backspace = () => {
		if (amount.length === 1) {
			setAmount("0")
		} else {
			setAmount(amount.slice(0, -1))
		}
	}

	const swapCurrencies = () => {
		const temp = fromCurrency
		setFromCurrency(toCurrency)
		setToCurrency(temp)
	}

	const copyResult = () => {
		navigator.clipboard.writeText(convertedAmount.toFixed(2))
		toast.success("Copied to clipboard")
	}

	const currencies = Object.keys(CURRENCY_RATES)

	return (
		<div className="p-3">
			{/* Currency Display */}
			<div className="mb-3 px-2 space-y-2">
				<div className="flex items-center justify-between">
					<select
						value={fromCurrency}
						onChange={(e) => setFromCurrency(e.target.value)}
						className="bg-transparent text-xs font-medium text-muted-foreground border-none focus:outline-none cursor-pointer"
					>
						{currencies.map((c) => (
							<option key={c} value={c}>{c}</option>
						))}
					</select>
					<div className="text-right text-2xl font-light">
						{CURRENCY_SYMBOLS[fromCurrency]}{amount}
					</div>
				</div>

				<div className="flex items-center justify-center">
					<button
						type="button"
						onClick={swapCurrencies}
						className="p-1 rounded-full hover:bg-muted transition-colors"
					>
						<HugeiconsIcon icon={ArrowDown02Icon} size={16} className="text-primary rotate-180" />
						<HugeiconsIcon icon={ArrowDown02Icon} size={16} className="text-primary -mt-1" />
					</button>
				</div>

				<div className="flex items-center justify-between border-t pt-2">
					<select
						value={toCurrency}
						onChange={(e) => setToCurrency(e.target.value)}
						className="bg-transparent text-xs font-medium text-muted-foreground border-none focus:outline-none cursor-pointer"
					>
						{currencies.map((c) => (
							<option key={c} value={c}>{c}</option>
						))}
					</select>
					<div className="flex items-center gap-2">
						<div className="text-right text-2xl font-light text-primary">
							{CURRENCY_SYMBOLS[toCurrency]}{formatNumber(convertedAmount)}
						</div>
						<Button variant="ghost" size="icon" className="size-6" onClick={copyResult}>
							<HugeiconsIcon icon={Copy01Icon} size={12} />
						</Button>
					</div>
				</div>
			</div>

			{/* Keypad */}
			<div className="grid grid-cols-4 gap-2">
				<CalcButton variant="function" onClick={backspace}>
					<HugeiconsIcon icon={Delete02Icon} size={18} />
				</CalcButton>
				<CalcButton variant="function" onClick={clear}>AC</CalcButton>
				<CalcButton variant="function" onClick={() => {}}>
					<span className="text-xs">Rate</span>
				</CalcButton>
				<CalcButton variant="operation" onClick={swapCurrencies}>⇅</CalcButton>

				<CalcButton onClick={() => inputDigit("7")}>7</CalcButton>
				<CalcButton onClick={() => inputDigit("8")}>8</CalcButton>
				<CalcButton onClick={() => inputDigit("9")}>9</CalcButton>
				<div />

				<CalcButton onClick={() => inputDigit("4")}>4</CalcButton>
				<CalcButton onClick={() => inputDigit("5")}>5</CalcButton>
				<CalcButton onClick={() => inputDigit("6")}>6</CalcButton>
				<div />

				<CalcButton onClick={() => inputDigit("1")}>1</CalcButton>
				<CalcButton onClick={() => inputDigit("2")}>2</CalcButton>
				<CalcButton onClick={() => inputDigit("3")}>3</CalcButton>
				<div />

				<CalcButton onClick={() => inputDigit("00")}>00</CalcButton>
				<CalcButton onClick={() => inputDigit("0")}>0</CalcButton>
				<CalcButton onClick={inputDecimal}>.</CalcButton>
				<CalcButton variant="operation" onClick={copyResult}>
					<HugeiconsIcon icon={Copy01Icon} size={18} />
				</CalcButton>
			</div>
		</div>
	)
}

function MarginCalculator() {
	const [cost, setCost] = React.useState("0")
	const [marginPercent, setMarginPercent] = React.useState("30")
	const [activeField, setActiveField] = React.useState<"cost" | "margin">("cost")

	const sellingPrice = React.useMemo(() => {
		const c = parseFloat(cost) || 0
		const m = parseFloat(marginPercent) || 0
		return c / (1 - m / 100)
	}, [cost, marginPercent])

	const profit = sellingPrice - (parseFloat(cost) || 0)

	const inputDigit = (digit: string) => {
		if (activeField === "cost") {
			setCost((prev) => (prev === "0" ? digit : prev + digit))
		} else {
			setMarginPercent((prev) => (prev === "0" ? digit : prev + digit))
		}
	}

	const inputDecimal = () => {
		if (activeField === "cost" && !cost.includes(".")) {
			setCost((prev) => prev + ".")
		} else if (activeField === "margin" && !marginPercent.includes(".")) {
			setMarginPercent((prev) => prev + ".")
		}
	}

	const clear = () => {
		if (activeField === "cost") {
			setCost("0")
		} else {
			setMarginPercent("0")
		}
	}

	const backspace = () => {
		if (activeField === "cost") {
			setCost((prev) => (prev.length === 1 ? "0" : prev.slice(0, -1)))
		} else {
			setMarginPercent((prev) => (prev.length === 1 ? "0" : prev.slice(0, -1)))
		}
	}

	const copyResult = () => {
		navigator.clipboard.writeText(sellingPrice.toFixed(2))
		toast.success("Copied to clipboard")
	}

	return (
		<div className="p-3">
			{/* Display */}
			<div className="mb-3 px-2 space-y-2">
				<button
					type="button"
					onClick={() => setActiveField("cost")}
					className={cn(
						"w-full flex items-center justify-between p-2 rounded-lg transition-colors",
						activeField === "cost" ? "bg-muted" : "hover:bg-muted/50"
					)}
				>
					<span className="text-xs text-muted-foreground">Cost</span>
					<span className="text-xl font-light">${cost}</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveField("margin")}
					className={cn(
						"w-full flex items-center justify-between p-2 rounded-lg transition-colors",
						activeField === "margin" ? "bg-muted" : "hover:bg-muted/50"
					)}
				>
					<span className="text-xs text-muted-foreground">Margin</span>
					<span className="text-xl font-light">{marginPercent}%</span>
				</button>

				<div className="flex items-center justify-between p-2 border-t">
					<span className="text-xs text-muted-foreground">Sell Price</span>
					<div className="flex items-center gap-2">
						<span className="text-xl font-light text-primary">${formatNumber(sellingPrice)}</span>
						<Button variant="ghost" size="icon" className="size-6" onClick={copyResult}>
							<HugeiconsIcon icon={Copy01Icon} size={12} />
						</Button>
					</div>
				</div>

				<div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
					<span>Profit</span>
					<span className="text-green-500">${formatNumber(profit)}</span>
				</div>
			</div>

			{/* Keypad */}
			<div className="grid grid-cols-4 gap-2">
				<CalcButton variant="function" onClick={backspace}>
					<HugeiconsIcon icon={Delete02Icon} size={18} />
				</CalcButton>
				<CalcButton variant="function" onClick={clear}>AC</CalcButton>
				<CalcButton variant="function" onClick={() => setMarginPercent("15")}>15%</CalcButton>
				<CalcButton variant="function" onClick={() => setMarginPercent("30")}>30%</CalcButton>

				<CalcButton onClick={() => inputDigit("7")}>7</CalcButton>
				<CalcButton onClick={() => inputDigit("8")}>8</CalcButton>
				<CalcButton onClick={() => inputDigit("9")}>9</CalcButton>
				<CalcButton variant="function" onClick={() => setMarginPercent("40")}>40%</CalcButton>

				<CalcButton onClick={() => inputDigit("4")}>4</CalcButton>
				<CalcButton onClick={() => inputDigit("5")}>5</CalcButton>
				<CalcButton onClick={() => inputDigit("6")}>6</CalcButton>
				<CalcButton variant="function" onClick={() => setMarginPercent("50")}>50%</CalcButton>

				<CalcButton onClick={() => inputDigit("1")}>1</CalcButton>
				<CalcButton onClick={() => inputDigit("2")}>2</CalcButton>
				<CalcButton onClick={() => inputDigit("3")}>3</CalcButton>
				<CalcButton variant="function" onClick={() => setMarginPercent("60")}>60%</CalcButton>

				<CalcButton onClick={() => setActiveField(activeField === "cost" ? "margin" : "cost")}>⇅</CalcButton>
				<CalcButton onClick={() => inputDigit("0")}>0</CalcButton>
				<CalcButton onClick={inputDecimal}>.</CalcButton>
				<CalcButton variant="operation" onClick={copyResult}>
					<HugeiconsIcon icon={Copy01Icon} size={18} />
				</CalcButton>
			</div>
		</div>
	)
}

function TaxCalculator() {
	const [amount, setAmount] = React.useState("0")
	const [taxRate, setTaxRate] = React.useState("13") // Ontario HST default
	const [mode, setMode] = React.useState<"add" | "remove">("add")

	const result = React.useMemo(() => {
		const a = parseFloat(amount) || 0
		const t = parseFloat(taxRate) || 0
		if (mode === "add") {
			return a * (1 + t / 100)
		} else {
			return a / (1 + t / 100)
		}
	}, [amount, taxRate, mode])

	const taxAmount = Math.abs(result - (parseFloat(amount) || 0))

	const inputDigit = (digit: string) => {
		setAmount((prev) => (prev === "0" ? digit : prev + digit))
	}

	const inputDecimal = () => {
		if (!amount.includes(".")) {
			setAmount((prev) => prev + ".")
		}
	}

	const clear = () => {
		setAmount("0")
	}

	const backspace = () => {
		setAmount((prev) => (prev.length === 1 ? "0" : prev.slice(0, -1)))
	}

	const copyResult = () => {
		navigator.clipboard.writeText(result.toFixed(2))
		toast.success("Copied to clipboard")
	}

	return (
		<div className="p-3">
			{/* Display */}
			<div className="mb-3 px-2 space-y-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setMode("add")}
							className={cn(
								"px-2 py-1 text-xs rounded-md transition-colors",
								mode === "add" ? "bg-primary text-primary-foreground" : "bg-muted"
							)}
						>
							+Tax
						</button>
						<button
							type="button"
							onClick={() => setMode("remove")}
							className={cn(
								"px-2 py-1 text-xs rounded-md transition-colors",
								mode === "remove" ? "bg-primary text-primary-foreground" : "bg-muted"
							)}
						>
							-Tax
						</button>
					</div>
					<select
						value={taxRate}
						onChange={(e) => setTaxRate(e.target.value)}
						className="bg-muted text-xs font-medium rounded-md px-2 py-1 border-none focus:outline-none cursor-pointer"
					>
						<option value="5">GST 5%</option>
						<option value="13">HST 13%</option>
						<option value="15">HST 15%</option>
						<option value="12">BC 12%</option>
						<option value="14.975">QC 14.975%</option>
					</select>
				</div>

				<div className="flex items-center justify-between p-2">
					<span className="text-xs text-muted-foreground">{mode === "add" ? "Before Tax" : "With Tax"}</span>
					<span className="text-xl font-light">${amount}</span>
				</div>

				<div className="flex items-center justify-between p-2 border-t">
					<span className="text-xs text-muted-foreground">{mode === "add" ? "With Tax" : "Before Tax"}</span>
					<div className="flex items-center gap-2">
						<span className="text-xl font-light text-primary">${formatNumber(result)}</span>
						<Button variant="ghost" size="icon" className="size-6" onClick={copyResult}>
							<HugeiconsIcon icon={Copy01Icon} size={12} />
						</Button>
					</div>
				</div>

				<div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
					<span>Tax ({taxRate}%)</span>
					<span>${formatNumber(taxAmount)}</span>
				</div>
			</div>

			{/* Keypad */}
			<div className="grid grid-cols-4 gap-2">
				<CalcButton variant="function" onClick={backspace}>
					<HugeiconsIcon icon={Delete02Icon} size={18} />
				</CalcButton>
				<CalcButton variant="function" onClick={clear}>AC</CalcButton>
				<CalcButton variant="function" onClick={() => setMode(mode === "add" ? "remove" : "add")}>
					{mode === "add" ? "+T" : "-T"}
				</CalcButton>
				<CalcButton variant="operation" onClick={() => setMode(mode === "add" ? "remove" : "add")}>⇅</CalcButton>

				<CalcButton onClick={() => inputDigit("7")}>7</CalcButton>
				<CalcButton onClick={() => inputDigit("8")}>8</CalcButton>
				<CalcButton onClick={() => inputDigit("9")}>9</CalcButton>
				<div />

				<CalcButton onClick={() => inputDigit("4")}>4</CalcButton>
				<CalcButton onClick={() => inputDigit("5")}>5</CalcButton>
				<CalcButton onClick={() => inputDigit("6")}>6</CalcButton>
				<div />

				<CalcButton onClick={() => inputDigit("1")}>1</CalcButton>
				<CalcButton onClick={() => inputDigit("2")}>2</CalcButton>
				<CalcButton onClick={() => inputDigit("3")}>3</CalcButton>
				<div />

				<CalcButton onClick={() => inputDigit("00")}>00</CalcButton>
				<CalcButton onClick={() => inputDigit("0")}>0</CalcButton>
				<CalcButton onClick={inputDecimal}>.</CalcButton>
				<CalcButton variant="operation" onClick={copyResult}>
					<HugeiconsIcon icon={Copy01Icon} size={18} />
				</CalcButton>
			</div>
		</div>
	)
}

const MODE_LABELS: Record<CalculatorMode, string> = {
	basic: "Basic",
	currency: "Currency",
	margin: "Margin",
	tax: "Tax",
}

export function CalculatorWidget() {
	const {
		isOpen,
		isMinimized,
		mode,
		closeWidget,
		toggleMinimize,
		setMode,
	} = useCalculatorWidget()

	const dragControls = useDragControls()

	if (!isOpen) return null

	if (isMinimized) {
		return (
			<AnimatePresence>
				<motion.div
					initial={{ scale: 0.8, opacity: 0, y: 20 }}
					animate={{ scale: 1, opacity: 1, y: 0 }}
					exit={{ scale: 0.8, opacity: 0, y: 20 }}
					drag
					dragMomentum={false}
					className="fixed bottom-4 right-36 z-50 flex items-center gap-2 rounded-full bg-background border shadow-lg px-3 py-2 cursor-grab active:cursor-grabbing"
				>
					<div className="flex items-center gap-2">
						<HugeiconsIcon
							icon={Calculator01Icon}
							size={14}
							className="text-muted-foreground"
						/>
						<span className="text-sm font-medium select-none">
							Calculator
						</span>
					</div>
					<Button variant="ghost" size="icon" className="size-6" onClick={toggleMinimize}>
						<HugeiconsIcon icon={ArrowUp01Icon} size={12} />
					</Button>
				</motion.div>
			</AnimatePresence>
		)
	}

	return (
		<AnimatePresence>
			<motion.div
				initial={{ scale: 0.8, opacity: 0, y: 20 }}
				animate={{ scale: 1, opacity: 1, y: 0 }}
				exit={{ scale: 0.8, opacity: 0, y: 20 }}
				drag
				dragMomentum={false}
				dragControls={dragControls}
				dragListener={false}
				className="fixed bottom-4 right-36 z-50 w-[240px] rounded-xl bg-background border shadow-xl overflow-hidden"
			>
				{/* Header - drag handle */}
				<div
					onPointerDown={(e) => dragControls.start(e)}
					className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 cursor-grab active:cursor-grabbing touch-none"
				>
					<div className="flex items-center gap-2">
						<HugeiconsIcon
							icon={Calculator01Icon}
							size={14}
							className="text-muted-foreground"
						/>
						<select
							value={mode}
							onChange={(e) => setMode(e.target.value as CalculatorMode)}
							className="bg-transparent text-xs font-medium text-muted-foreground border-none focus:outline-none cursor-pointer"
						>
							{Object.entries(MODE_LABELS).map(([value, label]) => (
								<option key={value} value={value}>{label}</option>
							))}
						</select>
					</div>
					<div className="flex items-center gap-1">
						<Button variant="ghost" size="icon" className="size-6" onClick={toggleMinimize}>
							<HugeiconsIcon icon={ArrowDown01Icon} size={12} />
						</Button>
						<Button variant="ghost" size="icon" className="size-6" onClick={closeWidget}>
							<HugeiconsIcon icon={Cancel01Icon} size={12} />
						</Button>
					</div>
				</div>

				{/* Calculator Content */}
				{mode === "basic" && <BasicCalculator />}
				{mode === "currency" && <CurrencyCalculator />}
				{mode === "margin" && <MarginCalculator />}
				{mode === "tax" && <TaxCalculator />}
			</motion.div>
		</AnimatePresence>
	)
}
