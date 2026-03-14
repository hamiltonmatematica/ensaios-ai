"use client"

import { Button } from "@/components/automator/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/automator/ui/card"
import { Plus, Radio, ListTodo, PlayCircle, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function ChannelsPage() {
    // Mock data - será substituído por dados reais do banco
    const channels = [
        {
            id: "1",
            name: "Eli Rigobeli IA - Histórias Aliens",
            slug: "eli-rigobeli-aliens",
            type: "AVATAR",
            platform: "YOUTUBE",
            language: "pt-BR",
            postsCount: 45,
            status: "active"
        },
        {
            id: "2",
            name: "Mistérios do Universo",
            slug: "misterios-universo",
            type: "DARK_CHANNEL",
            platform: "YOUTUBE_SHORTS",
            language: "pt-BR",
            postsCount: 12,
            status: "active"
        }
    ]

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Canais</h1>
                    <p className="text-muted-foreground">Gerencie seus perfis e canais de produção</p>
                </div>
                <Link href="/dashboard/channels/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Criar Canal
                    </Button>
                </Link>
            </div>

            {channels.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Radio className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Nenhum canal criado</h3>
                        <p className="text-muted-foreground mb-4">Crie seu primeiro canal para começar a produzir conteúdo automaticamente.</p>
                        <Link href="/dashboard/channels/new">
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Criar Primeiro Canal
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {channels.map((channel) => (
                        <Card key={channel.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1 flex-1">
                                        <CardTitle className="text-lg">{channel.name}</CardTitle>
                                        <p className="text-sm text-muted-foreground">@{channel.slug}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <span className={`px-2 py-1 rounded-full text-xs ${channel.type === 'AVATAR'
                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                            }`}>
                                            {channel.type === 'AVATAR' ? '🤖 Avatar' : '🎬 Dark'}
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Plataforma</span>
                                        <span className="font-medium">{channel.platform}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Idioma</span>
                                        <span className="font-medium">{channel.language}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Vídeos</span>
                                        <span className="font-medium">{channel.postsCount}</span>
                                    </div>

                                    <div className="pt-3 flex gap-2">
                                        <Link href={`/dashboard/channels/${channel.id}`} className="flex-1">
                                            <Button variant="outline" size="sm" className="w-full">
                                                Gerenciar
                                            </Button>
                                        </Link>
                                        <Link href={`/dashboard/topics?channel=${channel.id}`}>
                                            <Button size="sm" variant="secondary">
                                                <ListTodo className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
