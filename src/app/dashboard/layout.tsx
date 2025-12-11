"use client";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/app/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CircleQuestionMark } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const segment = (pathname?.split("/")?.[2] || "").toLowerCase();
  const titleMap: Record<string, string> = {
    home: "Home",
    integrations: "Integrations",
    settings: "Settings",
    chat: "Chat with AI",
    pricing: "Pricing",
  };
  const pageTitle = titleMap[segment] ?? "Dashboard";
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-svh w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-auto">
          <div className="rounded-xl bg-card  shadow-sm">
            <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 bg-card px-4 rounded-t-xl border-b">
              <SidebarTrigger className="-ml-1" />
              {/* <Separator orientation="vertical" className="h-4" /> */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {pageTitle}
                </span>
                <Tooltip>
                  <TooltipTrigger>
                    <CircleQuestionMark className="inline-block mr-5 h-4 w-4 text-muted-foreground cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <h2 className="text-lg font-semibold text-muted-foreground mb-2">
                      How it wokrs{" "}
                    </h2>

                    <ol className="text-sm text-muted-foreground space-y-2">
                      <li>1. Connect your preffered tools above</li>
                      <li>2. Choose where to send action items during setup</li>
                      <li>
                        3. In meetings, hover over action items and click "Add
                        to"
                      </li>
                      <li>
                        4. Select which tool(s) to add the task to from the
                        dropdown
                      </li>
                    </ol>
                  </TooltipContent>
                </Tooltip>
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
  );
}
