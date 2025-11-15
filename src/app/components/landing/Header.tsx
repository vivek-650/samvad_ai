'use client'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { LayoutDashboard } from 'lucide-react'
import { UserMenu } from './UserMenu'
import { AuthButtons } from './AuthButtons'

export function Header() {
  const { isSignedIn, user } = useUser()

  return (
    <header className="fixed top-0 left-0 right-0 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo/Brand */}
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold bg-linear-to-r from-primary to-primary/50 bg-clip-text text-transparent">
            Samvad AI
          </h2>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          {isSignedIn ? (
            <>
              {/* Dashboard Button */}
              <Button asChild variant="outline" className="hidden sm:flex">
                <Link href="/home">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>

              {/* User Menu */}
              <UserMenu user={user} />
            </>
          ) : (
            <AuthButtons />
          )}
        </div>
      </div>
    </header>
  )
}
