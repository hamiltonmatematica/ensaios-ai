"use client"

import { useState } from "react"
import { Button } from "@/components/automator/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/automator/ui/card"
import { Input } from "@/components/automator/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/automator/ui/select"
import { Badge } from "@/components/automator/ui/badge"
import { Plus, Upload, Sparkles, Play, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/automator/ui/checkbox"

export default function TopicsPage() {
    const [selectedChannel, setSelectedChannel] = useState("all")
    const [selectedTopics, setSelectedTopics] = useState<string[]>([])

    // Mock data
    const channels = [
        { id: "1", name: "Eli Rigobeli - Aliens" },
        { id: "2", name: "Mistérios do Universo" }
    ]

    const topics = [
        { id: "1", channelId: "1", title: "10 encontros alienígenas reais", status: "PENDING", priority: 5 },
        { id: "2", channelId: "1", title: "O caso Roswell explicado", status: "PROCESSING", priority: 3 },
        { id: "3", channelId: "1", title: "Abdução na Amazônia", status: "PENDING", priority: 1 },
        { id: "4", channelId: "2", title: "Mistérios de Marte", status: "COMPLETED", priority: 0 },
    ]

    const toggleTopic = (id: string) => {
        setSelectedTopics(prev =>
            prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
        )
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any, label: string }> = {
            PENDING: { variant: "outline", label: "Pendente" },
            PROCESSING: { variant: "secondary", label: "Processando" },
            COMPLETED: { variant: "default", label: "Completo" },
            FAILED: { variant: "destructive", label: "Erro" }
        }
        const config = variants[status] || variants.PENDING
        return <Badge variant={config.variant}>{config.label}</Badge>
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Banco de Tópicos</h1>
                    <p className="text-muted-foreground">Gerenciar ideias para produção de conteúdo</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4" /> Importar CSV
                    </Button>
                    <Button variant="outline">
                        <Sparkles className="mr-2 h-4 w-4" /> Gerar com IA
                    </Button>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Adicionar Tópico
                    </Button>
                </div>
            </div>

            <div className="flex gap-4 mb-6">
                <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                    <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Filtrar por canal" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Canais</SelectItem>
                        {channels.map((channel) => (
                            <SelectItem key={channel.id} value={channel.id}>{channel.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {selectedTopics.length > 0 && (
                    <div className="flex gap-2">
                        <Button size="sm">
                            <Play className="mr-2 h-4 w-4" /> Produzir {selectedTopics.length} Selecionados
                        </Button>
                        <Button size="sm" variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </Button>
                    </div>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Tópicos ({topics.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {topics.map((topic) => (
                            <div
                                key={topic.id}
                                className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                                <Checkbox
                                    checked={selectedTopics.includes(topic.id)}
                                    onCheckedChange={() => toggleTopic(topic.id)}
                                />
                                <div className="flex-1">
                                    <h4 className="font-medium">{topic.title}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Canal: {channels.find(c => c.id === topic.channelId)?.name}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Prioridade: {topic.priority}</span>
                                    {getStatusBadge(topic.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
