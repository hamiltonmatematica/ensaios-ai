import toast from 'react-hot-toast'

// Toast personalizado para sucesso
export const successToast = (message: string) => {
    toast.success(message, {
        duration: 4000,
        position: 'top-right',
        style: {
            background: '#18181b',
            color: '#fff',
            border: '1px solid #22c55e',
        },
        iconTheme: {
            primary: '#22c55e',
            secondary: '#18181b',
        },
    })
}

// Toast personalizado para erro
export const errorToast = (message: string) => {
    toast.error(message, {
        duration: 5000,
        position: 'top-right',
        style: {
            background: '#18181b',
            color: '#fff',
            border: '1px solid #ef4444',
        },
        iconTheme: {
            primary: '#ef4444',
            secondary: '#18181b',
        },
    })
}

// Toast personalizado para loading
export const loadingToast = (message: string) => {
    return toast.loading(message, {
        position: 'top-right',
        style: {
            background: '#18181b',
            color: '#fff',
            border: '1px solid #eab308',
        },
    })
}

// Toast personalizado para info
export const infoToast = (message: string) => {
    toast(message, {
        duration: 4000,
        position: 'top-right',
        icon: 'ℹ️',
        style: {
            background: '#18181b',
            color: '#fff',
            border: '1px solid #3b82f6',
        },
    })
}

// Dismiss específico
export const dismissToast = (toastId: string) => {
    toast.dismiss(toastId)
}

// Dismiss all
export const dismissAllToasts = () => {
    toast.dismiss()
}
