'use client'

export default function PricingPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 bg-background">
        <h1 className="text-3xl font-bold text-foreground">Pricing</h1>
        <p className="text-muted-foreground mt-1">Choose the perfect plan for your needs</p>
      </div>

      <div className="flex-1 px-8 py-6 bg-muted/30 overflow-auto">
        <p className="text-sm text-muted-foreground">Pricing plans coming soon...</p>
      </div>
    </div>
  )
}
