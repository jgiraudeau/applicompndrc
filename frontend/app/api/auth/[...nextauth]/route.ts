import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials"
import { API_BASE_URL } from "@/lib/api";

// Helper to ensure API_BASE_URL is available
const getApiUrl = () => {
    // If running on server side, we might need to rely on the fallback in lib/api
    // or ensure NEXT_PUBLIC_API_URL is available.
    return API_BASE_URL;
}
const handler = NextAuth({
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

                    console.log("Attempting login to:", `${getApiUrl()}/auth/token`);

                    const res = await fetch(`${getApiUrl()}/auth/token`, {
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

                        const res = await fetch(`${apiUrl}/auth/google`, {
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
                if (!token.googleAccessToken && account) {
                    token.authError = `MISSING TOKEN. Account Keys: ${Object.keys(account).join(', ')}`;
                }

                // If logging in with Credentials, we already have the token
                else if (user.accessToken) {
                    token.accessToken = user.accessToken;
                }
            }
            return token
        },
        async session({ session, token }: { session: any, token: any }) {
            session.accessToken = token.accessToken;
            session.googleAccessToken = token.googleAccessToken;
            session.authError = token.authError;
            return session
        }
    },
    pages: {
        signIn: '/login',
    },
    debug: true,
    secret: process.env.NEXTAUTH_SECRET || "temporary_debug_secret_do_not_use_in_production",
})

console.log("DEBUG: NEXTAUTH_SECRET defined?", !!process.env.NEXTAUTH_SECRET);

export { handler as GET, handler as POST }
