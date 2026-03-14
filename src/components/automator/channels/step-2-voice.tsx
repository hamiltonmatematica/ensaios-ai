"use client"

import { Input } from "@/components/automator/ui/input"
import { Label } from "@/components/automator/ui/label"
import { Textarea } from "@/components/automator/ui/textarea"
import { Alert, AlertDescription } from "@/components/automator/ui/alert"
import { Info } from "lucide-react"

interface ChannelStepVoiceProps {
    formData: any
    setFormData: (data: any) => void
}

export function ChannelStepVoice({ formData, setFormData }: ChannelStepVoiceProps) {
    const handleChange = (field: string, value: any) => {
        setFormData({ ...formData, [field]: value })
    }

    return (
        <div className="space-y-6">
            {formData.type === "AVATAR" ? (
                <>
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Para canais com Avatar, você precisa configurar tanto a **voz** (ElevenLabs) quanto o **avatar visual** (HeyGen ou D-ID).
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label htmlFor="voiceId">ID da Voz (ElevenLabs) *</Label>
                        <Input
                            id="voiceId"
                            placeholder="y3X5crcIDtFawPx7bcNq"
                            value={formData.voiceId}
                            onChange={(e) => handleChange("voiceId", e.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">
                            Encontre em: <a href="https://elevenlabs.io/app/voice-library" target="_blank" rel="noopener" className="underline">ElevenLabs Voice Library</a>
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="avatarProvider">Provedor de Avatar</Label>
                        <Textarea
                            id="avatarProvider"
                            placeholder='{"provider": "heygen", "avatarId": "..."}'
                            value={JSON.stringify(formData.avatarConfig, null, 2)}
                            onChange={(e) => {
                                try {
                                    const parsed = JSON.parse(e.target.value)
                                    handleChange("avatarConfig", parsed)
                                } catch {
                                    // Ignora erro de parsing enquanto digita
                                }
                            }}
                            rows={5}
                        />
                        <p className="text-sm text-muted-foreground">
                            Configuração JSON para HeyGen ou D-ID. Exemplo: <code className="text-xs">{"{"}"provider": "heygen", "avatarId": "abc123"{"}"}</code>
                        </p>
                    </div>
                </>
            ) : (
                <>
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Para canais tipo "Dark Channel", você precisa apenas da **voz de narração** (ElevenLabs).
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label htmlFor="voiceId">ID da Voz (ElevenLabs) *</Label>
                        <Input
                            id="voiceId"
                            placeholder="y3X5crcIDtFawPx7bcNq"
                            value={formData.voiceId}
                            onChange={(e) => handleChange("voiceId", e.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">
                            Encontre em: <a href="https://elevenlabs.io/app/voice-library" target="_blank" rel="noopener" className="underline">ElevenLabs Voice Library</a>
                        </p>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-md">
                        <h4 className="font-semibold mb-2">ℹ️ Como encontrar o Voice ID:</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            <li>Acesse sua conta do ElevenLabs</li>
                            <li>Vá em "Voice Library" ou "My Voices"</li>
                            <li>Clique no ícone de configurações da voz desejada</li>
                            <li>Copie o "Voice ID"</li>
                        </ol>
                    </div>
                </>
            )}
        </div>
    )
}
