import { prisma } from "./db";
import { chatWithAI, createEmbedding, createManyEmbeddings } from "./openai";
import { saveManyVectors, searchVectors } from "./pinecone";
import { chunkTranscript, extractSpeaker } from "./text-chunker";

type SearchResult = {
    metadata?: Record<string, unknown>
    score?: number
}

function getMetaString(metadata: Record<string, unknown> | undefined, key: string): string {
    const value = metadata?.[key]
    return typeof value === "string" ? value : ""
}

function transcriptToText(transcript: unknown): string {
    if (!transcript) {
        return "";
    }

    if (typeof transcript === "string") {
        return transcript;
    }

    if (Array.isArray(transcript)) {
        return transcript
            .map((item: unknown) => {
                const record = typeof item === "object" && item !== null
                    ? (item as { speaker?: unknown; words?: unknown; text?: unknown })
                    : {}
                const speaker = typeof record.speaker === "string" ? record.speaker : "Speaker"
                const words = Array.isArray(record.words)
                    ? record.words
                        .map((w: unknown) => {
                            if (typeof w === "object" && w !== null) {
                                const word = (w as { word?: unknown }).word
                                return typeof word === "string" ? word : ""
                            }
                            return ""
                        })
                        .filter(Boolean)
                        .join(" ")
                    : ""
                const text = typeof record.text === "string" ? record.text : words
                return `${speaker}: ${text}`.trim();
            })
            .filter(Boolean)
            .join("\n");
    }

    if (typeof transcript === "object" && transcript !== null) {
        const maybeText = (transcript as { text?: unknown }).text;
        if (typeof maybeText === "string") {
            return maybeText;
        }
    }

    return "";
}

function truncateText(text: string, maxChars: number): string {
    if (text.length <= maxChars) {
        return text;
    }

    return `${text.slice(0, maxChars)}\n\n[Transcript truncated for response length]`;
}

export async function processTranscript(
    meetingId: string,
    userId: string,
    transcript: string,
    meetingTitle?: string
) {
    const chunks = chunkTranscript(transcript)

    const texts = chunks.map(chunk => chunk.content)

    const embeddings = await createManyEmbeddings(texts)

    const dbChunks = chunks.map((chunk) => ({
        meetingId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        speakerName: extractSpeaker(chunk.content),
        vectorId: `${meetingId}_chunk_${chunk.chunkIndex}`
    }))

    await prisma.transcriptChunk.createMany({
        data: dbChunks,
        skipDuplicates: true
    })

    const vectors = chunks.map((chunk, index) => ({
        id: `${meetingId}_chunk_${chunk.chunkIndex}`,
        embedding: embeddings[index],
        metadata: {
            meetingId,
            userId,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            speakerName: extractSpeaker(chunk.content),
            meetingTitle: meetingTitle || 'Untitled Meeting'

        }
    }))

    await saveManyVectors(vectors)
}

