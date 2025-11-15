'use client'

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/app/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const segment = (pathname?.split('/')?.[2] || '').toLowerCase()
  const titleMap: Record<string, string> = {
    home: 'Home',
    integrations: 'Integrations',
    settings: 'Settings',
    chat: 'Chat with AI',
    pricing: 'Pricing',
  }
  const pageTitle = titleMap[segment] ?? 'Dashboard'
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-svh w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-auto">
          <div className="rounded-xl bg-card border shadow-sm">
            <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 bg-card px-4 rounded-t-xl border-b">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{pageTitle}</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
              </div>
            </header>
            <div className="flex-1 p-3 md:p-4 lg:p-6 rounded-b-xl bg-card">
              {children}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
