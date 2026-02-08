"use client"

import { useEffect, useState, useRef } from "react"
import { usePusher } from "@/components/pusher-provider"

export interface LiveProduct {
	id: string
	name: string
	slug: string
	price: string
	thumbnail: string | null
	isActive: boolean | null
	isFeatured: boolean | null
	categoryId: string | null
	categoryName: string | null
	createdAt: Date
	isNew?: boolean
}

interface ProductCreatedEvent {
	id: string
	name: string
	slug: string
	price: string
	thumbnail: string | null
	isActive: boolean | null
	isFeatured: boolean | null
	categoryId: string | null
	createdAt: string
}

interface ProductUpdatedEvent {
	id: string
	name?: string
	slug?: string
	price?: string
	thumbnail?: string | null
	isActive?: boolean | null
	isFeatured?: boolean | null
	categoryId?: string | null
}

interface ProductDeletedEvent {
	ids: string[]
}

interface ProductBulkUpdatedEvent {
	ids: string[]
	isActive: boolean
}

interface UseLiveProductsOptions {
	initialProducts: LiveProduct[]
}

/**
 * Hook for managing live product updates
 * Returns products array that updates in real-time
 */
export function useLiveProducts({ initialProducts }: UseLiveProductsOptions) {
	const { pusher, isConnected, workspaceId } = usePusher()
	const [products, setProducts] = useState<LiveProduct[]>(initialProducts)
	const initialRef = useRef(initialProducts)

	// Update when server data changes (e.g., pagination)
	useEffect(() => {
		if (JSON.stringify(initialProducts) !== JSON.stringify(initialRef.current)) {
			setProducts(initialProducts)
			initialRef.current = initialProducts
		}
	}, [initialProducts])

	useEffect(() => {
		if (!pusher || !isConnected || !workspaceId) return

		const channelName = `private-workspace-${workspaceId}-products`
		const channel = pusher.subscribe(channelName)

		// New product created - prepend to list
		channel.bind("product:created", (data: ProductCreatedEvent) => {
			setProducts((prev) => {
				if (prev.some((p) => p.id === data.id)) return prev
				const newProduct: LiveProduct = {
					...data,
					categoryName: null, // Will be filled on next server fetch
					createdAt: new Date(data.createdAt),
					isNew: true,
				}
				return [newProduct, ...prev]
			})
			// Remove new flag after animation
			setTimeout(() => {
				setProducts((prev) =>
					prev.map((p) => (p.id === data.id ? { ...p, isNew: false } : p))
				)
			}, 2000)
		})

		// Product updated - update in place
		channel.bind("product:updated", (data: ProductUpdatedEvent) => {
			setProducts((prev) =>
				prev.map((p) =>
					p.id === data.id
						? {
								...p,
								...(data.name !== undefined && { name: data.name }),
								...(data.slug !== undefined && { slug: data.slug }),
								...(data.price !== undefined && { price: data.price }),
								...(data.thumbnail !== undefined && { thumbnail: data.thumbnail }),
								...(data.isActive !== undefined && { isActive: data.isActive }),
								...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
								...(data.categoryId !== undefined && { categoryId: data.categoryId }),
						  }
						: p
				)
			)
		})

		// Products deleted - remove from list
		channel.bind("product:deleted", (data: ProductDeletedEvent) => {
			setProducts((prev) => prev.filter((p) => !data.ids.includes(p.id)))
		})

		// Bulk update - update isActive for multiple products
		channel.bind("product:bulk-updated", (data: ProductBulkUpdatedEvent) => {
			setProducts((prev) =>
				prev.map((p) =>
					data.ids.includes(p.id) ? { ...p, isActive: data.isActive } : p
				)
			)
		})

		return () => {
			channel.unbind_all()
			pusher.unsubscribe(channelName)
		}
	}, [pusher, isConnected, workspaceId])

	return { products, isConnected }
}
