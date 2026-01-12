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
                    scope: "openid email profile https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.students"
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
            // Initial sign in
            if (account && user) {
                // If logging in with Google, exchange ID token for Backend Token
                if (account.provider === 'google') {
                    console.log("Google Login: Exchanging token with backend...");
                    try {
                        const apiUrl = getApiUrl();
                        console.log(`Google Login: Exchanging token with backend at ${apiUrl}...`);

                        const res = await fetch(`${apiUrl}/api/auth/google`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: account.id_token })
                        });

                        if (res.ok) {
                            const data = await res.json();
                            token.accessToken = data.access_token; // Our App Token
                            token.googleAccessToken = account.access_token; // Classroom Token
                            console.log("Google Login: Success! Backend token obtained.");
                        } else {
                            const err = await res.text();
                            console.error("Failed to sync Google User with Backend", err);
                            // Store error in token to show in client
                            token.authError = `Sync Error: ${err}`;
                        }
                    } catch (e: any) {
                        console.error("Backend Google Login Error", e);
                        token.authError = `Fetch Error: ${e.message}`;
                    }
                }
                // Debug: Check what's in the account object if token is missing
                if (!token.googleAccessToken && account && !token.authError) {
                    token.authError = `MISSING TOKEN. Provider: ${account.provider}. Account Keys: ${Object.keys(account).join(', ')}`;
                }

                if (account) {
                    console.log(`[JWT Debug] Provider: ${account.provider}`);
                }

                // If logging in with Credentials, we already have the token
                else if (user.accessToken) {
                    token.accessToken = user.accessToken;
                }
            }


            // Debug: Log token keys and estimated size
            const tokenSize = JSON.stringify(token).length;
            console.log(`[JWT Debug] API URL being used: ${getApiUrl()}`);
            console.log(`[JWT Debug] Token keys: ${Object.keys(token).join(', ')}`);
            if (token.authError) console.error(`[JWT Debug] Auth Error: ${token.authError}`);
            console.log(`[JWT Debug] Has AccessToken: ${!!token.accessToken}`);
            console.log(`[JWT Debug] Has Role: ${token.role}`);
            console.log(`[JWT Debug] Estimated Token Size: ${tokenSize} characters`);

            // Initial sign in or subsequent updates
            if (token.accessToken) {
                try {
                    // Always fetch user profile to sync role/status changes from backend
                    // if (!token.role) { // REMOVED: Force sync
                    const apiUrl = getApiUrl();
                    const meRes = await fetch(`${apiUrl}/api/auth/me`, {
                        headers: { Authorization: `Bearer ${token.accessToken}` }
                    });

                    if (meRes.ok) {
                        const userProfile = await meRes.json();
                        token.role = userProfile.role;
                        token.id = userProfile.id; // Store backend ID
                        token.email = userProfile.email;
                        token.status = userProfile.status;
                        token.plan_selection = userProfile.plan_selection;
                    }
                } catch (e) {
                    console.error("Error fetching user profile in JWT callback", e);
                }
            }

            return token
        },
        async session({ session, token }: { session: any, token: any }) {
            session.accessToken = token.accessToken;
            session.googleAccessToken = token.googleAccessToken;
            session.authError = token.authError;
            // Pass user details to session
            if (session.user) {
                session.user.role = token.role;
                session.user.id = token.id;
                session.user.email = token.email;
                session.user.status = token.status;
                session.user.plan_selection = token.plan_selection;
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
