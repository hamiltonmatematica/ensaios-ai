"use client"

import Link from "next/link"
import { LucideIcon } from "lucide-react"

interface DashboardCardProps {
    title: string
    description: string
    href: string
    icon: LucideIcon
    iconBgColor: string
    iconColor: string
}

export default function DashboardCard({
    title,
    description,
    href,
    icon: Icon,
    iconBgColor,
    iconColor
}: DashboardCardProps) {
    return (
        <Link
            href={href}
            className="group block bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20"
        >
            {/* Icon */}
            <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${iconBgColor}`}
            >
                <Icon className={`w-7 h-7 ${iconColor}`} />
            </div>

            {/* Content */}
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">
                {title}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
                {description}
            </p>

            {/* Arrow indicator */}
            <div className="mt-4 flex items-center text-zinc-500 group-hover:text-yellow-400 transition-colors">
                <span className="text-sm font-medium">Acessar</span>
                <svg
                    className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </Link>
    )
}
