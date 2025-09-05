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

async function getMemberPushTokens(groupMembers, excludeUserId) {
  const tokens = groupMembers
    .filter(
      (member) =>
        member.profile?.pushToken && member.profile.user?.id !== excludeUserId,
    )
    .map((member) => member.profile.pushToken);

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
    console.log('📦 No messages in global batch to send');
    return;
  }

  const messageCount = globalBatch.messages.length;
  console.log('📤 Sending global batch notification:', {
    messageCount,
    batchAge: globalBatch.firstMessageTime ? Date.now() - globalBatch.firstMessageTime : 0
  });
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
    console.log('📱 Sending batch to', notifications.length, 'recipients');
    await sendPushNotification(notifications);
    console.log('✅ Global batch notifications sent successfully');
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

  console.log('📦 Added to batch:', {
    batchSize: globalBatch.messages.length,
    messageId: message.id,
    groupName: group.name
  });

  // If this is the first message, start the 60s timer
  if (globalBatch.messages.length === 1) {
    globalBatch.firstMessageTime = Date.now();
    globalBatch.timeoutId = setTimeout(() => {
      console.log('⏰ 60s timer expired, sending batch');
      sendGlobalBatchNotifications();
    }, 60000);
    console.log('⏱️ Started 60s batch timer');
  }

  // If we hit 100 messages, trigger immediately
  if (globalBatch.messages.length >= 100) {
    console.log('🚀 Batch size limit reached (100), sending immediately');
    await sendGlobalBatchNotifications();
  }
}

async function handleNewMessage(message) {
  try {
    console.log('🔍 Processing new message:', {
      messageId: message.id,
      groupId: message.group?.id,
      authorName: message.authorName,
      type: message.type,
      content: message.content?.substring(0, 50) + '...',
      hasMentions: !!(message.mentions && message.mentions.length > 0)
    });

    // Skip if message doesn't have required fields
    if (!message.group?.id || !message.authorName || !message.author?.id) {
      console.log('⚠️ Skipping message - missing required fields');
      return;
    }

    // Get group with memberships
    const groupQuery = await db.queryOnce({
      groups: {
        $: { where: { id: message.group.id } },
        memberships: {
          profile: {
            user: {},
          },
        },
      },
    });

    const group = groupQuery.data.groups?.[0];
    if (!group) {
      console.log('⚠️ Group not found:', message.group.id);
      return;
    }

    const memberTokens = await getMemberPushTokens(
      group.memberships || [],
      message.author.id,
    );

    console.log('📱 Found push tokens:', {
      groupName: group.name,
      totalMembers: group.memberships?.length || 0,
      tokensFound: memberTokens.length,
      excludeUserId: message.author.id
    });

    if (memberTokens.length === 0) {
      console.log('⚠️ No push tokens found for group members');
      return;
    }

    const hasMentions = message.mentions && message.mentions.length > 0;
    const isImmediate =
      hasMentions ||
      message.type === "poll" ||
      message.type === "match" ||
      message.type === "dues";

    console.log('🚀 Notification routing:', {
      isImmediate,
      hasMentions,
      messageType: message.type,
      route: isImmediate ? 'immediate' : 'batch'
    });

    if (isImmediate) {
      console.log('⚡ Sending immediate notification');
      await sendImmediateNotification(message, group, memberTokens);
    } else {
      console.log('📦 Adding to global batch');
      await addToGlobalBatch(message, group, memberTokens);
    }
  } catch (error) {
    console.error("Error handling new message:", error);
  }
}

// Flag to skip first subscription trigger on startup
let isFirstTrigger = true;

// Subscribe to new messages
const sub = db.subscribeQuery(
  {
    messages: {
      $: { limit: 1, order: { serverCreatedAt: "desc" } },
      author: {},
      group: {},
    },
  },
  (payload) => {
    if (payload.type === "error") {
      console.log("InstantDB subscription error:", payload);
      // Don't close subscription on error, try to reconnect
    } else if (payload.type === "ok") {
      console.log('📨 Subscription payload received:', {
        messageCount: payload.data.messages?.length || 0,
        isFirstTrigger
      });

      // Skip first trigger on startup to avoid processing old messages
      if (isFirstTrigger) {
        isFirstTrigger = false;
        console.log("Skipping first subscription trigger on startup");
        return;
      }

      const message = payload.data.messages[0];
      if (message) {
        console.log('🎯 New message detected, processing...');
        handleNewMessage(message);
      } else {
        console.log('⚠️ No message in payload data');
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
