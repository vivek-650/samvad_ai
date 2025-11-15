import { Bot, DollarSign, Home, Layers3, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { useUsage } from "../context/UsageContext";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const items = [
    {
        title: "Home",
        url: "/dashboard/home",
        icon: Home,
    },
    {
        title: "Integrations",
        url: "/dashboard/integrations",
        icon: Layers3,
    },
    {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings,
    },
    {
        title: "Chat with AI",
        url: "/dashboard/chat",
        icon: Bot,
    },
    {
        title: "Pricing",
        url: "/dashboard/pricing",
        icon: DollarSign,
    },
]

export function AppSidebar() {
    const pathname = usePathname()
    const { usage, limits } = useUsage()

    const meetingProgress = usage && limits.meetings !== -1
        ? Math.min((usage.meetingsThisMonth / limits.meetings) * 100, 100)
        : 0

    const chatProgress = usage && limits.chatMessages !== -1
        ? Math.min((usage.chatMessagesToday / limits.chatMessages) * 100, 100)
        : 0


    const getUpgradeInfo = () => {
        if (!usage) return null

        switch (usage.currentPlan) {
            case 'free':
                return {
                    title: "Upgrade to Starter",
                    description: "Get 10 meetings per month and 30 daily chat messages",
                    showButton: true
                }
            case 'starter':
                return {
                    title: "Upgrade to Pro",
                    description: "Get 30 meetings per month and 100 daily chat messages",
                    showButton: true
                }

            case 'pro':
                return {
                    title: "Upgrade to Premium",
                    description: "Get unlimited meetings and chat messages",
                    showButton: true
                }
            case 'premium':
                return {
                    title: "You're on Premium broski!",
                    description: "Enjoying unlimited access to all features",
                    showButton: false
                }

            default:
                return {
                    title: "Upgrade Your Plan",
                    description: "Get access to more features",
                    showButton: true
                }
        }
    }

    const upgradeInfo = getUpgradeInfo()

    return (
        <Sidebar collapsible="icon" variant="inset" className="h-svh">
            <SidebarHeader className="p-4">
                <div className="flex items-center gap-2">
                    
                    <span className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                        Samvad AI
                    </span>
                </div>
            </SidebarHeader>

            <SidebarContent className="flex-1">
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu className="space-y-2">
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.url}
                                        tooltip={item.title}
                                        className="flex items-center justify-start rounded-lg text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground group-data-[collapsible=icon]:justify-center"
                                    >
                                        <Link href={item.url}>
                                            <item.icon className="w-4 h-4" />
                                            <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-4 mt-auto">
                {usage && (
                    <div className="rounded-xl bg-sidebar-accent/40 dark:bg-sidebar-accent/20 p-4 mb-3 backdrop-blur-sm group-data-[collapsible=icon]:hidden">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="h-2 w-2 rounded-full bg-green-500 dark:bg-green-400 animate-pulse" />
                            <p className="text-xs font-semibold text-sidebar-foreground">
                                {usage.currentPlan.toUpperCase()} PLAN
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-sidebar-foreground/80">
                                        Meetings
                                    </span>
                                    <span className="text-xs font-bold text-sidebar-foreground">
                                        {usage.meetingsThisMonth}/{limits.meetings === -1 ? '∞' : limits.meetings}
                                    </span>
                                </div>
                                {limits.meetings !== -1 && (
                                    <div className="w-full bg-sidebar-foreground/10 dark:bg-sidebar-foreground/20 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-foreground h-full rounded-full transition-all duration-500 ease-out"
                                            style={{ width: `${meetingProgress}%` }}
                                        />
                                    </div>
                                )}
                                {limits.meetings === -1 && (
                                    <div className="text-xs text-sidebar-foreground/60 italic">Unlimited access</div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-sidebar-foreground/80">
                                        Messages
                                    </span>
                                    <span className="text-xs font-bold text-sidebar-foreground">
                                        {usage.chatMessagesToday}/{limits.chatMessages === -1 ? '∞' : limits.chatMessages}
                                    </span>
                                </div>
                                {limits.chatMessages !== -1 && (
                                    <div className="w-full bg-sidebar-foreground/10 dark:bg-sidebar-foreground/20 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-foreground h-full rounded-full transition-all duration-500 ease-out"
                                            style={{ width: `${chatProgress}%` }}
                                        />
                                    </div>
                                )}
                                {limits.chatMessages === -1 && (
                                    <div className="text-xs text-sidebar-foreground/60 italic">Unlimited access</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {upgradeInfo && (
                    <div className="rounded-xl bg-linear-to-br from-sidebar-primary/10 to-sidebar-accent/20 dark:from-sidebar-primary/20 dark:to-sidebar-accent/10 p-4 backdrop-blur-sm group-data-[collapsible=icon]:hidden">
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-sidebar-foreground">
                                    {upgradeInfo.title}
                                </p>
                                <p className="text-xs text-sidebar-foreground/70">
                                    {upgradeInfo.description}
                                </p>
                            </div>
                            {upgradeInfo.showButton && (
                                <Link href="/dashboard/pricing">
                                    <Button className="w-full rounded-lg bg-sidebar-primary px-3 py-2 text-xs font-semibold text-sidebar-primary-foreground transition-all hover:bg-sidebar-primary/90 hover:scale-[1.02] cursor-pointer shadow-sm">
                                        {upgradeInfo.title}
                                    </Button>
                                </Link>
                            )}

                            {!upgradeInfo.showButton && (
                                <div className="text-center py-2">
                                    <span className="text-xs text-sidebar-accent-foreground/60">🎉 Thank you for your support!</span>
                                </div>
                            )}

                        </div>
                    </div>
                )}

                {upgradeInfo?.showButton && (
                    <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center">
                        <Link href="/dashboard/pricing" title="Upgrade plan">
                            <Button size="icon-sm" variant="outline" className="cursor-pointer">
                                <DollarSign className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                )}

            </SidebarFooter>

        </Sidebar>
    )
}