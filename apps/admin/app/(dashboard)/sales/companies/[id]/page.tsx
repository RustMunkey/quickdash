import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PageProps {
	params: Promise<{ id: string }>
}

export default async function CompanyDetailPage({ params }: PageProps) {
	const { id } = await params

	return (
		<div className="flex flex-1 flex-col gap-4 sm:gap-6 p-4 pt-0">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Company Details</h2>
					<p className="text-sm text-muted-foreground">
						View and manage company information.
					</p>
				</div>
				<Button>Edit</Button>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Company Info</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<p className="text-muted-foreground text-sm">Company ID: {id}</p>
							<p className="text-xs text-muted-foreground/60 mt-1">
								Company details will load here.
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Activity</CardTitle>
						<CardDescription>Timeline of interactions with this company.</CardDescription>
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
						<CardDescription>People at this company.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<p className="text-muted-foreground">No contacts</p>
							<Button variant="outline" className="mt-4">Add Contact</Button>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Deals</CardTitle>
						<CardDescription>Opportunities with this company.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<p className="text-muted-foreground">No deals</p>
							<Button variant="outline" className="mt-4">Create Deal</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
