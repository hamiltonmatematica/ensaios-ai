"use client"

import { useRef } from "react"
import { Upload, X } from "lucide-react"

interface UploadSectionProps {
    files: File[]
    onFilesChange: (files: File[]) => void
}

export default function UploadSection({ files, onFilesChange }: UploadSectionProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files)
            // Limita a 3 arquivos no total
            const combinedFiles = [...files, ...newFiles].slice(0, 3)
            onFilesChange(combinedFiles)
        }
    }

    const removeFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index)
        onFilesChange(newFiles)
    }

    return (
        <div className="w-full mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">1. Suas Fotos</h2>
            <p className="text-zinc-400 text-sm mb-4">
                Envie 3 fotos do seu rosto. Boa iluminação e sem óculos escuros funcionam melhor.
                Essas fotos serão usadas como referência para o seus ensaios de IA.
            </p>

            <div className="grid grid-cols-3 gap-4 sm:gap-6">
                {[0, 1, 2].map((index) => (
                    <div key={index} className="relative aspect-[3/4] group">
                        {files[index] ? (
                            <>
                                <img
                                    src={URL.createObjectURL(files[index])}
                                    alt={`Upload ${index + 1}`}
                                    className="w-full h-full object-cover rounded-xl border border-zinc-700"
                                />
                                <button
                                    onClick={() => removeFile(index)}
                                    className="absolute top-2 right-2 bg-black/50 hover:bg-red-500/80 p-1.5 rounded-full backdrop-blur transition-colors"
                                >
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-xl hover:border-yellow-500/50 hover:bg-zinc-800/50 transition-all group-hover:scale-[1.02]"
                            >
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-2 group-hover:bg-yellow-500/20 group-hover:text-yellow-500 transition-colors">
                                    <Upload className="w-5 h-5" />
                                </div>
                                <span className="text-xs text-zinc-500 font-medium">Adicionar Foto</span>
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                multiple
                className="hidden"
            />
        </div>
    )
}
