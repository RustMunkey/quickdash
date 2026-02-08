import { ChangelogClient } from "./changelog-client"

interface GitHubCommit {
	sha: string
	commit: {
		message: string
		author: {
			name: string
			date: string
		}
	}
	author: {
		login: string
		avatar_url: string
	} | null
}

async function getChangelog() {
	const token = process.env.GITHUB_ACCESS_TOKEN
	const headers: Record<string, string> = {
		Accept: "application/vnd.github.v3+json",
	}
	if (token) {
		headers.Authorization = `Bearer ${token}`
	}

	try {
		const commitsRes = await fetch(
			"https://api.github.com/repos/RustMunkey/quickdash/commits?per_page=50",
			{ headers, next: { revalidate: 300 } }
		)

		if (!commitsRes.ok) {
			return {
				commits: [],
				error:
					commitsRes.status === 401 || commitsRes.status === 404
						? "Configure GITHUB_ACCESS_TOKEN to view changelog"
						: "Failed to fetch changelog",
			}
		}

		const commits: GitHubCommit[] = await commitsRes.json()

		return {
			commits: commits.map((c) => ({
				sha: c.sha.slice(0, 7),
				message: c.commit.message.split("\n")[0],
				author: c.author?.login || c.commit.author.name,
				avatar: c.author?.avatar_url || null,
				date: c.commit.author.date,
			})),
			error: null,
		}
	} catch {
		return { commits: [], error: "Failed to connect to GitHub" }
	}
}

export default async function ChangelogPage() {
	const { commits, error } = await getChangelog()
	return <ChangelogClient commits={commits} error={error} />
}
