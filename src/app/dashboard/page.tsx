'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUsage } from "../context/UsageContext"
import { Calendar, MessageSquare, TrendingUp, Zap } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export default function DashboardPage() {
  const { usage, limits } = useUsage()

  const meetingProgress = usage && limits.meetings !== -1
    ? Math.min((usage.meetingsThisMonth / limits.meetings) * 100, 100)
    : 0

  const chatProgress = usage && limits.chatMessages !== -1
    ? Math.min((usage.chatMessagesToday / limits.chatMessages) * 100, 100)
    : 0

  const stats = [
    {
      title: "Meetings This Month",
      value: usage?.meetingsThisMonth || 0,
      limit: limits.meetings === -1 ? "∞" : limits.meetings,
      progress: meetingProgress,
      icon: Calendar,
      color: "text-accent-foreground",
      bgColor: "bg-accent/30"
    },
    {
      title: "Chat Messages Today",
      value: usage?.chatMessagesToday || 0,
      limit: limits.chatMessages === -1 ? "∞" : limits.chatMessages,
      progress: chatProgress,
      icon: MessageSquare,
      color: "text-accent-foreground",
      bgColor: "bg-accent/30"
    },
    {
      title: "Current Plan",
      value: usage?.currentPlan?.toUpperCase() || "FREE",
      icon: TrendingUp,
      color: "text-accent-foreground",
      bgColor: "bg-accent/30"
    },
    {
      title: "Status",
      value: usage?.subscriptionStatus?.toUpperCase() || "INACTIVE",
      icon: Zap,
      color: "text-accent-foreground",
      bgColor: "bg-accent/30"
    }
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 bg-background">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's your overview.</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-8 py-6 bg-muted/30 overflow-auto">
        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {typeof stat.value === 'number' && stat.limit
                      ? `${stat.value}/${stat.limit}`
                      : stat.value}
                  </div>
                  {stat.progress !== undefined && stat.limit !== "∞" && (
                    <Progress value={stat.progress} className="mt-3 h-2" />
                  )}
                  {stat.limit === "∞" && (
                    <p className="text-xs text-muted-foreground mt-2">Unlimited</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Additional Content Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest meetings and conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No recent activity yet. Start by scheduling a meeting or chatting with AI.</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Schedule meetings, connect integrations, or upgrade your plan.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
