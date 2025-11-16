import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

async function seedUpcomingMeetings() {
  try {
    const userId = "user_35TMDQO4uTLDXZf8araPsH0KTAt";

    const now = new Date();

    const upcoming = [
      {
        title: "Design Review with Team",
        description: "Review latest UI changes and gather feedback.",
        startInMinutes: 60,
        durationMinutes: 45,
      },
      {
        title: "Client Sync: Q4 Roadmap",
        description: "Discuss priorities and timelines for Q4.",
        startInMinutes: 60 * 24, // tomorrow
        durationMinutes: 30,
      },
      {
        title: "Weekly Standup",
        description: "Team updates and blockers.",
        startInMinutes: 60 * 48 + 30, // day after tomorrow + 30m
        durationMinutes: 20,
      },
    ];

    for (const item of upcoming) {
      const startTime = new Date(now.getTime() + item.startInMinutes * 60 * 1000);
      const endTime = new Date(startTime.getTime() + item.durationMinutes * 60 * 1000);

      await prisma.meeting.create({
        data: {
          userId,
          title: item.title,
          description: item.description,
          meetingUrl: "https://meet.google.com/cug-hszq-vqv",
          startTime,
          endTime,
          calendarEventId: randomUUID(),
          isFromCalendar: true,
          botScheduled: true,
          botSent: false,
          meetingEnded: false,
          transcriptReady: false,
          processed: false,
          emailSent: false,
          ragProcessed: false,
        },
      });
    }

    console.log("Seeded upcoming meetings successfully ✅");
  } catch (error) {
    console.error("Error seeding upcoming meetings", error);
  }
}

seedUpcomingMeetings();
