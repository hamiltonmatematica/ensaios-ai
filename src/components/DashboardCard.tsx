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
    credits?: number
    isNew?: boolean
    comingSoon?: boolean
}

export default function DashboardCard({
    title,
    description,
    href,
    icon: Icon,
    iconBgColor,
    iconColor,
    credits,
    isNew,
    comingSoon
}: DashboardCardProps) {
    const cardClasses = `group block bg-zinc-900 border border-zinc-800 rounded-2xl p-5 transition-all duration-300 relative overflow-hidden ${comingSoon
            ? "opacity-60 cursor-not-allowed"
            : "hover:bg-zinc-800/80 hover:border-zinc-700 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20"
        }`

    const cardContent = (
        <>
            {/* Badges */}
            <div className="absolute top-3 right-3 flex gap-2">
                {isNew && (
                    <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        NOVO
                    </span>
                )}
                {comingSoon && (
                    <span className="bg-zinc-600 text-zinc-300 text-xs font-bold px-2 py-0.5 rounded-full">
                        EM BREVE
                    </span>
                )}
            </div>

            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${iconBgColor}`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>

            {/* Content */}
            <h3 className={`text-base font-bold text-white mb-1 ${!comingSoon ? "group-hover:text-yellow-400" : ""} transition-colors`}>
                {title}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                {description}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between">
                {credits && (
                    <span className="text-xs text-yellow-400 font-semibold">
                        {credits} créditos
                    </span>
                )}
                {!comingSoon && (
                    <div className="flex items-center text-zinc-500 group-hover:text-yellow-400 transition-colors ml-auto">
                        <span className="text-xs font-medium">Acessar</span>
                        <svg
                            className="w-3 h-3 ml-1 transform group-hover:translate-x-1 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                )}
            </div>
        </>
    )

    if (comingSoon) {
        return <div className={cardClasses}>{cardContent}</div>
    }

    return (
        <Link href={href} className={cardClasses}>
            {cardContent}
        </Link>
    )
}
