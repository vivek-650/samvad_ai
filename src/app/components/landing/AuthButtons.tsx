'use client'
import { Button } from '@/components/ui/button'
import { SignInButton, SignUpButton } from '@clerk/nextjs'
import { CircleArrowRight } from 'lucide-react'

export function AuthButtons() {
  return (
    <>
      <SignInButton mode="modal">
        <Button variant="ghost" className="cursor-pointer">
          Sign In
        </Button>
      </SignInButton>
      <SignUpButton mode="modal">
        <Button className="cursor-pointer">
          Get Started
          <CircleArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </SignUpButton>
    </>
  )
}
