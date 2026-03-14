"use client";
import { Button } from "@/components/ui/button";
import { LayoutTextFlip } from "@/components/ui/layout-text-flip";
import { SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { CircleArrowRight, LayoutDashboard, Play } from "lucide-react";
import type { UserResource } from "@clerk/shared/types";
import { motion } from "motion/react";

interface HeroContentProps {
  isSignedIn: boolean;
  user: UserResource | null | undefined;
}

export function HeroContent({ isSignedIn, user }: HeroContentProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 text-center py-12">
      <motion.div className="relative flex flex-col items-center justify-center gap-4 text-center sm:flex-row">
        {isSignedIn ? (
          <LayoutTextFlip
            text="Welcome back, "
            words={[
              user?.firstName || user?.username || "User",
              "Let's continue",
              "Ready to work",
              "Your AI awaits",
            ]}
          />
        ) : (
          <LayoutTextFlip
            text="Welcome to "
            words={[
              "Samvad AI.",
              "Smart Meetings.",
              "AI Summaries.",
              "Quick Facts.",
            ]}
          />
        )}
      </motion.div>

        <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
          {isSignedIn
            ? "Ready to continue your AI-driven conversations? Access your dashboard to get started."
            : "Automatic summaries, action items, and intelligent insights for every meeting. Never miss important details again."}
        </p>

        <div className="flex gap-4">
          {isSignedIn ? (
            <>
              <Button asChild size="lg" className="px-8">
                <Link href="/dashboard/home">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="px-8 cursor-pointer">
                <Play className="mr-2 h-4 w-4" />
                Watch Demo
              </Button>
            </>
          ) : (
            <>
              <SignUpButton mode="modal">
                <Button size="lg" className="px-8 cursor-pointer">
                  Get Started
                  <CircleArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </SignUpButton>
              <Button size="lg" variant="outline" className="px-8">
                <Play className="mr-2 h-4 w-4" />
                Watch Demo
              </Button>
            </>
          )}
        </div>
      </div>
  );
}
