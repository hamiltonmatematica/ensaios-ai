import { DashboardNav } from "@/components/automator/dashboard-nav"
import { UserNav } from "@/components/automator/user-nav"
import { Separator } from "@/components/automator/ui/separator"
import { Toaster } from "sonner"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen flex-col space-y-6">
            <header className="sticky top-0 z-40 border-b bg-background">
                <div className="container flex h-16 items-center justify-between py-4">
                    <div className="flex gap-2 font-bold text-2xl tracking-tighter">
                        Automator
                    </div>
                    <UserNav />
                </div>
            </header>
            <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr]">
                <aside className="hidden w-[200px] flex-col md:flex">
                    <DashboardNav />
                </aside>
                <main className="flex w-full flex-1 flex-col overflow-hidden">
                    {children}
                </main>
            </div>
            <Toaster />
        </div>
    )
}