export async function chatWithMeeting(
    userId: string,
    meetingId: string,
    question: string
) {
    const meeting = await prisma.meeting.findFirst({
        where: {
            id: meetingId,
            userId,
        },
        select: {
            id: true,
            title: true,
            createdAt: true,
            transcript: true,
        },
    })

    if (!meeting) {
        throw new Error("meeting not found")
    }

    let results: SearchResult[] = []
    try {
        const questionEmbedding = await createEmbedding(question)
        results = await searchVectors(
            questionEmbedding,
            { userId, meetingId },
            5
        )
    } catch (error) {
        console.error("vector search failed, falling back to transcript:", error)
    }

    if (!results.length) {
        const transcriptText = transcriptToText(meeting.transcript)

        if (!transcriptText.trim()) {
            return {
                answer: "Transcript is not ready for this meeting yet. Please try again in a few minutes.",
                sources: []
            }
        }

        const fallbackPrompt = `You are helping the user understand one specific meeting.

Meeting Title: ${meeting.title || "Untitled Meeting"}
Date: ${meeting.createdAt ? new Date(meeting.createdAt).toDateString() : "Unknown"}

Use only this transcript content to answer:
------------------------------------------------------------
${truncateText(transcriptText, 12000)}
------------------------------------------------------------

If the asked topic is not present, clearly say: "This wasn't covered in the meeting."`

        const answer = await chatWithAI(fallbackPrompt, question)
        return {
            answer,
            sources: []
        }
    }

    const context = results
        .map(result => {
            const speaker = getMetaString(result.metadata, "speakerName") || 'Unknown'
            const content = getMetaString(result.metadata, "content")
            return `${speaker}: ${content}`
        })
        .join('\n\n')

    const systemPrompt = `You are an expert meeting interpreter and summarizer whose job is to help the user clearly remember, understand, and revisit their meeting.

Meeting Title: ${meeting?.title || 'Untitled Meeting'}
Date: ${meeting?.createdAt ? new Date(meeting.createdAt).toDateString() : 'Unknown'}

Below is the full meeting context (everything that happened, was said, discussed, or planned):
------------------------------------------------------------
${context}
------------------------------------------------------------

Your task:
- Answer the user’s question *only* using the meeting content above.
- Be conversational, clear, and helpful — like a smart coworker reminding them what happened.
- Provide context and connections so the user can mentally recall the meeting easily.
- If the user asks about a topic that *was* mentioned, explain it in detail and tie it back to when/why it came up.
- If something was *not* discussed in the meeting, clearly state: 
  "This wasn’t covered in the meeting."
- When helpful, remind the user of key decisions, action items, or reasoning mentioned in the meeting.
- Do NOT hallucinate or invent information beyond the meeting.

Your goal: 
Give the user the most accurate, friendly, and memory-refreshing explanation of their meeting so they can fully relive and understand what happened.`

    const answer = await chatWithAI(systemPrompt, question)

    return {
        answer,
        sources: results.map(result => ({
            meetingId: getMetaString(result.metadata, "meetingId"),
            content: getMetaString(result.metadata, "content"),
            speakerName: getMetaString(result.metadata, "speakerName"),
            confidence: result.score
        }))
    }
}

export async function chatWithAllMeetings(
    userId: string,
    question: string
) {
    let results: SearchResult[] = []
    try {
        const questionEmbedding = await createEmbedding(question)
        results = await searchVectors(
            questionEmbedding,
            { userId },
            8
        )
    } catch (error) {
        console.error("vector search failed for all-meetings chat:", error)
    }

    if (!results.length) {
        const meetings = await prisma.meeting.findMany({
            where: {
                userId,
            },
            select: {
                id: true,
                title: true,
                startTime: true,
                transcript: true,
            },
            orderBy: {
                startTime: "desc",
            },
            take: 5,
        })

        const fallbackContext = meetings
            .map((meeting) => {
                const transcriptText = transcriptToText(meeting.transcript)
                if (!transcriptText.trim()) {
                    return ""
                }

                return `Meeting: ${meeting.title || "Untitled Meeting"} (${new Date(meeting.startTime).toDateString()})\n${truncateText(transcriptText, 2500)}`
            })
            .filter(Boolean)
            .join("\n\n---\n\n")

        if (!fallbackContext.trim()) {
            return {
                answer: "I could not find transcript content in your meetings yet. Please wait for transcript processing to complete.",
                sources: []
            }
        }

        const fallbackPrompt = `You are helping someone understand their meeting history.

Use only the transcript excerpts below to answer the question. Mention the meeting title when relevant.

${truncateText(fallbackContext, 14000)}`

        const answer = await chatWithAI(fallbackPrompt, question)

        return {
            answer,
            sources: meetings.map((meeting) => ({
                meetingId: meeting.id,
                meetingTitle: meeting.title,
            })),
        }
    }

    const context = results
        .map(result => {
            const meetingTitle = getMetaString(result.metadata, "meetingTitle") || 'Untitled Meeting'
            const speaker = getMetaString(result.metadata, "speakerName") || 'Unknown'
            const content = getMetaString(result.metadata, "content")
            return `Meeting: ${meetingTitle}\n${speaker}: ${content}`
        })
        .join('\n\n---\n\n')

    const systemPrompt = `You are helping someone understand their meeting history.
    
    Here's what was discussed across their meetings:
    ${context}

    Answer the user's question based only on the meeting content above. When you reference something, mention which meetings its from.`

    const answer = await chatWithAI(systemPrompt, question)

    return {
        answer,
        sources: results.map(result => ({
            meetingId: getMetaString(result.metadata, "meetingId"),
            meetingTitle: getMetaString(result.metadata, "meetingTitle"),
            content: getMetaString(result.metadata, "content"),
            speakerName: getMetaString(result.metadata, "speakerName"),
            confidence: result.score
        }))
    }
}