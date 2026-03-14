"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/automator/ui/card"
import { Button } from "@/components/automator/ui/button"
import { Badge } from "@/components/automator/ui/badge"
import { CheckCircle2, XCircle, Calendar } from "lucide-react"

export default function ReviewPage() {
    // Mock data
    const readyVideos = [
        {
            id: "1",
            title: "O MISTÉRIO DOS OVNIS NA AMAZÔNIA...",
            channel: "Eli Rigobeli - Aliens",
            thumbnailUrl: "/placeholder.jpg",
            duration: 180,
            description: "Uma história aterrorizante sobre avistamentos na floresta...",
            tags: ["alien", "ufo", "terror", "mistério"],
            createdAt: "2024-03-10"
        }
    ]

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Revisão de Vídeos</h1>
                    <p className="text-muted-foreground">Aprove ou edite vídeos prontos antes da publicação</p>
                </div>
            </div>

            <div className="space-y-6">
                {readyVideos.map((video) => (
                    <Card key={video.id}>
                        <CardHeader>
                            <CardTitle>{video.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">{video.channel}</p>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                                    <p className="text-muted-foreground">Prévia do Vídeo</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2">Descrição</h4>
                                        <p className="text-sm text-muted-foreground">{video.description}</p>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold mb-2">Tags</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {video.tags.map((tag) => (
                                                <Badge key={tag} variant="secondary">{tag}</Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        <span>Criado em {video.createdAt}</span>
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <Button className="flex-1">
                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar e Publicar
                                        </Button>
                                        <Button variant="outline">Editar</Button>
                                        <Button variant="destructive" size="icon">
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {readyVideos.length === 0 && (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Nenhum vídeo pendente de revisão</h3>
                            <p className="text-muted-foreground">Vídeos prontos aparecerão aqui para aprovação.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
