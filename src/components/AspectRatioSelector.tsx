"use client"

import { AspectRatioOption } from "@/types"

const ASPECT_RATIOS: AspectRatioOption[] = [
    { id: '1:1', label: 'Square', ratio: '1:1', iconClass: 'aspect-square' },
    { id: '16:9', label: 'Widescreen', ratio: '16:9', iconClass: 'aspect-video' },
    { id: '9:16', label: 'Social story', ratio: '9:16', iconClass: 'aspect-[9/16]' },
    { id: '3:4', label: 'Traditional', ratio: '3:4', iconClass: 'aspect-[3/4]' },
    { id: '4:3', label: 'Classic', ratio: '4:3', iconClass: 'aspect-[4/3]' },
]

interface AspectRatioSelectorProps {
    selectedRatioId: string
    onSelectRatio: (ratioId: string) => void
}

export default function AspectRatioSelector({ selectedRatioId, onSelectRatio }: AspectRatioSelectorProps) {
    return (
        <div className="w-full mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">2. Formato da Imagem</h2>
            <p className="text-zinc-400 text-sm mb-4">
                Escolha o tamanho ideal para sua necessidade (Instagram, LinkedIn, etc).
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {ASPECT_RATIOS.map((option) => {
                    const isSelected = selectedRatioId === option.id

                    return (
                        <button
                            key={option.id}
                            onClick={() => onSelectRatio(option.id)}
                            className={`
                flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                ${isSelected
                                    ? 'bg-zinc-800 border-yellow-500 text-white shadow-[0_0_10px_rgba(234,179,8,0.1)]'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700'
                                }
              `}
                        >
                            <div className={`
                w-6 border-2 rounded-sm shrink-0 transition-colors
                ${option.iconClass}
                ${isSelected ? 'border-yellow-500 bg-yellow-500/10' : 'border-zinc-500'}
              `} />

                            <div className="flex flex-col">
                                <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                                    {option.ratio}
                                </span>
                                <span className="text-[10px] uppercase tracking-wide opacity-70">
                                    {option.label}
                                </span>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
