import { sendGroupNotification, getMemberPushTokens } from '../notifications';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  AndroidImportance: {
    HIGH: 'high',
    DEFAULT: 'default',
    MAX: 'max',
  }
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios'
  }
}));

// Mock fetch
global.fetch = jest.fn();

describe('Notification System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'success' })
    });
  });

  describe('getMemberPushTokens', () => {
    it('should extract push tokens from group members', () => {
      const members = [
        {
          profile: {
            pushToken: 'token1',
            user: { id: 'user1' }
          }
        },
        {
          profile: {
            pushToken: 'token2', 
            user: { id: 'user2' }
          }
        },
        {
          profile: {
            pushToken: 'token3',
            user: { id: 'user3' }
          }
        }
      ];

      const tokens = getMemberPushTokens(members, 'user2');
      expect(tokens).toEqual(['token1', 'token3']);
    });

    it('should filter out members without push tokens', () => {
      const members = [
        {
          profile: {
            pushToken: 'token1',
            user: { id: 'user1' }
          }
        },
        {
          profile: {
            user: { id: 'user2' }
          }
        },
        {
          profile: {
            pushToken: null,
            user: { id: 'user3' }
          }
        }
      ];

      const tokens = getMemberPushTokens(members);
      expect(tokens).toEqual(['token1']);
    });
  });

  describe('sendGroupNotification', () => {
    it('should send immediate notification for mentions', async () => {
      const notificationData = {
        groupId: 'group1',
        groupName: 'Test Group',
        messageContent: 'Hello @john',
        authorName: 'Jane',
        authorId: 'author1',
        mentions: ['john'],
        messageId: 'msg1'
      };

      await sendGroupNotification(notificationData, ['token1', 'token2']);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://exp.host/--/api/v2/push/send',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('mention')
        })
      );
    });

    it('should batch regular messages', async () => {
      const notificationData = {
        groupId: 'group1',
        groupName: 'Test Group', 
        messageContent: 'Hello everyone',
        authorName: 'Jane',
        authorId: 'author1',
        messageId: 'msg1'
      };

      await sendGroupNotification(notificationData, ['token1']);

      // Should not send immediate notification for regular messages
      expect(global.fetch).not.toHaveBeenCalled();

      // Wait a bit to ensure batching is working
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });
});