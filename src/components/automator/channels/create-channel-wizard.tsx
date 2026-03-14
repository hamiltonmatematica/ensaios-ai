"use client"

import { useState } from "react"
import { Button } from "@/components/automator/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/automator/ui/card"
import { Info, Bot, Palette, Plug } from "lucide-react"
import { toast, Toaster } from "sonner"

// Import steps
import { ChannelStepBasic } from "./step-1-basic"
import { ChannelStepVoice } from "./step-2-voice"
import { ChannelStepVisual } from "./step-3-visual"
import { ChannelStepIntegrations } from "./step-4-integrations"

export function CreateChannelWizard() {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        description: "",
        type: "AVATAR",
        platform: "YOUTUBE",
        language: "pt-BR",
        voiceId: "",
        avatarConfig: {},
        visualStylePrompt: "",
        musicFolderId: "",
        qtdImages: 5,
        googleDriveFolder: "",
        googleSpreadsheet: "",
        youtubeChannelId: ""
    })

    const nextStep = () => setStep(step + 1)
    const prevStep = () => setStep(step - 1)

    const handleCreate = async () => {
        try {
            toast.promise(
                fetch("/api/channels", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                }).then(async (res) => {
                    if (!res.ok) {
                        const error = await res.json()
                        throw new Error(error.error || "Falha ao criar canal")
                    }
                    return res.json()
                }),
                {
                    loading: "Criando canal...",
                    success: () => {
                        setTimeout(() => {
                            window.location.href = "/dashboard/channels"
                        }, 1500)
                        return "Canal criado com sucesso!"
                    },
                    error: (err) => `Erro: ${err.message}`,
                }
            )
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex justify-between mb-8">
                {[
                    { id: 1, label: "Informações Básicas", icon: Info },
                    { id: 2, label: "Voz/Avatar", icon: Bot },
                    { id: 3, label: "Estilo Visual", icon: Palette },
                    { id: 4, label: "Integrações", icon: Plug },
                ].map((s) => (
                    <div key={s.id} className={`flex flex-col items-center ${step >= s.id ? "text-primary" : "text-muted-foreground"}`}>
                        <div className={`p-2 rounded-full border-2 ${step >= s.id ? "border-primary bg-primary/10" : "border-muted"}`}>
                            <s.icon className="w-6 h-6" />
                        </div>
                        <span className="text-xs mt-2 text-center max-w-[80px]">{s.label}</span>
                    </div>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {step === 1 && "Informações Básicas do Canal"}
                        {step === 2 && "Configuração de Voz e Avatar"}
                        {step === 3 && "Estilo Visual e Produção"}
                        {step === 4 && "Integrações Externas"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="min-h-[400px]">
                        {step === 1 && <ChannelStepBasic formData={formData} setFormData={setFormData} />}
                        {step === 2 && <ChannelStepVoice formData={formData} setFormData={setFormData} />}
                        {step === 3 && <ChannelStepVisual formData={formData} setFormData={setFormData} />}
                        {step === 4 && <ChannelStepIntegrations formData={formData} setFormData={setFormData} />}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={prevStep} disabled={step === 1}>
                        Anterior
                    </Button>
                    <Button onClick={step === 4 ? handleCreate : nextStep}>
                        {step === 4 ? "Criar Canal" : "Próximo"}
                    </Button>
                </CardFooter>
            </Card>
            <Toaster />
        </div>
    )
}
