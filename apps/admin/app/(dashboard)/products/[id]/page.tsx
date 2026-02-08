import { notFound } from "next/navigation"
import { getProduct, getCategories } from "../actions"
import { ProductForm } from "./product-form"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: PageProps) {
	const { id } = await params

	if (id === "new") {
		const categories = await getCategories()
		return (
			<div className="flex flex-1 flex-col p-4 pt-0">
				<ProductForm categories={categories} />
			</div>
		)
	}

	let product
	try {
		product = await getProduct(id)
	} catch {
		notFound()
	}

	const categories = await getCategories()

	return (
		<div className="flex flex-1 flex-col p-4 pt-0">
			<ProductForm product={product} categories={categories} />
		</div>
	)
}
