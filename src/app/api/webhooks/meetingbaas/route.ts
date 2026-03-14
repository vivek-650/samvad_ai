import { processMeetingTranscript } from "@/lib/ai-processor";
import { prisma } from "@/lib/db";
import { sendMeetingSummaryEmail } from "@/lib/email-service-free";
import { processTranscript } from "@/lib/rag";
import { incrementMeetingUsage } from "@/lib/usage";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const webhook = await request.json()

        if (webhook.event === 'complete') {
            const webhookData = webhook.data

            const meeting = await prisma.meeting.findFirst({
                where: {
                    botId: webhookData.bot_id
                },
                include: {
                    user: true
                }
            })

            if (!meeting) {
                console.error('meeting not found for bot id:', webhookData.bot_id)
                return NextResponse.json({ error: 'meeting not found' }, { status: 404 })
            }

            await incrementMeetingUsage(meeting.userId)

            if (!meeting.user.email) {
                console.error('user email not found for this meeting', meeting.id)
                return NextResponse.json({ error: 'user email not found' }, { status: 400 })
            }

            await prisma.meeting.update({
                where: {
                    id: meeting.id
                },
                data: {
                    meetingEnded: true,
                    transcriptReady: true,
                    transcript: webhookData.transcript || null,
                    recordingUrl: webhookData.mp4 || null,
                    speakers: webhookData.speakers || null
                }
            })

            if (webhookData.transcript && !meeting.processed) {
                try {
                    const processed = await processMeetingTranscript(webhookData.transcript)

                    let transcriptText = ''

                    if (Array.isArray(webhookData.transcript)) {
                        transcriptText = webhookData.transcript
                            .map((item: unknown) => {
                                const record = typeof item === 'object' && item !== null
                                    ? (item as { speaker?: unknown; words?: unknown; text?: unknown })
                                    : {}
                                const speaker = typeof record.speaker === 'string' ? record.speaker : 'Speaker'
                                const words = Array.isArray(record.words)
                                    ? record.words
                                        .map((w: unknown) => {
                                            if (typeof w === 'object' && w !== null) {
                                                const word = (w as { word?: unknown }).word
                                                return typeof word === 'string' ? word : ''
                                            }
                                            return ''
                                        })
                                        .filter(Boolean)
                                        .join(' ')
                                    : ''
                                const text = typeof record.text === 'string' ? record.text : words
                                return `${speaker}: ${text}`
                            })
                            .join('\n')
                    } else if (typeof webhookData.transcript === 'string') {
                        transcriptText = webhookData.transcript
                    } else if (webhookData.transcript?.text) {
                        transcriptText = webhookData.transcript.text
                    } else {
                        transcriptText = ''
                    }

                    // Save summary first so transcript analysis is preserved even if
                    // vector indexing fails later.
                    await prisma.meeting.update({
                        where: {
                            id: meeting.id
                        },
                        data: {
                            summary: processed.summary,
                            actionItems: processed.actionItems,
                            processed: true,
                            processedAt: new Date()
                        }
                    })

                    try {
                        await sendMeetingSummaryEmail({
                            userEmail: meeting.user.email,
                            userName: meeting.user.name || 'User',
                            meetingTitle: meeting.title,
                            summary: processed.summary,
                            actionItems: processed.actionItems,
                            meetingId: meeting.id,
                            meetingDate: meeting.startTime.toLocaleDateString()
                        })

                        await prisma.meeting.update({
                            where: {
                                id: meeting.id
                            },
                            data: {
                                emailSent: true,
                                emailSentAt: new Date()
                            }
                        })
                    } catch (emailError) {
                        console.error('failed to send the email:', emailError)
                    }

                    if (transcriptText.trim()) {
                        try {
                            await processTranscript(meeting.id, meeting.userId, transcriptText, meeting.title)

                            await prisma.meeting.update({
                                where: {
                                    id: meeting.id
                                },
                                data: {
                                    ragProcessed: true,
                                    ragProcessedAt: new Date()
                                }
                            })
                        } catch (ragError) {
                            console.error('failed to index transcript for RAG:', ragError)
                        }
                    }


                } catch (processingError) {
                    console.error('failed to process the transcript:', processingError)

                    await prisma.meeting.update({
                        where: {
                            id: meeting.id
                        },
                        data: {
                            processed: true,
                            processedAt: new Date(),
                            summary: 'processing failed. please check the transcript manually.',
                            actionItems: []
                        }
                    })
                }
            }

            return NextResponse.json({
                success: true,
                message: 'meeting processed succesfully',
                meetingId: meeting.id
            })
        }
        return NextResponse.json({
            success: true,
            message: 'webhook recieved but no action needed bro'
        })
    } catch (error) {
        console.error('webhook processing errir:', error)
        return NextResponse.json({ error: 'internal server error' }, { status: 500 })
    }
}