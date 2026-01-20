import NextAuth, { AuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials"
import { API_BASE_URL } from "@/lib/api";

// Helper to ensure API_BASE_URL is available
const getApiUrl = () => {
    // If running on server side, we might need to rely on the fallback in lib/api
    // or ensure NEXT_PUBLIC_API_URL is available.
    return API_BASE_URL;
}
const authOptions: AuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                    scope: "openid email profile https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.students https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/forms.body"
                }
            }
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                try {
                    if (!credentials?.username || !credentials?.password) return null;

                    console.log("Attempting login to:", `${getApiUrl()}/api/auth/token`);

                    const res = await fetch(`${getApiUrl()}/api/auth/token`, {
                        method: 'POST',
                        body: new URLSearchParams({
                            'username': credentials.username,
                            'password': credentials.password,
                            'grant_type': 'password'
                        }),
                        headers: { "Content-Type": "application/x-www-form-urlencoded" }
                    })

                    console.log("Backend response status:", res.status);

                    if (!res.ok) {
                        const errorText = await res.text();
                        console.error("Backend error response:", errorText);
                        return null;
                    }

                    const user = await res.json()

                    if (res.ok && user) {
                        return {
                            id: credentials.username,
                            email: credentials.username,
                            accessToken: user.access_token,
                            provider: "credentials"
                        }
                    }
                    return null
                } catch (error) {
                    console.error("Authorize error:", error);
                    return null;
                }
            }
        })
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user, account }: { token: any, user: any, account: any }) {
            console.log("🔥 JWT CALLBACK TRIGGERED 🔥");

            // 1. INITIAL SIGN IN (User & Account are present only on first call)
            if (user) {
                console.log("✅ Initial Sign In detected. User object:", JSON.stringify(user));

                // Save basic info
                token.id = user.id;
                token.email = user.email;

                // Extract Access Token depending on provider
                if (account?.provider === 'google') {
                    // Logic for Google Exchange
                    try {
                        const apiUrl = getApiUrl();
                        console.log(`Google Login: Exchanging token...`);
                        const res = await fetch(`${apiUrl}/api/auth/google`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: account.id_token })
                        });
                        if (res.ok) {
                            const data = await res.json();
                            token.accessToken = data.access_token;
                            token.googleAccessToken = account.access_token;
                            // Capture Refresh Token (only present on first consent or if forced)
                            if (account.refresh_token) {
                                console.log("✅ Refresh Token captured!");
                                token.googleRefreshToken = account.refresh_token;
                            }
                        }
                    } catch (e) {
                        console.error("Google Exchange Error", e);
                    }
                } else {
                    // Credentials Provider
                    token.accessToken = user.accessToken;
                }
            }

            // 2. TOKEN ENRICHMENT (Fetch Profile if we have a token)
            // This runs on every check to keep role/plan up to date
            if (token.accessToken) {
                // ... (No change to this block, assuming it's fine)
                console.log("🔄 Fetching User Profile with token:", token.accessToken.substring(0, 10) + "...");
                try {
                    const apiUrl = getApiUrl();
                    const meRes = await fetch(`${apiUrl}/api/auth/me`, {
                        headers: { Authorization: `Bearer ${token.accessToken}` },
                        cache: 'no-store'
                    });

                    if (meRes.ok) {
                        const userProfile = await meRes.json();
                        token.role = userProfile.role;
                        token.id = userProfile.id; // Store backend ID
                        token.email = userProfile.email;
                        token.status = userProfile.status;
                        token.plan_selection = userProfile.plan_selection;
                        token.stripeCustomerId = userProfile.stripe_customer_id;
                    } else {
                        // On 401, maybe we should invalidate? For now just log.
                        console.error("❌ Failed to fetch /me:", meRes.status);
                    }
                } catch (e) {
                    console.error("❌ Error fetching /me:", e);
                }
            }

            return token
        },
        async session({ session, token }: { session: any, token: any }) {
            session.accessToken = token.accessToken;
            session.googleAccessToken = token.googleAccessToken;
            session.googleRefreshToken = token.googleRefreshToken; // Added
            session.authError = token.authError;
            // Pass user details to session
            if (session.user) {
                session.user.role = token.role;
                session.user.id = token.id;
                session.user.email = token.email;
                session.user.status = token.status;
                session.user.plan_selection = token.plan_selection;
                session.user.stripeCustomerId = token.stripeCustomerId;
            }
            return session
        }
    },
    pages: {
        signIn: '/login',
    },
    debug: true,
    secret: process.env.NEXTAUTH_SECRET || "temporary_debug_secret_do_not_use_in_production",
}

const handler = NextAuth(authOptions);

export { authOptions };

console.log("DEBUG: NEXTAUTH_SECRET defined?", !!process.env.NEXTAUTH_SECRET);

export { handler as GET, handler as POST }
