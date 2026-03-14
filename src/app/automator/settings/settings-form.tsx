
"use client"

import { Button } from "@/components/automator/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/automator/ui/card"
import { Input } from "@/components/automator/ui/input"
import { Label } from "@/components/automator/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/automator/ui/tabs"
import { updateUserApiKeys, ApiKeyInput } from "@/lib/automator/actions"
import { useState, useTransition } from "react"
import { toast } from "sonner"

interface SettingsFormProps {
    initialData?: {
        openaiKey?: string | null
        replicateKey?: string | null
        elevenlabsKey?: string | null
        heygenKey?: string | null
    } | null
}

export default function SettingsForm({ initialData }: SettingsFormProps) {
    const [isPending, startTransition] = useTransition()
    const [formData, setFormData] = useState<ApiKeyInput>({
        openaiKey: initialData?.openaiKey || "",
        replicateKey: initialData?.replicateKey || "",
        elevenlabsKey: initialData?.elevenlabsKey || "",
        heygenKey: initialData?.heygenKey || "",
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value })
    }

    const handleSubmit = () => {
        startTransition(async () => {
            try {
                await updateUserApiKeys(formData)
                toast.success("Chaves API salvas com sucesso!")
            } catch (error) {
                toast.error("Erro ao salvar chaves API.")
                console.error(error)
            }
        })
    }

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6">Configurações e Integrações</h1>

            <Tabs defaultValue="api-keys" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="api-keys">Chaves API</TabsTrigger>
                    <TabsTrigger value="social">Redes Sociais</TabsTrigger>
                    <TabsTrigger value="system">Sistema</TabsTrigger>
                </TabsList>

                <TabsContent value="api-keys">
                    <div className="grid gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Integrações de Serviços IA</CardTitle>
                                <CardDescription>
                                    Configure as chaves API para serviços externos.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1">
                                    <Label htmlFor="openaiKey">Chave API OpenAI</Label>
                                    <Input
                                        id="openaiKey"
                                        type="password"
                                        placeholder="sk-..."
                                        value={formData.openaiKey || ""}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="heygenKey">Chave API HeyGen</Label>
                                    <Input
                                        id="heygenKey"
                                        type="password"
                                        placeholder="..."
                                        value={formData.heygenKey || ""}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="elevenlabsKey">Chave API ElevenLabs</Label>
                                    <Input
                                        id="elevenlabsKey"
                                        type="password"
                                        placeholder="..."
                                        value={formData.elevenlabsKey || ""}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="replicateKey">Chave API Replicate</Label>
                                    <Input
                                        id="replicateKey"
                                        type="password"
                                        placeholder="r8_..."
                                        value={formData.replicateKey || ""}
                                        onChange={handleChange}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleSubmit} disabled={isPending}>
                                    {isPending ? "Salvando..." : "Salvar Alterações"}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="social">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contas de Redes Sociais</CardTitle>
                            <CardDescription>
                                Conecte suas contas do YouTube, Instagram e TikTok.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">YT</div>
                                    <div>
                                        <p className="font-medium">YouTube</p>
                                        <p className="text-sm text-muted-foreground">Não Conectado</p>
                                    </div>
                                </div>
                                <Button variant="outline">Conectar</Button>
                            </div>
                            {/* Add more social accounts */}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
