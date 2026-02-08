import { TRIGGER_CATEGORIES } from "../constants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function TriggersPage() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
			<div>
				<p className="text-sm text-muted-foreground">
					Events that can start your automated workflows.
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{Object.entries(TRIGGER_CATEGORIES).map(([key, category]) => (
					<Card key={key}>
						<CardHeader>
							<CardTitle className="text-base">{category.label}</CardTitle>
							<CardDescription>
								{category.triggers.length} trigger{category.triggers.length !== 1 ? "s" : ""}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-2">
								{category.triggers.map((trigger) => (
									<Badge key={trigger.value} variant="secondary">
										{trigger.label}
									</Badge>
								))}
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	)
}
