"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/automator/utils"
import { LayoutDashboard, Radio, ListTodo, PlayCircle, CheckCircle, History, Settings } from "lucide-react"

export function DashboardNav() {
    const pathname = usePathname()

    const items = [
        {
            title: "Painel",
            href: "/dashboard",
            icon: LayoutDashboard,
        },
        {
            title: "Canais",
            href: "/dashboard/channels",
            icon: Radio,
        },
        {
            title: "Tópicos",
            href: "/dashboard/topics",
            icon: ListTodo,
        },
        {
            title: "Produção",
            href: "/dashboard/production",
            icon: PlayCircle,
        },
        {
            title: "Revisão",
            href: "/dashboard/review",
            icon: CheckCircle,
        },
        {
            title: "Histórico",
            href: "/dashboard/history",
            icon: History,
        },
        {
            title: "Configurações",
            href: "/dashboard/settings",
            icon: Settings,
        },
    ]

    return (
        <nav className="grid gap-2 items-start text-sm font-medium">
            {items.map((item, index) => {
                const Icon = item.icon
                return (
                    <Link key={index} href={item.href}>
                        <span
                            className={cn(
                                "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                                pathname === item.href ? "bg-accent text-accent-foreground" : "transparent"
                            )}
                        >
                            <Icon className="mr-2 h-4 w-4" />
                            <span>{item.title}</span>
                        </span>
                    </Link>
                )
            })}
        </nav>
    )
}
