import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// Evita pre-rendering durante build
export const dynamic = 'force-dynamic'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
