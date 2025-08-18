import { useMemo } from "react";

interface UseChatDataProps {
  messagesData: any;
  groupId: string;
  messageLimit: number;
}

export function useChatData({ messagesData, groupId, messageLimit }: UseChatDataProps) {
  const messages = useMemo(() => messagesData?.messages || [], [messagesData?.messages]);
  
  const files = useMemo(() => messagesData?.$files || [], [messagesData?.$files]);

  const fileUrlMap = useMemo(() => {
    const map = new Map();
    files.forEach((file) => {
      map.set(file.id, file.url);
    });
    return map;
  }, [files]);

  const polls = useMemo(() => {
    return messages
      .filter((message) => message.poll)
      .map((message) => ({
        ...message.poll,
        message: {
          group: {
            id: groupId,
          },
        },
      }));
  }, [messages, groupId]);

  const matches = useMemo(() => {
    return messages
      .filter((message) => message.match)
      .map((message) => message.match!)
      .filter((match): match is NonNullable<typeof match> => match !== null && match !== undefined);
  }, [messages]);

  const hasMoreMessages = messages.length >= messageLimit;

  const getFileUrl = (fileId: string) => {
    return fileUrlMap.get(fileId);
  };

  return {
    messages,
    files,
    fileUrlMap,
    polls,
    matches,
    hasMoreMessages,
    getFileUrl,
  };
}