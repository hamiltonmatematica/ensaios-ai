
"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/automator/ui/table"
import { Badge } from "@/components/automator/ui/badge"
import { Button } from "@/components/automator/ui/button"
import { MoreHorizontal, Play, Eye } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/automator/ui/dropdown-menu"

// Mock Data
const posts = [
    {
        id: "1",
        title: "O Futuro da IA",
        platform: "YOUTUBE",
        status: "PUBLICADO",
        date: "10/03/2024",
        views: 1205
    },
    {
        id: "2",
        title: "Top 5 Mistérios do Espaço",
        platform: "YOUTUBE_SHORTS",
        status: "AGENDADO",
        date: "12/03/2024",
        views: 0
    },
    {
        id: "3",
        title: "Tutorial de Programação: Next.js",
        platform: "TIKTOK",
        status: "GERANDO",
        date: "14/03/2024",
        views: 0
    },
    {
        id: "4",
        title: "História de Roma parte 1",
        platform: "YOUTUBE",
        status: "RASCUNHO",
        date: "15/03/2024",
        views: 0
    },
]

export default function HistoryPage() {
    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Histórico de Posts</h1>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Título</TableHead>
                            <TableHead>Plataforma</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {posts.map((post) => (
                            <TableRow key={post.id}>
                                <TableCell className="font-medium">{post.title}</TableCell>
                                <TableCell>{post.platform}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            post.status === "PUBLICADO" ? "default" :
                                                post.status === "GERANDO" ? "secondary" :
                                                    "outline"
                                        }
                                    >
                                        {post.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{post.date}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Abrir menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuItem>
                                                <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>Editar Post</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive">
                                                Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
