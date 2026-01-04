import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// Configuração de opções do NextAuth
export const authOptions: NextAuthOptions = {
    providers: [
        // Provider do Google
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
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
                    where: { email },
                    include: { creditBalance: true } // Incluir saldo
                })

                if (!user || !user.password) {
                    return null
                }

                // Verifica senha com bcrypt
                const isValid = await bcrypt.compare(password, user.password)

                if (!isValid) {
                    return null
                }

                const credits = user.creditBalance?.totalCredits ?? user.credits ?? 0

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    credits: credits,
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
            try {
                if (!user.email) return false

                // Se for login via Google, cria ou atualiza usuário
                if (account?.provider === "google") {
                    const existingUser = await prisma.user.findUnique({
                        where: { email: user.email },
                        include: { creditBalance: true }
                    })

                    if (!existingUser) {
                        // Cria novo usuário com 3 créditos gratuitos
                        // Em V2, criamos também o CreditBalance
                        try {
                            await prisma.user.create({
                                data: {
                                    email: user.email,
                                    name: user.name || "",
                                    image: user.image || "",
                                    credits: 3,
                                    creditBalance: {
                                        create: { totalCredits: 3 }
                                    }
                                }
                            })
                        } catch (createError) {
                            console.error("Erro ao criar usuário (possível race condition):", createError)
                            // Se falhar, tentamos recuperar o usuário que pode ter sido criado por outra requisição
                            const recoveredUser = await prisma.user.findUnique({
                                where: { email: user.email }
                            })
                            if (!recoveredUser) throw createError // Se realmente não existir, relança o erro
                        }
                    } else {
                        // FIX: Usuário existe mas não tem CreditBalance (criado antes de 03/01/2026)
                        // Migra automaticamente do campo legado 'credits' para o novo sistema
                        // Usamos upsert para evitar race conditions
                        try {
                            await prisma.creditBalance.upsert({
                                where: { userId: existingUser.id },
                                create: {
                                    userId: existingUser.id,
                                    totalCredits: existingUser.credits ?? 0
                                },
                                update: {
                                    // Se já existe, não faz nada (mantém o saldo atual)
                                }
                            })
                        } catch (upsertError) {
                            console.error("Erro ao migrar CreditBalance:", upsertError)
                            // Não bloqueia o login por erro na migração, apenas loga
                        }
                    }
                }

                return true
            } catch (error) {
                console.error("Erro no callback signIn:", error)
                return false // Retorna erro para o NextAuth redirecionar para página de erro
            }
        },
        async jwt({ token, user }) {
            if (user) {
                // Primeira vez (login)
                // Se o user veio do authorize, já tem os dados corretos
                // Se veio do GoogleProvider, precisamos buscar
                const dbUser = await prisma.user.findUnique({
                    where: { email: user.email as string },
                    include: { creditBalance: true }
                })

                if (dbUser) {
                    token.id = dbUser.id
                    token.credits = dbUser.creditBalance?.totalCredits ?? dbUser.credits ?? 0
                    token.role = dbUser.role
                }
            } else if (token.id) {
                // Atualizações subsequentes (sem 'user') - polling da sessão
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: {
                        credits: true,
                        role: true,
                        creditBalance: { select: { totalCredits: true } }
                    }
                })
                if (dbUser) {
                    token.credits = dbUser.creditBalance?.totalCredits ?? dbUser.credits ?? 0
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
        signIn: "/auth/signin",
    },
}
