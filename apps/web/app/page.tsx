import Link from "next/link"

export default function HomePage() {
	return (
		<main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
			<div className="text-center max-w-2xl">
				<h1 className="text-5xl font-bold mb-4">QUICKDASH</h1>
				<p className="text-xl text-zinc-400 mb-8">
					Premium coffee, gear, and subscriptions. Coming soon.
				</p>
				<Link
					href="/contact"
					className="inline-block px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition-colors"
				>
					Contact Us
				</Link>
			</div>
		</main>
	)
}
