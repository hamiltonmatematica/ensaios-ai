"use client"

import { Input } from "@/components/automator/ui/input"
import { Label } from "@/components/automator/ui/label"
import { Textarea } from "@/components/automator/ui/textarea"
import { Slider } from "@/components/automator/ui/slider"

interface ChannelStepVisualProps {
    formData: any
    setFormData: (data: any) => void
}

export function ChannelStepVisual({ formData, setFormData }: ChannelStepVisualProps) {
    const handleChange = (field: string, value: any) => {
        setFormData({ ...formData, [field]: value })
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="visualStylePrompt">Prompt de Estilo Visual</Label>
                <Textarea
                    id="visualStylePrompt"
                    placeholder="Descreva o estilo visual das imagens geradas (ex: fotorrealismo com terror alienígena, atmosfera nebulosa...)"
                    value={formData.visualStylePrompt}
                    onChange={(e) => handleChange("visualStylePrompt", e.target.value)}
                    rows={5}
                />
                <p className="text-sm text-muted-foreground">
                    Este prompt será usado como base para todas as imagens geradas. Seja específico sobre iluminação, cores, atmosfera.
                </p>
            </div>

            <div className="space-y-3">
                <Label htmlFor="qtdImages">Quantidade de Imagens por Vídeo: {formData.qtdImages}</Label>
                <Slider
                    id="qtdImages"
                    min={3}
                    max={10}
                    step={1}
                    value={[formData.qtdImages]}
                    onValueChange={(value) => handleChange("qtdImages", value[0])}
                    className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                    Define quantas cenas diferentes serão geradas para cada vídeo
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="musicFolderId">ID da Pasta de Músicas (Google Drive)</Label>
                <Input
                    id="musicFolderId"
                    placeholder="1a2b3c4d5e6f7g8h9i0j"
                    value={formData.musicFolderId}
                    onChange={(e) => handleChange("musicFolderId", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                    ID da pasta do Google Drive onde estão as músicas de fundo. Deixe vazio para não usar música.
                </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-md">
                <h4 className="font-semibold mb-2 text-blue-700 dark:text-blue-300">💡 Dica de Prompts</h4>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                    Para canais de terror/suspense, use termos como: "fotorrealismo cinematográfico, iluminação sombria,
                    atmosfera nebulosa, cores dessaturadas, elementos extraterrestres perturbadores"
                </p>
            </div>
        </div>
    )
}
