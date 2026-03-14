"use client"

import { Input } from "@/components/automator/ui/input"
import { Label } from "@/components/automator/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/automator/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/automator/ui/radio-group"
import { Card, CardContent } from "@/components/automator/ui/card"

interface StepSettingsProps {
    formData: any
    setFormData: (data: any) => void
}

export function StepSettings({ formData, setFormData }: StepSettingsProps) {
    const handleChange = (field: string, value: any) => {
        setFormData({ ...formData, [field]: value })
    }

    return (
        <div className="space-y-6">
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="title">Título / Tema do Post</Label>
                <Input
                    id="title"
                    placeholder="ex: A História da Inteligência Artificial"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">Sobre o que é este vídeo?</p>
            </div>

            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="platform">Plataforma</Label>
                <Select
                    value={formData.platform}
                    onValueChange={(value) => handleChange("platform", value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione a plataforma" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="YOUTUBE">YouTube (Longo)</SelectItem>
                        <SelectItem value="YOUTUBE_SHORTS">YouTube Shorts</SelectItem>
                        <SelectItem value="INSTAGRAM">Instagram Reels</SelectItem>
                        <SelectItem value="TIKTOK">TikTok</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-3">
                <Label>Estilo do Vídeo</Label>
                <RadioGroup
                    defaultValue={formData.type}
                    onValueChange={(value) => handleChange("type", value)}
                    className="grid grid-cols-2 gap-4"
                >
                    <div>
                        <RadioGroupItem value="AVATAR" id="avatar" className="peer sr-only" />
                        <Label
                            htmlFor="avatar"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                            <span className="text-xl mb-2">🤖</span>
                            <span className="font-semibold">Avatar IA</span>
                            <span className="text-xs text-muted-foreground text-center mt-1">
                                Apresentador falando para a câmera (estilo HeyGen)
                            </span>
                        </Label>
                    </div>
                    <div>
                        <RadioGroupItem value="DARK_CHANNEL" id="dark" className="peer sr-only" />
                        <Label
                            htmlFor="dark"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                            <span className="text-xl mb-2">🎬</span>
                            <span className="font-semibold">Canal Escuro</span>
                            <span className="text-xs text-muted-foreground text-center mt-1">
                                Narração com imagens e vídeos de fundo
                            </span>
                        </Label>
                    </div>
                </RadioGroup>
            </div>
        </div>
    )
}
