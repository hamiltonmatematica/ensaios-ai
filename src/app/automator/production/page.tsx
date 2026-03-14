"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/automator/ui/card"
import { Badge } from "@/components/automator/ui/badge"
import { Progress } from "@/components/automator/ui/progress"
import { PlayCircle, Loader2, CheckCircle2, XCircle } from "lucide-react"

export default function ProductionPage() {
    // Mock data - será substituído por dados em tempo real
    const queue = [
        {
            id: "1",
            title: "10 encontros alienígenas reais",
            channel: "Eli Rigobeli - Aliens",
            status: "GENERATING",
            currentStep: "Gerando imagens",
            progress: 65,
            startedAt: "há 5 minutos"
        },
        {
            id: "2",
            title: "Mistérios de Marte",
            channel: "Mistérios do Universo",
            status: "QUEUED",
            currentStep: "Na fila",
            progress: 0,
            startedAt: "-"
        }
    ]

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "GENERATING":
                return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            case "QUEUED":
                return <PlayCircle className="h-5 w-5 text-muted-foreground" />
            case "COMPLETED":
                return <CheckCircle2 className="h-5 w-5 text-green-500" />
            case "FAILED":
                return <XCircle className="h-5 w-5 text-red-500" />
            default:
                return null
        }
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Fila de Produção</h1>
                    <p className="text-muted-foreground">Monitoramento em tempo real da produção de vídeos</p>
                </div>
            </div>

            <div className="space-y-4">
                {queue.map((item) => (
                    <Card key={item.id}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {getStatusIcon(item.status)}
                                    <div>
                                        <CardTitle className="text-lg">{item.title}</CardTitle>
                                        <p className="text-sm text-muted-foreground">{item.channel}</p>
                                    </div>
                                </div>
                                <Badge variant={item.status === "GENERATING" ? "default" : "outline"}>
                                    {item.currentStep}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Progresso</span>
                                    <span className="font-medium">{item.progress}%</span>
                                </div>
                                <Progress value={item.progress} className="h-2" />
                                <p className="text-xs text-muted-foreground">Iniciado {item.startedAt}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {queue.length === 0 && (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <PlayCircle className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Nenhuma produção em andamento</h3>
                            <p className="text-muted-foreground">Selecione tópicos para iniciar a produção automática.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
