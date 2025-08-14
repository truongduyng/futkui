import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList } from 'react-native';

interface UseChatScrollProps {
  chatItems: any[];
  isLoadingMessages: boolean;
  hasMoreMessages: boolean;
  messageLimit: number;
  setMessageLimit: (limit: number) => void;
  groupId: string;
}

export function useChatScroll({
  chatItems,
  isLoadingMessages,
  hasMoreMessages,
  messageLimit,
  setMessageLimit,
  groupId,
}: UseChatScrollProps) {
  const flatListRef = useRef<FlatList>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const hasInitialScrolledRef = useRef(false);
  const lastMessageCountRef = useRef(0);
  const lastMessageIdRef = useRef<string>('');
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const allowContentSizeScrollRef = useRef(true);

  // Initial scroll to bottom on first load
  useEffect(() => {
    if (!isLoadingMessages && chatItems.length > 0 && !hasInitialScrolledRef.current) {
      // Multiple attempts with increasing delays to ensure content is rendered
      const scrollAttempts = [50, 150, 300, 500];

      scrollAttempts.forEach((delay, index) => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
          // Mark as scrolled only after the last attempt
          if (index === scrollAttempts.length - 1) {
            hasInitialScrolledRef.current = true;
            // Ensure we're marked as at bottom after initial scroll
            setIsNearBottom(true);
            setShowScrollToBottom(false);
            // Disable content size scroll after initial load is complete
            setTimeout(() => {
              allowContentSizeScrollRef.current = false;
            }, 500);
          }
        }, delay);
      });
    }
  }, [isLoadingMessages, chatItems.length]);

  // Additional scroll trigger when content size changes - only during initial load
  const handleContentSizeChange = useCallback(() => {
    // Only scroll on content size change during initial load, not for updates like reactions
    if (allowContentSizeScrollRef.current && !hasInitialScrolledRef.current && chatItems.length > 0) {
      // Immediate scroll when content size changes during initial load
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      });
    }
    // Do nothing after initial load - prevents reactions from causing scroll
  }, [chatItems.length]);

  // Load older messages function
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlder || !hasMoreMessages) {
      return;
    }

    setIsLoadingOlder(true);

    try {
      // Increase limit to load more messages
      setMessageLimit(messageLimit + 500);
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      setTimeout(() => setIsLoadingOlder(false), 300);
    }
  }, [isLoadingOlder, hasMoreMessages, messageLimit, setMessageLimit]);

  // Track scroll position and show/hide scroll to bottom button
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
    const isNearTop = contentOffset.y < 200; // Within 200px of top

    setIsNearBottom(isAtBottom);

    if (!isAtBottom) {
      // User scrolled up, show scroll to bottom button
      setShowScrollToBottom(true);
    } else if (isAtBottom) {
      // User is at bottom, hide button
      setShowScrollToBottom(false);
    }

    // Trigger loading older messages when near top
    if (isNearTop && hasMoreMessages && !isLoadingOlder) {
      loadOlderMessages();
    }
  }, [hasMoreMessages, isLoadingOlder, loadOlderMessages]);

  // Handle new items (messages and matches - only scroll for truly new items, not reactions)
  useEffect(() => {
    const currentCount = chatItems.length;
    const lastCount = lastMessageCountRef.current;

    // Only trigger scroll behavior when item count actually increases
    if (lastCount > 0 && currentCount > lastCount) {
      const currentLastItemId = chatItems.length > 0 ? chatItems[chatItems.length - 1]?.id : '';
      const lastItemId = lastMessageIdRef.current;

      // Double check that we have a new item with a different ID
      if (currentLastItemId && currentLastItemId !== lastItemId) {
        // Check isNearBottom at the time of execution, not as a dependency
        if (isNearBottom) {
          // User is near bottom, scroll to new item without stealing focus
          requestAnimationFrame(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          });
        }
        // Update the last item ID only when we have a genuinely new item
        lastMessageIdRef.current = currentLastItemId;
      }
    }

    lastMessageCountRef.current = currentCount;
  }, [chatItems.length, isNearBottom]);

  // Reset state when changing groups
  useEffect(() => {
    hasInitialScrolledRef.current = false;
    setShowScrollToBottom(false);
    setIsNearBottom(true);
    lastMessageCountRef.current = 0;
    lastMessageIdRef.current = '';
    allowContentSizeScrollRef.current = true;
  }, [groupId]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowScrollToBottom(false);
  }, []);

  return {
    flatListRef,
    showScrollToBottom,
    isNearBottom,
    isLoadingOlder,
    handleScroll,
    handleContentSizeChange,
    scrollToBottom,
    setIsNearBottom,
    setShowScrollToBottom,
  };
}
