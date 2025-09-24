import db from "../libs/admin_db.js";

// Global batch for regular messages (100 messages or 60s, whichever comes first)
let globalBatch = {
  messages: [],
  firstMessageTime: null,
  timeoutId: null,
};

// Helper function to generate notification content based on message type
function generateNotificationContent(message) {
  switch (message.type) {
    case "poll":
      return `📊 ${message.content}`;
    case "match":
      return `⚽ ${message.content}`;
    case "dues":
      return `💰 ${message.content}`;
    case "text":
    case "image":
    default:
      return message.content || "[Image]";
  }
}

async function sendPushNotification(messages) {
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error("Failed to send push notification:", response.status);
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending push notification:", error);
    throw error;
  }
}

async function getMemberPushTokens(groupMembers, excludeUserId, messageTimestamp) {
  const tokens = groupMembers
    .filter((member) => {
      // Admin SDK returns profile as array
      const profile = Array.isArray(member.profile) ? member.profile[0] : member.profile;
      if (!profile?.pushToken) return false;

      // Check user ID - could be in profile.user array or direct
      const userId = Array.isArray(profile.user) ? profile.user[0]?.id : profile.user?.id;
      if (userId === excludeUserId) return false;

      // Check if message is newer than user's last read timestamp
      if (messageTimestamp && member.lastReadMessageAt) {
        // Skip if user has already read messages newer than this one
        if (messageTimestamp <= member.lastReadMessageAt) {
          return false;
        }
      }

      return true;
    })
    .map((member) => {
      const profile = Array.isArray(member.profile) ? member.profile[0] : member.profile;
      return profile.pushToken;
    });

  return tokens;
}

async function sendImmediateNotification(message, group, memberTokens) {
  const mentionText = message.mentions?.map((m) => `@${m}`).join(" ") || "";
  const content = generateNotificationContent(message);

  const hasMentions = message.mentions && message.mentions.length > 0;
  const notificationType = hasMentions ? "mention" : message.type || "message";
  const channelId = hasMentions
    ? "mentions"
    : message.type === "poll" ||
      message.type === "match" ||
      message.type === "dues"
    ? "mentions"
    : "messages";

  const notifications = memberTokens.map((token) => ({
    to: token,
    sound: "default",
    title: group.name || "Group Chat",
    body: `${message.authorName}: ${mentionText} ${content}`.trim(),
    data: {
      groupId: message.group.id,
      messageId: message.id,
      type: notificationType,
      messageType: message.type,
      priority: "high",
    },
    priority: "high",
    channelId,
  }));

  await sendPushNotification(notifications);
}

async function sendGlobalBatchNotifications() {
  if (!globalBatch.messages.length) {
    return;
  }

  const messageCount = globalBatch.messages.length;
  console.log('📤 Sending batch notification for', messageCount, 'messages');
  const authors = [...new Set(globalBatch.messages.map((m) => m.authorName))];
  const groups = [...new Set(globalBatch.messages.map((m) => m.groupName))];

  // Group notifications by push token to avoid duplicates
  const tokenNotifications = new Map();

  globalBatch.messages.forEach((msg) => {
    msg.memberTokens.forEach((token) => {
      if (!tokenNotifications.has(token)) {
        tokenNotifications.set(token, []);
      }
      tokenNotifications.get(token).push(msg);
    });
  });

  const notifications = Array.from(tokenNotifications.entries()).map(
    ([token, msgs]) => {
      let title = "FutKui";
      let body = "";

      if (messageCount === 1) {
        const msg = msgs[0];
        title = msg.groupName;
        body = `${msg.authorName}: ${msg.content}`;
      } else if (groups.length === 1) {
        title = groups[0];
        if (authors.length === 1) {
          body = `${authors[0]} sent ${messageCount} messages`;
        } else {
          body = `${messageCount} new messages from ${authors
            .slice(0, 2)
            .join(", ")}${
            authors.length > 2 ? ` and ${authors.length - 2} others` : ""
          }`;
        }
      } else {
        body = `${messageCount} new messages in ${groups.length} groups`;
      }

      return {
        to: token,
        sound: "default",
        title,
        body,
        data: {
          messageIds: msgs.map((m) => m.messageId),
          type: "batch",
          messageCount: msgs.length,
        },
        priority: "normal",
        channelId: "messages",
      };
    },
  );

  try {
    await sendPushNotification(notifications);
    console.log('✅ Batch notifications sent to', notifications.length, 'recipients');
  } catch (error) {
    console.error("Failed to send global batch notifications:", error);
  } finally {
    // Reset global batch
    if (globalBatch.timeoutId) {
      clearTimeout(globalBatch.timeoutId);
    }
    globalBatch = {
      messages: [],
      firstMessageTime: null,
      timeoutId: null,
    };
  }
}

