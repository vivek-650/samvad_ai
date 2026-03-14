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
        radius={1.02}
      >
        <div className="container mx-auto px-4">
          <HeroContent isSignedIn={!!isSignedIn} user={user} />
        </div>
      </DottedGlowBackground>
        {/* Features section with compact spacing and light/dark compatible colors */}
        <section className="container mx-auto px-4 py-16">
          {/* CTA */}
          <div className="mb-12">
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md shadow-sm hover:bg-primary/90 transition-colors"
            >
              Get Started
              <span className="inline-block">→</span>
            </a>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
            {/* 95% Accurate */}
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground">⏱️</div>
              <div>
                <h3 className="font-semibold">95% Accurate</h3>
                <p className="text-muted-foreground">Fireflies is the industry leader in transcription accuracy.</p>
              </div>
            </div>

            {/* 100+ Languages */}
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground">🌐</div>
              <div>
                <h3 className="font-semibold">100+ Languages</h3>
                <p className="text-muted-foreground">Transcribe meetings in English, Spanish, French, & several others.</p>
              </div>
            </div>

            {/* Speaker Recognition */}
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground">👥</div>
              <div>
                <h3 className="font-semibold">Speaker Recognition</h3>
                <p className="text-muted-foreground">Fireflies identifies different speakers in meetings and audio files.</p>
              </div>
            </div>

            {/* Auto-Language Detection */}
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground">⚡</div>
              <div>
                <h3 className="font-semibold">Auto-Language Detection</h3>
                <p className="text-muted-foreground">Automatically switch languages from meeting to meeting with ease.</p>
              </div>
            </div>
          </div>
        </section>
    </div>
  )
}

export default HeroSection