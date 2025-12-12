
"use client"

import { useEffect, useState } from "react"
import { Users, Loader2, ArrowLeft, Coins, CreditCard, Clock, Edit2, Trash2, X, Save, Plus, Minus, Shield, ShieldOff, Mail, User as UserIcon } from "lucide-react"
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

interface EditingUser {
    id: string
    name: string
    email: string
    credits: number
    role: string
}

export default function AdminUsersPage() {
    const router = useRouter()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [editingUser, setEditingUser] = useState<EditingUser | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Modal de adicionar créditos rápido
    const [quickCredits, setQuickCredits] = useState<{ userId: string, amount: number } | null>(null)

    useEffect(() => {
        fetchUsers()
    }, [])

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

    function showMessage(type: 'success' | 'error', text: string) {
        setMessage({ type, text })
        setTimeout(() => setMessage(null), 4000)
    }

    async function handleSaveUser() {
        if (!editingUser) return
        setSaving(true)

        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editingUser)
            })

            const data = await res.json()

            if (res.ok) {
                showMessage('success', 'Usuário atualizado com sucesso!')
                setEditingUser(null)
                fetchUsers()
            } else {
                showMessage('error', data.error || 'Erro ao atualizar usuário')
            }
        } catch (error) {
            showMessage('error', 'Erro de conexão')
        } finally {
            setSaving(false)
        }
    }

    async function handleQuickCredits(add: boolean) {
        if (!quickCredits) return

        const user = users.find(u => u.id === quickCredits.userId)
        if (!user) return

        setSaving(true)
        const newCredits = add
            ? user.credits + quickCredits.amount
            : Math.max(0, user.credits - quickCredits.amount)

        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: quickCredits.userId, credits: newCredits })
            })

            if (res.ok) {
                showMessage('success', `${add ? 'Adicionados' : 'Removidos'} ${quickCredits.amount} créditos`)
                setQuickCredits(null)
                fetchUsers()
            } else {
                const data = await res.json()
                showMessage('error', data.error || 'Erro ao atualizar créditos')
            }
        } catch (error) {
            showMessage('error', 'Erro de conexão')
        } finally {
            setSaving(false)
        }
    }

    async function handleDeleteUser(id: string) {
        setSaving(true)

        try {
            const res = await fetch(`/api/admin/users?id=${id}`, {
                method: "DELETE"
            })

            const data = await res.json()

            if (res.ok) {
                showMessage('success', 'Usuário removido com sucesso!')
                setDeleteConfirm(null)
                fetchUsers()
            } else {
                showMessage('error', data.error || 'Erro ao remover usuário')
            }
        } catch (error) {
            showMessage('error', 'Erro de conexão')
        } finally {
            setSaving(false)
        }
    }

    async function toggleRole(user: User) {
        const newRole = user.role === "ADMIN" ? "USER" : "ADMIN"

        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: user.id, role: newRole })
            })

            if (res.ok) {
                showMessage('success', `Usuário ${newRole === 'ADMIN' ? 'promovido a Admin' : 'rebaixado para Usuário'}`)
                fetchUsers()
            } else {
                const data = await res.json()
                showMessage('error', data.error || 'Erro ao alterar role')
            }
        } catch (error) {
            showMessage('error', 'Erro de conexão')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Message Toast */}
                {message && (
                    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                        }`}>
                        {message.text}
                    </div>
                )}

                <header className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.push("/admin")}
                        className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold">Usuários</h1>
                        <p className="text-zinc-500">Gestão completa da base de usuários • {users.length} usuários</p>
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
                                    <th className="px-6 py-4 font-medium text-center">Cadastrado em</th>
                                    <th className="px-6 py-4 font-medium text-center">Ações</th>
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
                                            <button
                                                onClick={() => toggleRole(user)}
                                                className={`px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 transition-all hover:scale-105 ${user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                                    }`}
                                                title={user.role === 'ADMIN' ? 'Clique para rebaixar' : 'Clique para promover'}
                                            >
                                                {user.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                                                {user.role}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setQuickCredits({ userId: user.id, amount: 10 })}
                                                className="flex items-center justify-center gap-1 text-yellow-500 font-medium hover:text-yellow-400 transition-colors hover:underline"
                                                title="Clique para adicionar/remover créditos"
                                            >
                                                <Coins className="w-3 h-3" />
                                                {user.credits}
                                            </button>
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
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 text-zinc-500">
                                                <Clock className="w-3 h-3" />
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => setEditingUser({
                                                        id: user.id,
                                                        name: user.name || '',
                                                        email: user.email,
                                                        credits: user.credits,
                                                        role: user.role
                                                    })}
                                                    className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-blue-400 transition-colors"
                                                    title="Editar usuário"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(user.id)}
                                                    className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
                                                    title="Deletar usuário"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
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

                {/* Modal de Edição */}
                {editingUser && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-zinc-800">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold">Editar Usuário</h2>
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-2">
                                        <UserIcon className="w-4 h-4" /> Nome
                                    </label>
                                    <input
                                        type="text"
                                        value={editingUser.name}
                                        onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 focus:border-yellow-500 outline-none"
                                        placeholder="Nome do usuário"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-2">
                                        <Mail className="w-4 h-4" /> Email
                                    </label>
                                    <input
                                        type="email"
                                        value={editingUser.email}
                                        onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 focus:border-yellow-500 outline-none"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-2">
                                        <Coins className="w-4 h-4" /> Créditos
                                    </label>
                                    <input
                                        type="number"
                                        value={editingUser.credits}
                                        onChange={e => setEditingUser({ ...editingUser, credits: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 focus:border-yellow-500 outline-none"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1 flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> Role
                                    </label>
                                    <select
                                        value={editingUser.role}
                                        onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 focus:border-yellow-500 outline-none"
                                    >
                                        <option value="USER">USER</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveUser}
                                    disabled={saving}
                                    className="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Créditos Rápido */}
                {quickCredits && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm border border-zinc-800">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Coins className="w-5 h-5 text-yellow-500" /> Gerenciar Créditos
                                </h2>
                                <button
                                    onClick={() => setQuickCredits(null)}
                                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="text-center mb-6">
                                <p className="text-zinc-400 mb-2">Créditos atuais:</p>
                                <p className="text-3xl font-bold text-yellow-500">
                                    {users.find(u => u.id === quickCredits.userId)?.credits || 0}
                                </p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm text-zinc-400 mb-2 text-center">Quantidade</label>
                                <div className="flex items-center gap-2">
                                    {[5, 10, 25, 50, 100].map(amount => (
                                        <button
                                            key={amount}
                                            onClick={() => setQuickCredits({ ...quickCredits, amount })}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${quickCredits.amount === amount
                                                ? 'bg-yellow-500 text-black'
                                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                                }`}
                                        >
                                            {amount}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleQuickCredits(false)}
                                    disabled={saving}
                                    className="flex-1 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Minus className="w-4 h-4" />
                                    Remover
                                </button>
                                <button
                                    onClick={() => handleQuickCredits(true)}
                                    disabled={saving}
                                    className="flex-1 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Adicionar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Confirmação de Deleção */}
                {deleteConfirm && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm border border-zinc-800">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Trash2 className="w-8 h-8 text-red-500" />
                                </div>
                                <h2 className="text-xl font-bold mb-2">Deletar Usuário?</h2>
                                <p className="text-zinc-400 mb-6">
                                    Esta ação é irreversível. Todos os dados do usuário serão removidos permanentemente.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setDeleteConfirm(null)}
                                        className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(deleteConfirm)}
                                        disabled={saving}
                                        className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        Deletar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