async function addToGlobalBatch(message, group, memberTokens) {
  const content = generateNotificationContent(message);

  globalBatch.messages.push({
    content,
    authorName: message.authorName,
    messageId: message.id,
    groupName: group.name || "Group Chat",
    memberTokens,
  });

  console.log('📦 Added to batch (', globalBatch.messages.length, '/', 100, ')');

  // If this is the first message, start the 60s timer
  if (globalBatch.messages.length === 1) {
    globalBatch.firstMessageTime = Date.now();
    globalBatch.timeoutId = setTimeout(() => {
      sendGlobalBatchNotifications();
    }, 60000);
  }

  // If we hit 100 messages, trigger immediately
  if (globalBatch.messages.length >= 100) {
    console.log('🚀 Batch limit reached, sending immediately');
    await sendGlobalBatchNotifications();
  }
}

async function handleNewMessage(message) {
  try {
    // Skip if no message ID
    if (!message.id) {
      return;
    }

    // Skip messages older than 5 minutes to avoid spam from old messages
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    if (message.createdAt && message.createdAt < fiveMinutesAgo) {
      console.log('⏰ Skipping old message:', message.id, 'created at:', new Date(message.createdAt));
      return;
    }

    // Query only the fields we need
    let messageQuery;
    try {
      messageQuery = await db.query({
        messages: {
          $: {
            where: { id: message.id },
            fields: ['id', 'authorName', 'content', 'type', 'mentions', 'createdAt']
          },
          author: {
            $: {
              fields: ['id']
            },
            user: {
              $: {
                fields: ['id']
              }
            }
          },
          group: {
            $: {
              fields: ['id', 'name']
            },
            memberships: {
              $: {
                fields: ['id', 'lastReadMessageAt']
              },
              profile: {
                $: {
                  fields: ['pushToken']
                },
                user: {
                  $: {
                    fields: ['id']
                  }
                },
              },
            },
          },
        },
      });
    } catch (queryError) {
      console.error('Query error:', queryError);
      return;
    }

    const fullMessage = messageQuery?.messages?.[0];
    if (!fullMessage) {
      console.log('⚠️ Message not found in query result:', message.id);
      return;
    }

    // Admin SDK returns arrays for relationships
    const group = fullMessage.group?.[0];
    const author = fullMessage.author?.[0];

    // Skip if message doesn't have required fields
    if (!group?.id || !fullMessage.authorName) {
      return;
    }

    // Double-check message age with full message data
    if (fullMessage.createdAt && fullMessage.createdAt < fiveMinutesAgo) {
      console.log('⏰ Skipping old message (double-check):', fullMessage.id, 'created at:', new Date(fullMessage.createdAt));
      return;
    }

    console.log('🔍 Processing:', fullMessage.type || 'text', 'message in', group.name);

    // Get author's user ID for excluding from notifications
    const authorUserId = Array.isArray(author?.user) ? author.user[0]?.id : author?.user?.id;

    const memberTokens = await getMemberPushTokens(
      group.memberships || [],
      authorUserId,
      fullMessage.createdAt,
    );

    if (memberTokens.length === 0) {
      return;
    }

    const hasMentions = fullMessage.mentions && fullMessage.mentions.length > 0;
    const isImmediate =
      hasMentions ||
      fullMessage.type === "poll" ||
      fullMessage.type === "match" ||
      fullMessage.type === "dues";

    if (isImmediate) {
      console.log('⚡ Immediate notification:', fullMessage.type || 'mention');
      await sendImmediateNotification(fullMessage, group, memberTokens);
    } else {
      await addToGlobalBatch(fullMessage, group, memberTokens);
    }
  } catch (error) {
    console.error("Error handling new message:", error);
  }
}

// Flag to skip first subscription trigger on startup
let isFirstTrigger = true;

// Subscribe to new messages - only need ID since we fetch full data with queryOnce
const sub = db.subscribeQuery(
  {
    messages: {
      $: { limit: 1, order: { serverCreatedAt: "desc" } },
    },
  },
  (payload) => {
    if (payload.type === "error") {
      console.log("InstantDB subscription error:", payload);
      // Don't close subscription on error, try to reconnect
    } else if (payload.type === "ok") {
      // Skip first trigger on startup to avoid processing old messages
      if (isFirstTrigger) {
        isFirstTrigger = false;
        console.log("Notification service ready");
        return;
      }

      const message = payload.data.messages[0];
      if (message) {
        handleNewMessage(message);
      }
    }
  },
);

console.log("🔔 Notification service started - listening for new messages");

export default async function (fastify) {
  // Health check endpoint
  fastify.get("/health", async function () {
    return { status: "ok", subscribed: !!sub };
  });
}
