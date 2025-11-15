import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const features = [
  {
    icon: '🎨',
    title: 'Theme Support',
    description: 'Light, dark, and system themes',
    content: 'Seamlessly switch between light and dark modes or let the system decide. All components are theme-aware.'
  },
  {
    icon: '🚀',
    title: 'Fast Performance',
    description: 'Built with Next.js 15',
    content: 'Leveraging the latest Next.js features for optimal performance and developer experience.'
  },
  {
    icon: '🎯',
    title: 'shadcn/ui Components',
    description: 'Beautiful, accessible components',
    content: 'Using only shadcn/ui library for consistent, maintainable, and beautiful UI components.'
  }
]

export function FeatureCards() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>{feature.icon} {feature.title}</CardTitle>
            <CardDescription>{feature.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {feature.content}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
