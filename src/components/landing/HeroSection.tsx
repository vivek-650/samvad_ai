'use client'
import React from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const HeroSection = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header with Theme Toggle */}
      <header className="fixed top-0 right-0 p-4 z-50">
        <ThemeToggle />
      </header>

      {/* Hero Content */}
      <div className="container mx-auto px-4 py-20">
        <div className="flex flex-col items-center justify-center space-y-8 text-center">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            Welcome to{' '}
            <span className="bg-linear-to-r from-primary to-primary/50 bg-clip-text text-transparent">
              Samvad AI
            </span>
          </h1>
          
          <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
            Experience the power of AI-driven conversations with our advanced platform. 
            Built with Next.js and shadcn/ui components.
          </p>

          <div className="flex gap-4">
            <Button size="lg" className="px-8">
              Get Started
            </Button>
            <Button size="lg" variant="outline" className="px-8">
              Learn More
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>🎨 Theme Support</CardTitle>
              <CardDescription>
                Light, dark, and system themes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Seamlessly switch between light and dark modes or let the system decide. 
                All components are theme-aware.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🚀 Fast Performance</CardTitle>
              <CardDescription>
                Built with Next.js 15
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Leveraging the latest Next.js features for optimal performance and 
                developer experience.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🎯 shadcn/ui Components</CardTitle>
              <CardDescription>
                Beautiful, accessible components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Using only shadcn/ui library for consistent, maintainable, and 
                beautiful UI components.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default HeroSection