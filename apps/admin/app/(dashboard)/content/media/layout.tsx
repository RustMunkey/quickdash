import { requireWorkspace } from "@/lib/workspace"
import { FeatureGatePage } from "@/components/feature-gate"

export default async function MediaLibraryLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const workspace = await requireWorkspace()

	if (!workspace.features.mediaLibrary) {
		return <FeatureGatePage feature="mediaLibrary" features={workspace.features} featureName="Media Library" />
	}

	return <>{children}</>
}
