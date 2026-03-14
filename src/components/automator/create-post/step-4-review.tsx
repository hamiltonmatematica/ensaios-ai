"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/automator/ui/card"
import { Badge } from "@/components/automator/ui/badge"

interface StepReviewProps {
    formData: any
}

export function StepReview({ formData }: StepReviewProps) {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Detalhes do Post
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between border-b pb-1">
                            <span className="font-semibold">Título:</span>
                            <span>{formData.title}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                            <span className="font-semibold">Plataforma:</span>
                            <Badge variant="secondary">{formData.platform}</Badge>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                            <span className="font-semibold">Tipo:</span>
                            <Badge variant={formData.type === "AVATAR" ? "default" : "outline"}>
                                {formData.type === "AVATAR" ? "Avatar IA" : "Canal Escuro"}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Resumo do Conteúdo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between border-b pb-1">
                            <span className="font-semibold">Tamanho do Roteiro:</span>
                            <span>{formData.script?.length || 0} caracteres</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                            <span className="font-semibold">Duração Estimada:</span>
                            <span>~{Math.ceil((formData.script?.length || 0) / 15)}s</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                            <span className="font-semibold">Recursos:</span>
                            <span>{formData.assets?.length || 0} itens</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-md border p-4 bg-muted/30">
                <h4 className="text-sm font-semibold mb-2">Prévia do Roteiro</h4>
                <p className="text-sm text-muted-foreground line-clamp-6 italic">
                    {formData.script || "Nenhum roteiro gerado."}
                </p>
            </div>
        </div>
    )
}
