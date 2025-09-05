import db from "../libs/admin_db.js";

// Store for batched notifications (60s grouping)
const notificationBatches = new Map();

// Helper function to generate notification content based on message type
function generateNotificationContent(message) {
  switch (message.type) {
    case 'poll':
      return `📊 ${message.content}`;
    case 'match':
      return `⚽ ${message.content}`;
    case 'text':
    case 'image':
    default:
      return message.content || '[Image]';
  }
}

async function sendPushNotification(messages) {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error('Failed to send push notification:', response.status);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

async function getMemberPushTokens(groupMembers, excludeUserId) {
  const tokens = groupMembers
    .filter(member =>
      member.profile?.pushToken &&
      member.profile.user?.id !== excludeUserId
    )
    .map(member => member.profile.pushToken);

  return tokens;
}

async function sendImmediateNotification(message, group, memberTokens) {
  const mentionText = message.mentions?.map(m => `@${m}`).join(' ') || '';
  const content = generateNotificationContent(message);

  const hasMentions = message.mentions && message.mentions.length > 0;
  const notificationType = hasMentions ? 'mention' : message.type || 'message';
  const channelId = hasMentions ? 'mentions' : (message.type === 'poll' || message.type === 'match' ? 'mentions' : 'messages');

  const notifications = memberTokens.map(token => ({
    to: token,
    sound: 'default',
    title: group.name || 'Group Chat',
    body: `${message.authorName}: ${mentionText} ${content}`.trim(),
    data: {
      groupId: message.group.id,
      messageId: message.id,
      type: notificationType,
      messageType: message.type,
      priority: 'high'
    },
    priority: 'high',
    channelId,
  }));

  await sendPushNotification(notifications);
}

async function sendBatchedNotifications(batchKey, memberTokens) {
  const batch = notificationBatches.get(batchKey);
  if (!batch || !memberTokens.length) {
    notificationBatches.delete(batchKey);
    return;
  }

  const messageCount = batch.messages.length;
  const authors = [...new Set(batch.messages.map(m => m.authorName))];

  let title = batch.groupName;
  let body = '';

  if (messageCount === 1) {
    const msg = batch.messages[0];
    body = `${msg.authorName}: ${msg.content}`;
  } else if (authors.length === 1) {
    body = `${authors[0]} sent ${messageCount} messages`;
  } else {
    body = `${messageCount} new messages from ${authors.slice(0, 2).join(', ')}${authors.length > 2 ? ` and ${authors.length - 2} others` : ''}`;
  }

  const notifications = memberTokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: {
      groupId: batch.groupId,
      messageIds: batch.messages.map(m => m.messageId),
      type: 'batch',
      messageCount,
    },
    priority: 'normal',
    channelId: 'messages',
  }));

  try {
    await sendPushNotification(notifications);
  } catch (error) {
    console.error('Failed to send batched notifications:', error);
  } finally {
    notificationBatches.delete(batchKey);
  }
}

async function batchRegularNotification(message, group, memberTokens) {
  const batchKey = message.group.id;
  const content = generateNotificationContent(message);

  if (notificationBatches.has(batchKey)) {
    const existingBatch = notificationBatches.get(batchKey);
    clearTimeout(existingBatch.timeoutId);

    existingBatch.messages.push({
      content,
      authorName: message.authorName,
      messageId: message.id,
      messageType: message.type,
    });

    existingBatch.timeoutId = setTimeout(() => {
      sendBatchedNotifications(batchKey, memberTokens);
    }, 60000);
  } else {
    const timeoutId = setTimeout(() => {
      sendBatchedNotifications(batchKey, memberTokens);
    }, 60000);

    notificationBatches.set(batchKey, {
      groupId: message.group.id,
      groupName: group.name || 'Group Chat',
      messages: [{
        content,
        authorName: message.authorName,
        messageId: message.id,
        messageType: message.type,
      }],
      scheduledAt: Date.now(),
      timeoutId,
    });
  }
}

async function handleNewMessage(message) {
  try {
    // Skip if message doesn't have required fields
    if (!message.group?.id || !message.authorName || !message.author?.id) {
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
    if (!group) return;

    const memberTokens = await getMemberPushTokens(
      group.memberships || [],
      message.author.id
    );

    if (memberTokens.length === 0) return;

    const hasMentions = message.mentions && message.mentions.length > 0;
    const isImmediate = hasMentions || message.type === 'poll' || message.type === 'match';

    if (isImmediate) {
      await sendImmediateNotification(message, group, memberTokens);
    } else {
      await batchRegularNotification(message, group, memberTokens);
    }

  } catch (error) {
    console.error('Error handling new message:', error);
  }
}

// Subscribe to new messages
const sub = db.subscribeQuery(
  { 
    messages: { 
      $: { limit: 100, order: { createdAt: "desc" } },
      author: {},
      group: {}
    } 
  },
  (payload) => {
    if (payload.type === "error") {
      console.log("InstantDB subscription error:", payload);
      // Don't close subscription on error, try to reconnect
    } else if (payload.type === "result") {
      const messages = payload.data.messages || [];
      
      // Process only new messages (within last 30 seconds to avoid processing old messages on startup)
      const thirtySecondsAgo = Date.now() - 30000;
      const newMessages = messages.filter(msg => msg.createdAt > thirtySecondsAgo);
      
      newMessages.forEach(message => {
        handleNewMessage(message);
      });
    }
  },
);

console.log("🔔 Notification service started - listening for new messages");

export default async function (fastify, opts) {
  // Health check endpoint
  fastify.get('/health', async function (request, reply) {
    return { status: 'ok', subscribed: !!sub };
  });
}
