import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token = null;

  // Set up notification channels
  setupNotificationChannels();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      token = pushToken.data;
    } catch (error) {
      console.log('Error getting push token:', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export function addNotificationReceivedListener(
  listener: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(listener);
}

export function addNotificationResponseReceivedListener(
  listener: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

export async function sendPushNotification(messages: any[]) {
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

interface NotificationData {
  groupId: string;
  groupName: string;
  messageContent: string;
  authorName: string;
  authorId: string;
  mentions?: string[];
  messageId: string;
}

interface BatchedNotification {
  groupId: string;
  groupName: string;
  messages: {
    content: string;
    authorName: string;
    messageId: string;
  }[];
  scheduledAt: number;
  timeoutId: ReturnType<typeof setTimeout>;
}

// Store for batched notifications (60s grouping)
const notificationBatches = new Map<string, BatchedNotification>();

export async function sendGroupNotification(data: NotificationData, memberTokens: string[]) {
  if (!memberTokens.length) return;

  // Check if message contains mentions
  const hasMentions = data.mentions && data.mentions.length > 0;

  if (hasMentions) {
    // Send immediate notification for @mentions
    await sendImmediateMentionNotification(data, memberTokens);
  } else {
    // Batch regular messages for 60 seconds
    await batchRegularNotification(data, memberTokens);
  }
}

async function sendImmediateMentionNotification(data: NotificationData, memberTokens: string[]) {
  const mentionText = data.mentions?.map(m => `@${m}`).join(' ') || '';
  
  const notifications = memberTokens.map(token => ({
    to: token,
    sound: 'default',
    title: `${data.groupName}`,
    body: `${data.authorName}: ${mentionText} ${data.messageContent}`.trim(),
    data: {
      groupId: data.groupId,
      messageId: data.messageId,
      type: 'mention',
      priority: 'high'
    },
    priority: 'high' as const,
    channelId: 'mentions',
  }));

  await sendPushNotification(notifications);
}

async function batchRegularNotification(data: NotificationData, memberTokens: string[]) {
  const batchKey = data.groupId;
  
  // Clear existing timeout if it exists
  if (notificationBatches.has(batchKey)) {
    const existingBatch = notificationBatches.get(batchKey)!;
    clearTimeout(existingBatch.timeoutId);
    
    // Add message to existing batch
    existingBatch.messages.push({
      content: data.messageContent,
      authorName: data.authorName,
      messageId: data.messageId,
    });
    
    // Reset timer
    existingBatch.timeoutId = setTimeout(() => {
      sendBatchedNotifications(batchKey, memberTokens);
    }, 60000); // 60 seconds
    
  } else {
    // Create new batch
    const timeoutId = setTimeout(() => {
      sendBatchedNotifications(batchKey, memberTokens);
    }, 60000); // 60 seconds
    
    notificationBatches.set(batchKey, {
      groupId: data.groupId,
      groupName: data.groupName,
      messages: [{
        content: data.messageContent,
        authorName: data.authorName,
        messageId: data.messageId,
      }],
      scheduledAt: Date.now(),
      timeoutId,
    });
  }
}

async function sendBatchedNotifications(batchKey: string, memberTokens: string[]) {
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
    // Single message
    const msg = batch.messages[0];
    body = `${msg.authorName}: ${msg.content}`;
  } else if (authors.length === 1) {
    // Multiple messages from same author
    body = `${authors[0]} sent ${messageCount} messages`;
  } else {
    // Multiple messages from different authors
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
    priority: 'normal' as const,
    channelId: 'messages',
  }));

  try {
    await sendPushNotification(notifications);
  } catch (error) {
    console.error('Failed to send batched notifications:', error);
  } finally {
    // Clean up batch
    notificationBatches.delete(batchKey);
  }
}

export function setupNotificationChannels() {
  // Android notification channels
  if (Platform.OS === 'android') {
    // High priority channel for mentions
    Notifications.setNotificationChannelAsync('mentions', {
      name: 'Mentions',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    // Normal priority channel for regular messages  
    Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 150, 150, 150],
      lightColor: '#0066CC',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  }
}

// Helper to get member push tokens from group
export async function getMemberPushTokens(groupMembers: any[], excludeUserId?: string): Promise<string[]> {
  const tokens = groupMembers
    .filter(member => 
      member.profile?.pushToken && 
      member.profile.user?.id !== excludeUserId
    )
    .map(member => member.profile.pushToken);
    
  return tokens;
}
