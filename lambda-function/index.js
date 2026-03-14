const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.handler = async (event) => {
  console.log("=== Lambda Execution Started ===", {
    timestamp: new Date().toISOString(),
    eventId: event.id,
  });

  try {
    console.log("Step 1: Starting calendar sync...");
    await syncAllUserCalendars();

    console.log("Step 2: Scheduling bots for upcoming meetings...");
    await scheduleBotsForUpcomingMeetings();

    console.log("=== Lambda Execution Completed Successfully ===");
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "success" }),
    };
  } catch (error) {
    console.error("=== FATAL ERROR ===", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      timestamp: new Date().toISOString(),
    });
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "internal server error",
        details: error.message,
        code: error.code,
      }),
    };
  } finally {
    await prisma.$disconnect();
  }
};

async function syncAllUserCalendars() {
  console.log("[Calendar Sync] Fetching users with calendar connected...");
  const users = await prisma.user.findMany({
    where: {
      calendarConnected: true,
      googleAccessToken: {
        not: null,
      },
    },
  });

  console.log(`[Calendar Sync] Found ${users.length} users to sync`);

  for (const user of users) {
    try {
      console.log(`[Calendar Sync] Syncing user ${user.clerkId}...`);
      await syncUserCalendar(user);
      console.log(`[Calendar Sync] ✓ Successfully synced user ${user.clerkId}`);
    } catch (error) {
      console.error(`[Calendar Sync] ✗ FAILED for user ${user.clerkId}:`, {
        message: error.message,
        code: error.code,
        userId: user.id,
      });
    }
  }
}

async function syncUserCalendar(user) {
  try {
    console.log(`[syncUserCalendar] Starting for user ${user.clerkId}`);
    let accessToken = user.googleAccessToken;

    const now = new Date();
    const tokenExpiry = new Date(user.googleTokenExpiry);
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    console.log(`[syncUserCalendar] Token status:`, {
      userClerkId: user.clerkId,
      expiryTime: tokenExpiry.toISOString(),
      now: now.toISOString(),
      needsRefresh: tokenExpiry <= tenMinutesFromNow,
    });

    if (tokenExpiry <= tenMinutesFromNow) {
      console.log(
        `[syncUserCalendar] Token expired/expiring soon, refreshing...`,
      );
      accessToken = await refreshGoogleToken(user);
      if (!accessToken) {
        console.warn(
          `[syncUserCalendar] Token refresh returned null for user ${user.clerkId}`,
        );
        return;
      }
      console.log(`[syncUserCalendar] ✓ Token refreshed successfully`);
    }

    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    console.log(
      `[syncUserCalendar] Fetching events from ${now.toISOString()} to ${sevenDays.toISOString()}`,
    );

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${now.toISOString()}&` +
        `timeMax=${sevenDays.toISOString()}&` +
        `singleEvents=true&orderBy=startTime&showDeleted=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log(
      `[syncUserCalendar] Google Calendar API response status: ${response.status}`,
    );

    if (!response.ok) {
      console.error(
        `[syncUserCalendar] API Failed with status ${response.status}`,
      );
      if (response.status === 401) {
        console.log(
          `[syncUserCalendar] 401 Unauthorized - disconnecting calendar`,
        );
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            calendarConnected: false,
          },
        });
        return;
      }
      throw new Error(`Calendar API failed: ${response.status}`);
    }

    const data = await response.json();
    const events = data.items || [];
    console.log(
      `[syncUserCalendar] ✓ Retrieved ${events.length} events from Google Calendar`,
    );

    const existingEvents = await prisma.meeting.findMany({
      where: {
        userId: user.id,
        isFromCalendar: true,
        startTime: {
          gte: now,
        },
      },
    });

    console.log(
      `[syncUserCalendar] Found ${existingEvents.length} existing meetings in DB`,
    );

    const googleEventIds = new Set();
    for (const event of events) {
      if (event.status === "cancelled") {
        console.log(`[syncUserCalendar] Handling cancelled event: ${event.id}`);
        await handleDeletedEvent(event);
        continue;
      }
      googleEventIds.add(event.id);
      await processEvent(user, event);
    }

    const deletedEvents = existingEvents.filter(
      (dbEvent) => !googleEventIds.has(dbEvent.calendarEventId),
    );

    if (deletedEvents.length > 0) {
      console.log(
        `[syncUserCalendar] Deleting ${deletedEvents.length} events that were removed from Google Calendar`,
      );
      for (const deletedEvent of deletedEvents) {
        await handleDeletedEventFromDB(deletedEvent);
      }
    }

    console.log(
      `[syncUserCalendar] ✓ Sync completed successfully for user ${user.clerkId}`,
    );
  } catch (error) {
    console.error(
      `[syncUserCalendar] ✗ CRITICAL ERROR for user ${user.clerkId}:`,
      {
        message: error.message,
        code: error.code,
        stack: error.stack,
      },
    );
    if (error.message.includes("401") || error.message.includes("403")) {
      console.log(
        `[syncUserCalendar] Auth error detected - disconnecting calendar`,
      );
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          calendarConnected: false,
        },
      });
    }
  }
}

