/**
 * Função auxiliar para converter File para base64 (client-side)
 */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = (error) => reject(error)
    })
}

export function compressImage(file: File, maxWidth: number = 1024, quality: number = 0.85): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                let width = img.width
                let height = img.height

                if (width > maxWidth) {
                    height = (height * maxWidth) / width
                    width = maxWidth
                }

                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('Canvas context error'))
                    return
                }

                ctx.drawImage(img, 0, 0, width, height)
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality)
                resolve(compressedBase64)
            }
            img.onerror = reject
            img.src = e.target?.result as string
        }
        reader.onerror = reject
    })
}
