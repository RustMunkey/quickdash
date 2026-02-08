import { getEvents, getSchedulingTeamMembers } from "./actions"
import { SchedulingClient } from "./scheduling-client"

export default async function SchedulingPage() {
	const today = new Date().toISOString()

	const [events, teamMembers] = await Promise.all([
		getEvents({ view: "month", date: today }),
		getSchedulingTeamMembers(),
	])

	return <SchedulingClient initialEvents={events} teamMembers={teamMembers} />
}
