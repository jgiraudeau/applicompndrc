import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                try {
                    if (!credentials?.username || !credentials?.password) return null;

                    console.log("Attempting login to:", `${process.env.NEXT_PUBLIC_API_URL}/auth/token`);

                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/token`, {
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

                    // If no error and we have user data, return it
                    if (res.ok && user) {
                        return {
                            id: credentials.username,
                            email: credentials.username,
                            accessToken: user.access_token
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
            // PERSISTENT TOKEN: When user signs in, user object is passed
            if (user) {
                token.accessToken = user.accessToken
            }
            return token
        },
        async session({ session, token }: { session: any, token: any }) {
            session.accessToken = token.accessToken
            return session
        }
    },
    pages: {
        signIn: '/login',
    },
    debug: true, // Enable NextAuth debug logs
    secret: process.env.NEXTAUTH_SECRET || "temporary_debug_secret_do_not_use_in_production",
})

console.log("DEBUG: NEXTAUTH_SECRET defined?", !!process.env.NEXTAUTH_SECRET);

export { handler as GET, handler as POST }
