"use client"

import { Label } from "@/components/automator/ui/label"
import { Card, CardContent } from "@/components/automator/ui/card"
import { Button } from "@/components/automator/ui/button"
import { ImagePlus } from "lucide-react"

interface StepMediaProps {
    formData: any
    setFormData: (data: any) => void
}

export function StepMedia({ formData, setFormData }: StepMediaProps) {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <Label>Recursos Visuais</Label>
                <p className="text-sm text-muted-foreground">
                    Gerencie imagens e vídeos para seu conteúdo.
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Placeholder for uploaded/generated images */}
                <Card className="aspect-video flex items-center justify-center bg-muted/50 border-dashed">
                    <Button variant="ghost" className="h-full w-full">
                        <div className="flex flex-col items-center gap-2">
                            <ImagePlus className="h-8 w-8 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Adicionar Mídia</span>
                        </div>
                    </Button>
                </Card>

                {/* Mock existing item */}
                {[1, 2].map((i) => (
                    <Card key={i} className="aspect-video relative group overflow-hidden">
                        {/* <img src="..." /> would go here */}
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                            <span className="text-xs font-mono text-muted-foreground">Recurso {i}</span>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-md text-sm text-blue-700 dark:text-blue-300">
                <strong>Nota:</strong> A geração automática de imagens baseada em segmentos do roteiro aparecerá aqui.
            </div>
        </div>
    )
}
