"use client"

import { Input } from "@/components/automator/ui/input"
import { Label } from "@/components/automator/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/automator/ui/select"
import { Textarea } from "@/components/automator/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/automator/ui/radio-group"

interface ChannelStepBasicProps {
    formData: any
    setFormData: (data: any) => void
}

export function ChannelStepBasic({ formData, setFormData }: ChannelStepBasicProps) {
    const handleChange = (field: string, value: any) => {
        setFormData({ ...formData, [field]: value })

        // Auto-gerar slug quando mudar o nome
        if (field === "name") {
            const slug = value
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
            setFormData({ ...formData, name: value, slug })
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="name">Nome do Canal *</Label>
                <Input
                    id="name"
                    placeholder="Ex: Eli Rigobeli IA - Histórias Aliens"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">Nome completo do seu canal</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="slug">Slug (identificador único) *</Label>
                <Input
                    id="slug"
                    placeholder="eli-rigobeli-aliens"
                    value={formData.slug}
                    onChange={(e) => handleChange("slug", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">Será usado nas URLs e organização interna</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                    id="description"
                    placeholder="Descrição do canal e tipo de conteúdo..."
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    rows={3}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="platform">Plataforma *</Label>
                    <Select
                        value={formData.platform}
                        onValueChange={(value) => handleChange("platform", value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="YOUTUBE">YouTube (Longo)</SelectItem>
                            <SelectItem value="YOUTUBE_SHORTS">YouTube Shorts</SelectItem>
                            <SelectItem value="TIKTOK">TikTok</SelectItem>
                            <SelectItem value="INSTAGRAM">Instagram Reels</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="language">Idioma *</Label>
                    <Select
                        value={formData.language}
                        onValueChange={(value) => handleChange("language", value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                            <SelectItem value="en-US">English (US)</SelectItem>
                            <SelectItem value="es-ES">Español</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-3">
                <Label>Tipo de Conteúdo *</Label>
                <RadioGroup
                    value={formData.type}
                    onValueChange={(value) => handleChange("type", value)}
                    className="grid grid-cols-2 gap-4"
                >
                    <div>
                        <RadioGroupItem value="AVATAR" id="avatar" className="peer sr-only" />
                        <Label
                            htmlFor="avatar"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                            <span className="text-4xl mb-2">🤖</span>
                            <span className="font-semibold">Avatar IA</span>
                            <span className="text-xs text-muted-foreground text-center mt-1">
                                Apresentador virtual falando (HeyGen, D-ID)
                            </span>
                        </Label>
                    </div>
                    <div>
                        <RadioGroupItem value="DARK_CHANNEL" id="dark" className="peer sr-only" />
                        <Label
                            htmlFor="dark"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                            <span className="text-4xl mb-2">🎬</span>
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
