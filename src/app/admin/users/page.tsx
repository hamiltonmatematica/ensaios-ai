
"use client"

import { useEffect, useState } from "react"
import { Users, Loader2, ArrowLeft, MoreHorizontal, Coins, CreditCard, Clock } from "lucide-react"
import { useRouter } from "next/navigation"

interface User {
    id: string
    name: string | null
    email: string
    credits: number
    role: string
    totalGenerations: number
    totalSpent: number
    lastAccess: string
    createdAt: string
}

export default function AdminUsersPage() {
    const router = useRouter()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchUsers() {
            try {
                const res = await fetch("/api/admin/users")
                if (res.ok) {
                    const data = await res.json()
                    setUsers(data)
                }
            } catch (error) {
                console.error("Erro ao carregar usuários", error)
            } finally {
                setLoading(false)
            }
        }
        fetchUsers()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.push("/admin")}
                        className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold">Usuários</h1>
                        <p className="text-zinc-500">Gestão e estatísticas da base de usuários</p>
                    </div>
                </header>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Usuário</th>
                                    <th className="px-6 py-4 font-medium">Role</th>
                                    <th className="px-6 py-4 font-medium text-center">Créditos</th>
                                    <th className="px-6 py-4 font-medium text-center">Gerações</th>
                                    <th className="px-6 py-4 font-medium text-center">Gasto Total</th>
                                    <th className="px-6 py-4 font-medium text-right">Cadastrado em</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-white">{user.name || "Sem nome"}</span>
                                                <span className="text-zinc-500 text-xs">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-400'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1 text-yellow-500 font-medium">
                                                <Coins className="w-3 h-3" />
                                                {user.credits}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-zinc-300">{user.totalGenerations}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1 text-green-400 font-medium">
                                                <CreditCard className="w-3 h-3" />
                                                {user.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 text-zinc-500">
                                                <Clock className="w-3 h-3" />
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {users.length === 0 && (
                        <div className="text-center py-12 text-zinc-500">
                            Nenhum usuário encontrado.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
