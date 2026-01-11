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
                if (!credentials?.username || !credentials?.password) return null;

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/token`, {
                    method: 'POST',
                    body: new URLSearchParams({
                        'username': credentials.username,
                        'password': credentials.password,
                        'grant_type': 'password'
                    }),
                    headers: { "Content-Type": "application/x-www-form-urlencoded" }
                })

                const user = await res.json()

                // If no error and we have user data, return it
                if (res.ok && user) {
                    // We return the minimal needed to identify session. 
                    // In a real app we might fetch profile here or in session callback.
                    return {
                        id: credentials.username, // Using email as ID for simple session matching
                        email: credentials.username,
                        accessToken: user.access_token
                    }
                }
                // Return null if user data could not be retrieved
                return null
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
    }
})

export { handler as GET, handler as POST }
