'use client'
import { useUser } from '@clerk/nextjs'
import { Header } from './Header'
import { HeroContent } from './HeroContent'
import { DottedGlowBackground } from '@/components/ui/dotted-glow-background'

const HeroSection = () => {
  const { isSignedIn, user } = useUser()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      {/* First fold with dotted background - full viewport height */}
      <DottedGlowBackground 
        className="min-h-[calc(100vh)] flex items-center justify-center"
        opacity={0.1} 
        gap={25}
        radius={1.1}
      >
        <div className="container mx-auto px-4">
          <HeroContent isSignedIn={!!isSignedIn} user={user} />
        </div>
      </DottedGlowBackground>
    </div>
  )
}

export default HeroSection