export interface PhotoModel {
    id: string
    name: string
    description: string
    category: string
    thumbnailUrl: string
    promptTemplate: string
    isPremium: boolean
    creditsRequired: number
    isActive: boolean
    displayOrder: number
}

export interface AspectRatioOption {
    id: string
    label: string
    ratio: string
    iconClass: string
}

export interface GeneratedImage {
    id: string
    url: string
    modelId: string
    modelName: string
    aspectRatio: string
    createdAt: Date
}

export interface CreditPackage {
    id: string
    name: string
    images: number
    price: number
    priceDisplay: string
    savings: string
    isBestValue?: boolean
}

export interface User {
    id: string
    name: string | null
    email: string | null
    image: string | null
    credits: number
    role: "USER" | "ADMIN"
}
