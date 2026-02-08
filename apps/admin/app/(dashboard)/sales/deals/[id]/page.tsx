import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function DealDetailPage({ params }: PageProps) {
	const { id } = await params

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Deal Details</h2>
					<p className="text-sm text-muted-foreground">
						Track this opportunity through your pipeline.
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline">Mark Won</Button>
					<Button variant="outline">Mark Lost</Button>
					<Button>Edit</Button>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Deal Value</CardDescription>
						<CardTitle className="text-2xl">$0</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Stage</CardDescription>
						<CardTitle className="text-2xl">--</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Probability</CardDescription>
						<CardTitle className="text-2xl">--%</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Expected Close</CardDescription>
						<CardTitle className="text-2xl">--</CardTitle>
					</CardHeader>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Deal Info</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<p className="text-muted-foreground text-sm">Deal ID: {id}</p>
							<p className="text-xs text-muted-foreground/60 mt-1">
								Deal details will load here.
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Activity</CardTitle>
						<CardDescription>Timeline of interactions for this deal.</CardDescription>
					</CardHeader>
					<CardContent>
						<Tabs defaultValue="all">
							<TabsList>
								<TabsTrigger value="all">All</TabsTrigger>
								<TabsTrigger value="calls">Calls</TabsTrigger>
								<TabsTrigger value="emails">Emails</TabsTrigger>
								<TabsTrigger value="notes">Notes</TabsTrigger>
							</TabsList>
							<TabsContent value="all" className="mt-4">
								<div className="flex flex-col items-center justify-center py-12 text-center">
									<p className="text-muted-foreground">No activity yet</p>
									<Button variant="outline" className="mt-4">Log Activity</Button>
								</div>
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Contacts</CardTitle>
						<CardDescription>People involved in this deal.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<p className="text-muted-foreground">No contacts linked</p>
							<Button variant="outline" className="mt-4">Link Contact</Button>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Tasks</CardTitle>
						<CardDescription>Follow-ups for this deal.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<p className="text-muted-foreground">No tasks</p>
							<Button variant="outline" className="mt-4">Add Task</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
