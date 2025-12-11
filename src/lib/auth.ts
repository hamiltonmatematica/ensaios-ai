import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// Configuração de opções do NextAuth
export const authOptions: NextAuthOptions = {
    providers: [
        // Provider de Email e Senha
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Senha", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const email = credentials.email
                const password = credentials.password

                // Busca usuário
                const user = await prisma.user.findUnique({
                    where: { email }
                })

                if (!user || !user.password) {
                    return null
                }

                // Verifica senha com bcrypt
                const isValid = await bcrypt.compare(password, user.password)

                if (!isValid) {
                    return null
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    credits: user.credits,
                    role: user.role,
                }
            }
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user, account }) {
            if (!user.email) return false

            // Sincroniza dados básicos se for login social
            if (account?.provider === "google") {
                await prisma.user.upsert({
                    where: { email: user.email },
                    update: {
                        name: user.name,
                        image: user.image,
                    },
                    create: {
                        email: user.email,
                        name: user.name,
                        image: user.image,
                        credits: 3,
                    }
                })
            }
            return true
        },
        async jwt({ token, user }) {
            if (user) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: user.email as string }
                })
                if (dbUser) {
                    token.id = dbUser.id
                    token.credits = dbUser.credits
                    token.role = dbUser.role
                }
            } else if (token.id) {
                // Atualizações subsequentes (sem 'user')
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: { credits: true, role: true }
                })
                if (dbUser) {
                    token.credits = dbUser.credits
                    token.role = dbUser.role
                }
            }
            return token
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string
                session.user.credits = (token.credits as number) ?? 0
                session.user.role = (token.role as "USER" | "ADMIN") ?? "USER"
            }
            return session
        },
    },
    pages: {
        signIn: "/auth/signin", // Vamos manter customizado? O usuário pediu modal, mas o auth precisa saber onde ir se falhar.
        // Como estamos usando modal, isso é menos crítico, mas bom ter.
    },
}

// Adiciona Google dinamicamente se configurado
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    authOptions.providers.push(
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })
    )
}

