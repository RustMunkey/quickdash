import type { CollectionSchema } from "@quickdash/db/schema"

export type CollectionTemplate = {
	name: string
	slug: string
	description: string
	icon: string
	schema: CollectionSchema
	allowPublicSubmit?: boolean
	publicSubmitStatus?: string
}

export const COLLECTION_TEMPLATES: CollectionTemplate[] = [
	{
		name: "FAQ",
		slug: "faq",
		description: "Frequently asked questions",
		icon: "help-circle",
		schema: {
			fields: [
				{ key: "question", label: "Question", type: "text", required: true },
				{ key: "answer", label: "Answer", type: "textarea", required: true },
				{ key: "category", label: "Category", type: "text", placeholder: "general" },
				{ key: "isFeatured", label: "Featured", type: "boolean" },
			],
			settings: {
				titleField: "question",
				descriptionField: "answer",
				defaultSort: "sortOrder",
				defaultSortDir: "asc",
			},
		},
	},
	{
		name: "Testimonials",
		slug: "testimonials",
		description: "Customer reviews and testimonials",
		icon: "star",
		allowPublicSubmit: true,
		publicSubmitStatus: "inactive",
		schema: {
			fields: [
				{ key: "reviewerName", label: "Reviewer Name", type: "text", required: true },
				{ key: "reviewerEmail", label: "Reviewer Email", type: "email" },
				{ key: "rating", label: "Rating", type: "rating", required: true },
				{ key: "title", label: "Title", type: "text" },
				{ key: "content", label: "Content", type: "textarea", required: true },
				{
					key: "status",
					label: "Status",
					type: "select",
					required: true,
					options: [
						{ label: "Pending", value: "pending" },
						{ label: "Approved", value: "approved" },
						{ label: "Rejected", value: "rejected" },
					],
				},
				{ key: "isFeatured", label: "Featured", type: "boolean" },
			],
			settings: {
				titleField: "reviewerName",
				descriptionField: "content",
				defaultSort: "createdAt",
				defaultSortDir: "desc",
			},
		},
	},
	{
		name: "Stats",
		slug: "stats",
		description: "Key statistics and numbers",
		icon: "bar-chart",
		schema: {
			fields: [
				{ key: "title", label: "Title", type: "text", required: true },
				{ key: "value", label: "Value", type: "text", required: true },
				{ key: "description", label: "Description", type: "textarea" },
				{ key: "icon", label: "Icon", type: "text" },
			],
			settings: {
				titleField: "title",
				descriptionField: "description",
				defaultSort: "sortOrder",
				defaultSortDir: "asc",
			},
		},
	},
	{
		name: "Team Members",
		slug: "team-members",
		description: "Team or staff directory",
		icon: "users",
		schema: {
			fields: [
				{ key: "name", label: "Name", type: "text", required: true },
				{ key: "role", label: "Role / Title", type: "text", required: true },
				{ key: "photo", label: "Photo URL", type: "image" },
				{ key: "bio", label: "Bio", type: "textarea" },
				{ key: "email", label: "Email", type: "email" },
				{ key: "linkedin", label: "LinkedIn", type: "url" },
			],
			settings: {
				titleField: "name",
				descriptionField: "role",
				imageField: "photo",
				defaultSort: "sortOrder",
				defaultSortDir: "asc",
			},
		},
	},
	{
		name: "Gallery",
		slug: "gallery",
		description: "Image or portfolio gallery",
		icon: "image",
		schema: {
			fields: [
				{ key: "title", label: "Title", type: "text", required: true },
				{ key: "image", label: "Image URL", type: "image", required: true },
				{ key: "description", label: "Description", type: "textarea" },
				{ key: "category", label: "Category", type: "text" },
			],
			settings: {
				titleField: "title",
				imageField: "image",
				defaultSort: "sortOrder",
				defaultSortDir: "asc",
			},
		},
	},
	{
		name: "Partners",
		slug: "partners",
		description: "Partner logos and links",
		icon: "handshake",
		schema: {
			fields: [
				{ key: "name", label: "Partner Name", type: "text", required: true },
				{ key: "logo", label: "Logo URL", type: "image" },
				{ key: "website", label: "Website", type: "url" },
				{ key: "description", label: "Description", type: "textarea" },
			],
			settings: {
				titleField: "name",
				imageField: "logo",
				defaultSort: "sortOrder",
				defaultSortDir: "asc",
			},
		},
	},
	{
		name: "Services",
		slug: "services",
		description: "Products or services offered",
		icon: "briefcase",
		schema: {
			fields: [
				{ key: "name", label: "Service Name", type: "text", required: true },
				{ key: "description", label: "Description", type: "textarea", required: true },
				{ key: "icon", label: "Icon", type: "text" },
				{ key: "price", label: "Price", type: "text" },
				{ key: "link", label: "Link", type: "url" },
			],
			settings: {
				titleField: "name",
				descriptionField: "description",
				defaultSort: "sortOrder",
				defaultSortDir: "asc",
			},
		},
	},
	{
		name: "Projects",
		slug: "projects",
		description: "Portfolio projects or case studies",
		icon: "folder",
		schema: {
			fields: [
				{ key: "title", label: "Title", type: "text", required: true },
				{ key: "description", label: "Description", type: "textarea", required: true },
				{ key: "image", label: "Cover Image", type: "image" },
				{ key: "url", label: "Project URL", type: "url" },
				{ key: "tags", label: "Tags", type: "text" },
				{ key: "year", label: "Year", type: "text" },
			],
			settings: {
				titleField: "title",
				descriptionField: "description",
				imageField: "image",
				defaultSort: "sortOrder",
				defaultSortDir: "asc",
			},
		},
	},
]
