'use client'

import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { isSignedIn } = useAuth()

    // Don't show sidebar on landing page or dashboard routes (they have their own layout)
    const showSidebar = pathname !== "/" && !pathname.startsWith("/dashboard") && !(pathname.startsWith("/meeting/") && !isSignedIn)

    if (!showSidebar) {
        return <div className="min-h-screen">{children}</div>
    }

    return (
        <SidebarProvider defaultOpen={true}>
            <div className="flex h-screen w-full">
                <AppSidebar />
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </SidebarProvider>
    )
}