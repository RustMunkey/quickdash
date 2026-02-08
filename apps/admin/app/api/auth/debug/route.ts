import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth";

export async function GET() {
	const headersList = await headers();
	const cookieStore = await cookies();

	let session = null;
	let sessionError = null;

	try {
		session = await auth.api.getSession({
			headers: headersList,
		});
	} catch (e: any) {
		sessionError = e.message;
	}

	const allCookies = cookieStore.getAll().map(c => ({
		name: c.name,
		valuePreview: c.value.substring(0, 20) + "...",
	}));

	return NextResponse.json({
		hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
		googleClientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + "...",
		hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
		adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL,
		nodeEnv: process.env.NODE_ENV,
		session: session ? { userId: session.user.id, email: session.user.email } : null,
		sessionError,
		cookies: allCookies,
	});
}
