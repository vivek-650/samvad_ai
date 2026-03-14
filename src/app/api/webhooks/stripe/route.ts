import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-11-17.clover'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
    try {
        const body = await request.text()
        const headersList = await headers()
        const sig = headersList.get('stripe-signature')!

        let event: Stripe.Event

        try {
            event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
        } catch (error) {
            console.error('webhok signature failed:', error)
            return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
        }

        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object)
                break
            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object)
                break
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object)
                break
            case 'customer.subscription.deleted':
                await handleSubscriptionCancelled(event.data.object)
                break
            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object)
                break

            default:
                console.log(`unhandle type event: ${event.type}`)
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error('error handling subscription create:', error)
        return NextResponse.json({ error: 'webhook failed' }, { status: 500 })
    }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    try {
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string
        const planName = session.metadata?.planName || 'starter'

        const user = await prisma.user.findFirst({
            where: {
                stripeCustomerId: customerId
            }
        })

        if (user) {
            console.log('Updating user subscription from checkout:', {
                userId: user.id,
                planName,
                subscriptionId
            })

            await prisma.user.update({
                where: {
                    id: user.id
                },
                data: {
                    currentPlan: planName,
                    subscriptionStatus: 'active',
                    stripeSubscriptionId: subscriptionId,
                    billingPeriodStart: new Date(),
                    meetingsThisMonth: 0,
                    chatMessagesToday: 0
                }
            })
        } else {
            console.error('User not found for customer:', customerId)
        }
    } catch (error) {
        console.error('error handling checkout completed:', error)
    }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
    try {
        const customerId = subscription.customer as string
        const planName = getPlanFromSubscription(subscription)

        const user = await prisma.user.findFirst({
            where: {
                stripeCustomerId: customerId
            }
        })

        if (user) {
            await prisma.user.update({
                where: {
                    id: user.id
                },
                data: {
                    currentPlan: planName,
                    subscriptionStatus: 'active',
                    stripeSubscriptionId: subscription.id,
                    billingPeriodStart: new Date(),
                    meetingsThisMonth: 0,
                    chatMessagesToday: 0
                }
            })
        }
    } catch (error) {
        console.error('error handling subscription create:', error)
    }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    try {
        const user = await prisma.user.findFirst({
            where: {
                stripeSubscriptionId: subscription.id
            }
        })

        if (user) {
            const planName = getPlanFromSubscription(subscription)

            await prisma.user.update({
                where: {
                    id: user.id
                },
                data: {
                    currentPlan: planName,
                    subscriptionStatus: subscription.status === 'active' ? 'active' : 'cancelled'
                }
            })
        }
    } catch (error) {
        console.error('error handling subscription updated:', error)
    }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
    try {
        const user = await prisma.user.findFirst({
            where: {
                stripeSubscriptionId: subscription.id
            }
        })
        if (user) {
            await prisma.user.update({
                where: {
                    id: user.id
                },
                data: {
                    subscriptionStatus: 'cancelled'
                }
            })
        }
    } catch (error) {
        console.error('error handling subscription cancelleation:', error)
    }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
    try {
        const subscriptionId = (invoice as any).subscription as string | null

        if (subscriptionId) {
            const user = await prisma.user.findFirst({
                where: {
                    stripeSubscriptionId: subscriptionId
                }
            })

            if (user) {
                await prisma.user.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        subscriptionStatus: 'active',
                        billingPeriodStart: new Date(),
                        meetingsThisMonth: 0
                    }
                })
            }
        }
    } catch (error) {
        console.error('error handling payment suucession:', error)
    }
}




function getPlanFromSubscription(subscription: Stripe.Subscription) {
    // First check if plan name is in metadata
    const metadataPlan = subscription.metadata?.planName
    if (metadataPlan && ['starter', 'pro', 'premium'].includes(metadataPlan.toLowerCase())) {
        return metadataPlan.toLowerCase()
    }

    // Fallback to price ID mapping
    const priceId = subscription.items.data[0]?.price.id
    console.log('Received price ID:', priceId)

    const priceToPlank: Record<string, string> = {
        'price_1SlUGMLJ8JG2h1erCHNAc4wC': 'starter',
        'price_1SlUHJLJ8JG2h1erHR0c63Ma': 'pro',
        'price_1SlUI7LJ8JG2h1ermVJR3vBe': 'premium'
    }

    const plan = priceToPlank[priceId] || 'invalid'
    
    if (plan === 'invalid') {
        console.error('Unknown price ID:', priceId, '- Please add this to the priceToPlank mapping')
    }

    return plan
}