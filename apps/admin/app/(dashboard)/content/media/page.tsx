import { getMediaItems } from "../actions"
import { MediaLibrary } from "./media-library"

export default async function MediaPage() {
	const items = await getMediaItems()

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<MediaLibrary items={items} />
		</div>
	)
}
