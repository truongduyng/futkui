import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, InteractionManager } from 'react-native';

interface UseChatScrollProps {
  chatItems: any[];
  hasMoreMessages: boolean;
  messageLimit: number;
  setMessageLimit: (limit: number) => void;
  groupId: string;
}

export function useChatScroll({
  chatItems,
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

  // With inverted FlatList, we don't need complex initial scroll logic
  useEffect(() => {
    if (chatItems.length > 0 && !hasInitialScrolledRef.current) {
      hasInitialScrolledRef.current = true;
      setIsNearBottom(true);
      setShowScrollToBottom(false);
      allowContentSizeScrollRef.current = false;
    }
  }, [chatItems.length]);

  // With inverted FlatList, content size changes are handled automatically
  const handleContentSizeChange = useCallback(() => {
    // No action needed with inverted + maintainVisibleContentPosition
  }, []);

  // Load older messages function
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlder || !hasMoreMessages) {
      return;
    }

    setIsLoadingOlder(true);

    try {
      // Increase limit to load more messages
      setMessageLimit(messageLimit + 100);
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      setTimeout(() => setIsLoadingOlder(false), 300);
    }
  }, [isLoadingOlder, hasMoreMessages, messageLimit, setMessageLimit]);

  // Track scroll position - adjusted for inverted FlatList
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    // With inverted FlatList, "bottom" is actually at top (contentOffset.y near 0)
    const isAtBottom = contentOffset.y <= 100;
    // "Top" for loading older messages is when we scroll down (higher contentOffset.y)
    const isNearTop = contentOffset.y + layoutMeasurement.height >= contentSize.height - 200;

    setIsNearBottom(isAtBottom);

    if (!isAtBottom) {
      setShowScrollToBottom(true);
    } else {
      setShowScrollToBottom(false);
    }

    // Trigger loading older messages when scrolled towards older content
    if (isNearTop && hasMoreMessages && !isLoadingOlder) {
      loadOlderMessages();
    }
  }, [hasMoreMessages, isLoadingOlder, loadOlderMessages]);

  // With inverted FlatList and maintainVisibleContentPosition, new messages are handled automatically
  useEffect(() => {
    const currentCount = chatItems.length;
    const lastCount = lastMessageCountRef.current;

    if (lastCount > 0 && currentCount > lastCount) {
      // For inverted list, new items (first in array) are automatically shown at bottom
      const currentFirstItemId = chatItems.length > 0 ? chatItems[0]?.id : '';
      const lastItemId = lastMessageIdRef.current;

      if (currentFirstItemId && currentFirstItemId !== lastItemId) {
        lastMessageIdRef.current = currentFirstItemId;
      }
    }

    lastMessageCountRef.current = currentCount;
  }, [chatItems]);

  // Reset state when changing groups
  useEffect(() => {
    hasInitialScrolledRef.current = false;
    setShowScrollToBottom(false);
    setIsNearBottom(true);
    lastMessageCountRef.current = 0;
    lastMessageIdRef.current = '';
    allowContentSizeScrollRef.current = true;
  }, [groupId]);

  // With inverted FlatList, no special layout handling needed
  const handleLayout = useCallback(() => {
    // No action needed with inverted + maintainVisibleContentPosition
  }, []);

  // Scroll to bottom function - for inverted FlatList, this scrolls to offset 0
  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    setShowScrollToBottom(false);
  }, []);

  return {
    flatListRef,
    showScrollToBottom,
    isNearBottom,
    isLoadingOlder,
    handleScroll,
    handleContentSizeChange,
    handleLayout,
    scrollToBottom,
    setIsNearBottom,
    setShowScrollToBottom,
  };
}
