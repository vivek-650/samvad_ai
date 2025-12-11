import {prisma} from "@/lib/db";
import {auth} from "@clerk/nextjs/server";
import {NextResponse, NextRequest} from "next/server";

export async function POST(req: NextRequest) {
    const {userId} = await auth();
    const { token } = await req.json();

    if(!userId || !token) {
        return NextResponse.json({ error: 'Missing userId or token' }, { status: 400 });
    }

    try {
        await prisma.userIntegration.upsert({
            where: {
                userId_platform: {
                    userId,
                    platform: 'trello'
                }
            },
            update: {
                accessToken: token,
                updatedAt: new Date()
            },
            create: {
                userId,
                platform: 'trello',
                accessToken: token
            }
        })
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving Trello integration:', error);
        return NextResponse.json({ error: 'Failed to save Trello integration' }, { status: 500 });
    }
}
