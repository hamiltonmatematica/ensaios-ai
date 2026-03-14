"use client"

import { useState } from "react"
import { Button } from "@/components/automator/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/automator/ui/card"
import { Settings, PenTool, Image as ImageIcon, CheckCircle } from "lucide-react"
import { Toaster, toast } from "sonner"

// Import steps
import { StepSettings } from "./step-1-settings"
import { StepScript } from "./step-2-script"
import { StepMedia } from "./step-3-media"
import { StepReview } from "./step-4-review"

export function CreatePostWizard() {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        title: "",
        platform: "YOUTUBE",
        type: "AVATAR",
        script: "",
        assets: []
    })

    const nextStep = () => setStep(step + 1)
    const prevStep = () => setStep(step - 1)

    const handleCreate = async () => {
        try {
            toast.promise(
                fetch("/api/posts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                }).then(async (res) => {
                    if (!res.ok) {
                        const error = await res.json()
                        throw new Error(error.error || "Falha ao criar post")
                    }
                    return res.json()
                }),
                {
                    loading: "Criando post...",
                    success: () => {
                        setTimeout(() => {
                            window.location.href = "/dashboard/history"
                        }, 1500)
                        return "Post criado com sucesso!"
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
                    { id: 1, label: "Configurações", icon: Settings },
                    { id: 2, label: "Roteiro", icon: PenTool },
                    { id: 3, label: "Mídia", icon: ImageIcon },
                    { id: 4, label: "Revisar", icon: CheckCircle },
                ].map((s) => (
                    <div key={s.id} className={`flex flex-col items-center ${step >= s.id ? "text-primary" : "text-muted-foreground"}`}>
                        <div className={`p-2 rounded-full border-2 ${step >= s.id ? "border-primary bg-primary/10" : "border-muted"}`}>
                            <s.icon className="w-6 h-6" />
                        </div>
                        <span className="text-xs mt-2">{s.label}</span>
                    </div>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {step === 1 && "Configurações do Post"}
                        {step === 2 && "Geração de Roteiro"}
                        {step === 3 && "Configuração de Mídia"}
                        {step === 4 && "Revisar e Criar"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="min-h-[400px]">
                        {step === 1 && <StepSettings formData={formData} setFormData={setFormData} />}
                        {step === 2 && <StepScript formData={formData} setFormData={setFormData} />}
                        {step === 3 && <StepMedia formData={formData} setFormData={setFormData} />}
                        {step === 4 && <StepReview formData={formData} />}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={prevStep} disabled={step === 1}>
                        Anterior
                    </Button>
                    <Button onClick={step === 4 ? handleCreate : nextStep}>
                        {step === 4 ? "Criar Post" : "Próximo"}
                    </Button>
                </CardFooter>
            </Card>
            <Toaster />
        </div>
    )
}
