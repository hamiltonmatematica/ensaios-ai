"use client"

import { Input } from "@/components/automator/ui/input"
import { Label } from "@/components/automator/ui/label"
import { Alert, AlertDescription } from "@/components/automator/ui/alert"
import { AlertCircle } from "lucide-react"

interface ChannelStepIntegrationsProps {
    formData: any
    setFormData: (data: any) => void
}

export function ChannelStepIntegrations({ formData, setFormData }: ChannelStepIntegrationsProps) {
    const handleChange = (field: string, value: any) => {
        setFormData({ ...formData, [field]: value })
    }

    return (
        <div className="space-y-6">
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Estas integrações são opcionais mas recomendadas para automação completa. Você pode configurá-las depois.
                </AlertDescription>
            </Alert>

            <div className="space-y-2">
                <Label htmlFor="googleDriveFolder">ID da Pasta do Google Drive (Vídeos Finais)</Label>
                <Input
                    id="googleDriveFolder"
                    placeholder="1a2b3c4d5e6f7g8h9i0j"
                    value={formData.googleDriveFolder}
                    onChange={(e) => handleChange("googleDriveFolder", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                    Pasta onde os vídeos finais serão salvos automaticamente
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="googleSpreadsheet">ID da Planilha do Google Sheets (Controle)</Label>
                <Input
                    id="googleSpreadsheet"
                    placeholder="1a2b3c4d5e6f7g8h9i0j"
                    value={formData.googleSpreadsheet}
                    onChange={(e) => handleChange("googleSpreadsheet", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                    Planilha para rastrear metadados e status de publicação
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="youtubeChannelId">ID do Canal do YouTube (Publicação Automática)</Label>
                <Input
                    id="youtubeChannelId"
                    placeholder="UCxxxxxxxxxxxxxxxxxxx"
                    value={formData.youtubeChannelId}
                    onChange={(e) => handleChange("youtubeChannelId", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                    Para upload automático no YouTube (requer autenticação OAuth)
                </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-md">
                <h4 className="font-semibold mb-2 text-yellow-700 dark:text-yellow-300">📋 Como encontrar IDs:</h4>
                <ul className="space-y-2 text-sm text-yellow-600 dark:text-yellow-400">
                    <li><strong>Google Drive:</strong> Abra a pasta e copie o ID da URL (após /folders/)</li>
                    <li><strong>Google Sheets:</strong> Abra a planilha e copie o ID da URL (entre /d/ e /edit)</li>
                    <li><strong>YouTube:</strong> Vá em Configurações → Canal Avançado → ID do Canal</li>
                </ul>
            </div>
        </div>
    )
}
