import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const token = await getToken({ req: request });
    const isAuth = !!token;
    const isAuthPage = request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname === "/";
    // const isAdminPage = request.nextUrl.pathname.startsWith("/admin");
    const isOnboardingPage = request.nextUrl.pathname.startsWith("/onboarding");

    // Logic:
    // 1. If NOT auth -> Redirect to Login (handled by matcher mostly, but let's be safe for protected routes)
    // 2. If Auth AND Pending -> Redirect to Onboarding (unless already there)
    // 3. If Auth AND Active AND Onboarding -> Redirect to Dashboard

    if (isAuth) {
        if ((token as any).status === "pending") {
            if (!isOnboardingPage) {
                return NextResponse.redirect(new URL("/onboarding", request.url));
            }
            return NextResponse.next();
        }

        // If user is active/approved but tries to access onboarding, send them to dashboard
        if ((token as any).status === "active" && isOnboardingPage) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }

        if (isAuthPage) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
    }

    // If not auth and accessing protected route
    if (!isAuth && !isAuthPage) {
        // Allow public routes if any (but here we protect mostly everything except landing)
        // Actually / is public.
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/chat/:path*", "/generate/:path*", "/admin/:path*", "/onboarding/:path*"],
};
