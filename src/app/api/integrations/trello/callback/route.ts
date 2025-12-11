import {auth} from "@clerk/nextjs/server";
import {NextResponse, NextRequest} from "next/server";

export async function GET(req: NextRequest) {
    const {userId} = await auth();

    if(!userId) {
        return NextResponse.redirect(new URL('/dashboard/integrations?error=auth_failed', process.env.NEXT_PUBLIC_APP_URL));
    }

    return NextResponse.redirect(new URL('/dashboard/integrations/trello/callback', process.env.NEXT_PUBLIC_APP_URL));
}

