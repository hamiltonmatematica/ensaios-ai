"use client"

import { useRef } from "react"
import { Upload, X } from "lucide-react"

interface UploadSectionProps {
    files: File[]
    onFilesChange: (files: File[]) => void
}

// Função para comprimir imagem
async function compressImage(file: File, maxSizeKB: number = 500): Promise<File> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()

        img.onload = () => {
            // Calcula dimensões mantendo aspect ratio, máximo 1024px
            const maxDim = 1024
            let width = img.width
            let height = img.height

            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = (height / width) * maxDim
                    width = maxDim
                } else {
                    width = (width / height) * maxDim
                    height = maxDim
                }
            }

            canvas.width = width
            canvas.height = height
            ctx?.drawImage(img, 0, 0, width, height)

            // Tenta diferentes qualidades até ficar abaixo do limite
            let quality = 0.8
            const tryCompress = () => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        const sizeKB = blob.size / 1024
                        if (sizeKB > maxSizeKB && quality > 0.3) {
                            quality -= 0.1
                            tryCompress()
                        } else {
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            })
                            resolve(compressedFile)
                        }
                    } else {
                        resolve(file) // fallback
                    }
                }, 'image/jpeg', quality)
            }
            tryCompress()
        }

        img.onerror = () => resolve(file) // fallback
        img.src = URL.createObjectURL(file)
    })
}

export default function UploadSection({ files, onFilesChange }: UploadSectionProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files)

            // Comprime cada imagem
            const compressedFiles = await Promise.all(
                newFiles.map(file => compressImage(file))
            )

            // Limita a 3 arquivos no total
            const combinedFiles = [...files, ...compressedFiles].slice(0, 3)
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

