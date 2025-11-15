import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";

// Re-use a single PrismaClient in development to avoid too many connections
const prisma = new PrismaClient();

type ClerkEmailAddress = { id: string; email_address: string };

export async function POST(request: NextRequest) {
    try {
        const payload = await request.text();
        const headers = {
            "svix-id": request.headers.get("svix-id") || "",
            "svix-timestamp": request.headers.get("svix-timestamp") || "",
            "svix-signature": request.headers.get("svix-signature") || "",
        };

        const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error("CLERK_WEBHOOK_SECRET is not defined");
            return NextResponse.json(
                { error: "Webhook secret not configured" },
                { status: 500 }
            );
        }

        const wh = new Webhook(webhookSecret);
        let event: WebhookEvent;
        try {
            event = wh.verify(payload, headers) as WebhookEvent;
        } catch (err) {
            console.error("Webhook verification failed:", err);
            return NextResponse.json({ error: "Invalid Signature" }, { status: 400 });
        }

        console.log("clerk webhook received", event.type);

        if (event.type === "user.created") {
            const data = event.data;
            const { id, email_addresses, first_name, last_name, primary_email_address_id } = data;
            console.log("Processing user.created event:", { id, first_name, last_name });

            const emailList = (email_addresses ?? []) as ClerkEmailAddress[];
            const primaryEmail = emailList.find(
                (e) => e.id === primary_email_address_id
            )?.email_address;

            if (!primaryEmail) {
                console.warn("No primary email found for user:", id);
            }

            try {
                const newUser = await prisma.user.create({
                    data: {
                        id,
                        clerkId: id,
                        email: primaryEmail || null,
                        name:
                            first_name || last_name
                                ? `${first_name ?? ""} ${last_name ?? ""}`.trim()
                                : null,
                    },
                });
                console.log("✅ User created in database:", newUser.id, newUser.email);
                return NextResponse.json(
                    { message: "user created successfully", userId: newUser.id },
                    { status: 201 }
                );
            } catch (dbError: unknown) {
                if (isPrismaKnownError(dbError) && dbError.code === "P2002") {
                    console.log("User already exists in database");
                    return NextResponse.json(
                        { message: "User already exists" },
                        { status: 200 }
                    );
                }
                const details = dbError instanceof Error ? dbError.message : "Unknown";
                console.error("❌ Database error creating user:", details);
                return NextResponse.json(
                    { error: "Failed to create user in database", details },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({ message: "webhook received", type: event.type });
    } catch (error: unknown) {
        const details = error instanceof Error ? error.message : "Unknown";
        console.error("❌ Webhook error:", details);
        return NextResponse.json(
            { error: "Webhook processing failed", details },
            { status: 500 }
        );
    }
}

// Type guard for Prisma known request errors without importing entire @prisma/client/runtime
function isPrismaKnownError(err: unknown): err is { code: string } {
    return (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        typeof (err as Record<string, unknown>).code === "string"
    );
}