import { MediaConverter } from "./media-converter"

export default function ConverterPage() {
	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<div>
				<h2 className="text-lg font-semibold">Media Converter</h2>
				<p className="text-sm text-muted-foreground">
					Convert and compress images. Drop a file, pick your format and quality, then download or save to your media library.
				</p>
			</div>
			<MediaConverter />
		</div>
	)
}
