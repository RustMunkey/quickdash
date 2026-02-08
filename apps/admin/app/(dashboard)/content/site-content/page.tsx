import { getSiteContent } from "../actions"
import { SiteContentEditor } from "./site-content-editor"

export default async function SiteContentPage() {
	const items = await getSiteContent()

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<p className="text-sm text-muted-foreground">Manage key-value content pairs used across your storefront.</p>
			<SiteContentEditor items={items} />
		</div>
	)
}
