'use client'

import { useAuth } from "@clerk/nextjs"
import { createContext, ReactNode, useContext, useEffect, useState } from "react"

interface PlanLimits {
    meetings: number
    chatMessages: number
}

interface UsageData {
    currentPlan: string
    subscriptionStatus: string
    meetingsThisMonth: number
    chatMessagesToday: number
    billingPeriodStart: string | null
}

interface UsageContextType {
    usage: UsageData | null
    loading: boolean
    canChat: boolean
    canScheduleMeeting: boolean
    limits: PlanLimits
    incrementChatUsage: () => Promise<void>
    incrementMeetingUsage: () => Promise<void>
    refreshUsage: () => Promise<void>
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
    free: { meetings: 0, chatMessages: 0 },
    starter: { meetings: 10, chatMessages: 30 },
    pro: { meetings: 30, chatMessages: 100 },
    premium: { meetings: -1, chatMessages: -1 }
}

const UsageContext = createContext<UsageContextType | undefined>(undefined)

export function UsageProvider({ children }: { children: ReactNode }) {
    const {userId, isLoaded} = useAuth();
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [loading, setLoading] = useState(true);
    
    const limits = usage ? PLAN_LIMITS[usage.currentPlan] ||  PLAN_LIMITS.free : PLAN_LIMITS.free;

    // user can chat if on paid plan, subscription active, and has messages left
    let canChat = false;
    if (usage) {
        const isPaidPlan = usage.currentPlan !== 'free';
        const isActive = usage.subscriptionStatus === 'active';
        const hasMessagesLeft = limits.chatMessages === -1 || usage.chatMessagesToday < limits.chatMessages;
        if (isPaidPlan && isActive && hasMessagesLeft) {
            canChat = true;
        }
    }

    // user can schedule meeting if on paid plan, subscription active, and has meetings left
    let canScheduleMeeting = false;
    if (usage) {
        const isPaidPlan = usage.currentPlan !== 'free';
        const isActive = usage.subscriptionStatus === 'active';
        const hasMeetingsLeft =
            limits.meetings === -1 || usage.meetingsThisMonth < limits.meetings;

        if (isPaidPlan && isActive && hasMeetingsLeft) {
            canScheduleMeeting = true;
        }
    }
    // fetch usage data from API
    const fetchUsage = async() =>{
        if(!userId) return;

        try {
            const response  = await fetch('/api/user/usage');
            if(response.ok){
                const data = await response.json();
                setUsage(data);
            }
        } catch (error) {
            console.error("Failed to fetch usage data:", error);    
        }finally{
            setLoading(false);
        }
    }
    // increment chat usage
    const incrementChatUsage = async() => {
        if(!canChat) return;

        try {
            const response = await fetch('/api/user/increment-chat', {
                method: 'POST',
                headers: { 'Content-type': 'application/json' }
            });
            if(response.ok){
                setUsage(prev => prev ? {
                    ...prev,
                    chatMessagesToday: prev.chatMessagesToday + 1
                }: null)
            }else{
                const data = await response.json();
                if (data.upgradeRequired) {
                    console.log(data.error);
                }
            }
        } catch (error) {
            console.error("Failed to increment chat usage:", error);
        }
    }
    // increment meeting usage
    const incrementMeetingUsage = async () => {
        if (!canScheduleMeeting) {
            return
        }

        try {
            const response = await fetch('/api/user/increment-meeting', {
                method: 'POST',
                headers: { 'Content-type': 'application/json' }
            })

            if (response.ok) {
                setUsage(prev => prev ? {
                    ...prev,
                    meetingsThisMonth: prev.meetingsThisMonth + 1
                } : null)
            }
        } catch (error) {
            console.error('failed to increment meetign usage:', error)
        }
    }
    // refresh usage data
    const refreshUsage = async () => {
        await fetchUsage();
    }

    useEffect(() => {
        if (isLoaded && userId) {
            fetchUsage()
        } else if (isLoaded && !userId) {
            setLoading(false)
        }
    }, [userId, isLoaded]);


     return (
        <UsageContext.Provider value={{
            usage,
            loading,
            canChat,
            canScheduleMeeting,
            limits,
            incrementChatUsage,
            incrementMeetingUsage,
            refreshUsage
        }}>
            {children}
        </UsageContext.Provider>
    );
}

export function useUsage() {
    const context = useContext(UsageContext)
    if (context === undefined) {
        throw new Error('useUsage must be defined')
    }

    return context
}