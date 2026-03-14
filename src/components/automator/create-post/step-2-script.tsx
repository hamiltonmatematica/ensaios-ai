"use client"

import { useState } from "react"
import { Label } from "@/components/automator/ui/label"
import { Textarea } from "@/components/automator/ui/textarea"
import { Button } from "@/components/automator/ui/button"
import { Sparkles, Loader2 } from "lucide-react"

interface StepScriptProps {
    formData: any
    setFormData: (data: any) => void
}

export function StepScript({ formData, setFormData }: StepScriptProps) {
    const [isGenerating, setIsGenerating] = useState(false)

    const handleGenerate = async () => {
        setIsGenerating(true)
        try {
            const response = await fetch("/api/generate-script", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: formData.title,
                    platform: formData.platform,
                    type: formData.type
                })
            })

            if (!response.ok) throw new Error("Falha ao gerar roteiro")

            const data = await response.json()
            setFormData({ ...formData, script: data.script })
        } catch (error) {
            console.error(error)
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div className="space-y-1">
                    <Label htmlFor="script">Roteiro do Vídeo</Label>
                    <p className="text-sm text-muted-foreground">
                        Edite o roteiro abaixo ou gere um com IA.
                    </p>
                </div>
                <Button onClick={handleGenerate} disabled={isGenerating} size="sm">
                    {isGenerating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Gerando...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Gerar com IA
                        </>
                    )}
                </Button>
            </div>

            <Textarea
                id="script"
                className="min-h-[300px] font-mono text-sm leading-relaxed"
                placeholder="Digite seu roteiro aqui..."
                value={formData.script || ""}
                onChange={(e) => setFormData({ ...formData, script: e.target.value })}
            />

            <div className="flex justify-between text-xs text-muted-foreground">
                <span>Caracteres: {formData.script?.length || 0}</span>
                <span>Duração Estimada: {Math.ceil((formData.script?.length || 0) / 15)}s</span>
            </div>
        </div>
    )
}