async function refreshGoogleToken(user) {
  try {
    console.log(
      `[refreshGoogleToken] Starting token refresh for user ${user.clerkId}`,
    );

    if (!user.googleRefreshToken) {
      console.error(
        `[refreshGoogleToken] ✗ No refresh token available for user ${user.clerkId}`,
      );
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          calendarConnected: false,
          googleAccessToken: null,
        },
      });
      return null;
    }

    console.log(`[refreshGoogleToken] Calling Google OAuth endpoint...`);
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: user.googleRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error(
        `[refreshGoogleToken] ✗ OAuth response not OK: ${response.status}`,
      );
    }

    const tokens = await response.json();

    if (!tokens.access_token) {
      console.error(`[refreshGoogleToken] ✗ No access token in response:`, {
        hasRefreshToken: !!tokens.refresh_token,
        hasExpiry: !!tokens.expires_in,
        error: tokens.error,
        errorDescription: tokens.error_description,
      });
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          calendarConnected: false,
        },
      });
      return null;
    }

    console.log(
      `[refreshGoogleToken] ✓ Token refreshed, new expiry: ${new Date(Date.now() + tokens.expires_in * 1000).toISOString()}`,
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        googleAccessToken: tokens.access_token,
        googleTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
    return tokens.access_token;
  } catch (error) {
    console.error(
      `[refreshGoogleToken] ✗ CRITICAL ERROR for user ${user.clerkId}:`,
      {
        message: error.message,
        code: error.code,
        stack: error.stack,
      },
    );
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        calendarConnected: false,
      },
    });
    return null;
  }
}

async function handleDeletedEvent(event) {
  try {
    const exsistingMeeting = await prisma.meeting.findUnique({
      where: {
        calendarEventId: event.id,
      },
    });
    if (exsistingMeeting) {
      await prisma.meeting.delete({
        where: {
          calendarEventId: event.id,
        },
      });
    }
  } catch (error) {
    console.error("error deleting event:", error.message);
  }
}

async function handleDeletedEventFromDB(dbEvent) {
  console.log(
    `[handleDeletedEventFromDB] Deleting meeting from DB: ${dbEvent.id}`,
  );
  // Use deleteMany instead of delete - it won't throw if record doesn't exist
  const result = await prisma.meeting.deleteMany({
    where: {
      id: dbEvent.id,
    },
  });
  console.log(`[handleDeletedEventFromDB] Deleted ${result.count} meeting(s)`);
}

async function processEvent(user, event) {
  const meetingUrl =
    event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri;
  if (!meetingUrl || !event.start?.dateTime) {
    return;
  }

  const eventData = {
    calendarEventId: event.id,
    userId: user.id,
    title: event.summary || "Untitled Meeting",
    description: event.description || null,
    meetingUrl: meetingUrl,
    startTime: new Date(event.start.dateTime),
    endTime: new Date(event.end.dateTime),
    attendees: event.attendees
      ? JSON.stringify(event.attendees.map((a) => a.email))
      : null,
    isFromCalendar: true,
    botScheduled: true,
  };

  try {
    const exsistingMeeting = await prisma.meeting.findUnique({
      where: {
        calendarEventId: event.id,
      },
    });

    if (exsistingMeeting) {
      const changes = [];
      if (exsistingMeeting.title !== eventData.title) changes.push("title");
      if (
        exsistingMeeting.startTime.getTime() !== eventData.startTime.getTime()
      )
        changes.push("time");
      if (exsistingMeeting.meetingUrl !== eventData.meetingUrl)
        changes.push("meeting url");
      if (exsistingMeeting.attendees !== eventData.attendees)
        changes.push("attendees");

      const updateData = {
        title: eventData.title,
        description: eventData.description,
        meetingUrl: eventData.meetingUrl,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        attendees: eventData.attendees,
      };

      if (!exsistingMeeting.botSent) {
        updateData.botScheduled = eventData.botScheduled;
      }
      await prisma.meeting.update({
        where: {
          calendarEventId: event.id,
        },
        data: updateData,
      });
    } else {
      await prisma.meeting.create({
        data: eventData,
      });
    }
  } catch (error) {
    console.error(`error for ${event.id}:`, error.message);
  }
}

async function scheduleBotsForUpcomingMeetings() {
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  console.log("[Bot Scheduler] Looking for meetings between", {
    from: now.toISOString(),
    to: fiveMinutesFromNow.toISOString(),
  });

  const upcomingMeetings = await prisma.meeting.findMany({
    where: {
      startTime: {
        gte: now,
        lte: fiveMinutesFromNow,
      },
      botScheduled: true,
      botSent: false,
      meetingUrl: {
        not: null,
      },
    },
    include: {
      user: true,
    },
  });

  console.log(
    `[Bot Scheduler] Found ${upcomingMeetings.length} meetings ready for bot scheduling`,
  );

  for (const meeting of upcomingMeetings) {
    try {
      console.log(
        `[Bot Scheduler] Processing meeting: "${meeting.title}" (ID: ${meeting.id})`,
        {
          startTime: meeting.startTime.toISOString(),
          meetingUrl: meeting.meetingUrl,
          userId: meeting.userId,
          userClerkId: meeting.user.clerkId,
        },
      );

      const canSchedule = await canUserScheduleMeeting(meeting.user);

      if (!canSchedule.allowed) {
        console.warn(
          `[Bot Scheduler] ✗ User ${meeting.user.clerkId} NOT ALLOWED to schedule bot:`,
          canSchedule.reason,
        );
        await prisma.meeting.update({
          where: {
            id: meeting.id,
          },
          data: {
            botSent: true,
            botJoinedAt: new Date(),
          },
        });
        continue;
      }

      console.log(
        `[Bot Scheduler] ✓ User allowed to schedule bot, sending request to MeetingBaas...`,
      );

      const requestBody = {
        meeting_url: meeting.meetingUrl,
        bot_name: meeting.user.botName || "AI Noteetaker",
        reserved: false,
        recording_mode: "speaker_view",
        speech_to_text: { provider: "Default" },
        webhook_url: process.env.WEBHOOK_URL,
        extra: {
          meeting_id: meeting.id,
          user_id: meeting.userId,
        },
      };

      if (meeting.user.botImageUrl) {
        requestBody.bot_image = meeting.user.botImageUrl;
      }

      console.log(`[Bot Scheduler] Sending request to MeetingBaas:`, {
        meeting_url: requestBody.meeting_url,
        bot_name: requestBody.bot_name,
        webhook_url: requestBody.webhook_url,
      });

      const response = await fetch("https://api.meetingbaas.com/bots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-meeting-baas-api-key": process.env.MEETING_BAAS_API_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      console.log(
        `[Bot Scheduler] MeetingBaas response status: ${response.status}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Bot Scheduler] ✗ MeetingBaas API Failed:`, {
          status: response.status,
          error: errorText,
        });
        throw new Error(
          `meeting baas api req failed: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();
      console.log(`[Bot Scheduler] ✓ Bot successfully sent to MeetingBaas:`, {
        bot_id: data.bot_id,
        meeting_title: meeting.title,
      });

      await prisma.meeting.update({
        where: {
          id: meeting.id,
        },
        data: {
          botSent: true,
          botId: data.bot_id,
          botJoinedAt: new Date(),
        },
      });

      await incrementMeetingUsage(meeting.userId);
    } catch (error) {
      console.error(
        `[Bot Scheduler] ✗ FAILED for meeting "${meeting.title}":`,
        {
          message: error.message,
          code: error.code,
          meetingId: meeting.id,
          userId: meeting.userId,
        },
      );
    }
  }
}

async function canUserScheduleMeeting(user) {
  try {
    const PLAN_LIMITS = {
      free: { meetings: 0 },
      starter: { meetings: 10 },
      pro: { meetings: 30 },
      premium: { meetings: -1 },
    };

    console.log(`[canUserScheduleMeeting] Checking user ${user.clerkId}:`, {
      currentPlan: user.currentPlan,
      subscriptionStatus: user.subscriptionStatus,
      meetingsThisMonth: user.meetingsThisMonth,
    });

    const limits = PLAN_LIMITS[user.currentPlan] || PLAN_LIMITS.free;

    if (user.currentPlan === "free" || user.subscriptionStatus !== "active") {
      const reason = `${user.currentPlan === "free" ? "Free plan" : "Inactive subscription"} - upgrade required`;
      console.log(`[canUserScheduleMeeting] ✗ User not allowed:`, reason);
      return {
        allowed: false,
        reason: reason,
      };
    }

    if (limits.meetings !== -1 && user.meetingsThisMonth >= limits.meetings) {
      const reason = `Monthly limit reached (${user.meetingsThisMonth}/${limits.meetings})`;
      console.log(`[canUserScheduleMeeting] ✗ User not allowed:`, reason);
      return {
        allowed: false,
        reason: reason,
      };
    }

    console.log(`[canUserScheduleMeeting] ✓ User allowed to schedule bot`);
    return {
      allowed: true,
    };
  } catch (error) {
    console.error("[canUserScheduleMeeting] ✗ ERROR checking meeting limits:", {
      message: error.message,
      code: error.code,
    });
    return {
      allowed: false,
      reason: "Error checking limits",
    };
  }
}

async function incrementMeetingUsage(userId) {
  try {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        meetingsThisMonth: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    console.error("error incrementing meeting usage:", error);
  }
}
