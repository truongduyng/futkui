interface ContentFilterResult {
  isBlocked: boolean;
  filteredContent: string;
  reason?: string;
}

const BLOCKED_WORDS = [
  // English profanity
  'fuck', 'shit', 'damn', 'hell', 'bitch', 'ass', 'bastard', 'crap',
  // English hate speech
  'nazi', 'terrorist', 'kill yourself', 'kys',
  // Vietnamese profanity
  'đụ', 'má', 'cặc', 'lồn', 'địt', 'đéo', 'mẹ', 'chó', 'súc vật', 'con chó',
  'đĩ', 'gái điếm', 'thằng ngu', 'con ngu', 'ngu si', 'óc chó', 'não cá vàng',
  'thằng khốn', 'con khốn', 'đồ khốn', 'mày', 'tao', 'đồ chó', 'con đĩ',
  'thằng đần', 'con đần', 'đồ đần', 'chết tiệt', 'đồ ngu', 'ngáo', 'điên',
  // Vietnamese hate speech
  'giết', 'chết đi', 'tự tử', 'khủng bố',
  // Spam indicators
  'viagra', 'casino', 'lottery', 'winner', 'congratulations you won',
  'trúng thưởng', 'casino', 'cờ bạc', 'đánh bạc',
];

const INAPPROPRIATE_PATTERNS = [
  // English patterns
  /\b(fuck|shit|damn|hell|bitch|ass|bastard|crap)\b/gi,
  /\b(nazi|terrorist)\b/gi,
  /\b(kill\s+yourself|kys)\b/gi,
  /\b(viagra|casino|lottery)\b/gi,
  /\b(congratulations\s+you\s+won)\b/gi,
  // Vietnamese patterns
  /\b(đụ|má|cặc|lồn|địt|đéo|mẹ|đĩ)\b/gi,
  /\b(thằng\s+ngu|con\s+ngu|thằng\s+khốn|con\s+khốn|đồ\s+khốn)\b/gi,
  /\b(thằng\s+đần|con\s+đần|đồ\s+đần|chết\s+tiệt|đồ\s+ngu)\b/gi,
  /\b(súc\s+vật|con\s+chó|đồ\s+chó|gái\s+điếm|con\s+đĩ)\b/gi,
  /\b(óc\s+chó|não\s+cá\s+vàng|ngu\s+si)\b/gi,
  /\b(chết\s+đi|tự\s+tử|khủng\s+bố|giết)\b/gi,
  /\b(trúng\s+thưởng|cờ\s+bạc|đánh\s+bạc)\b/gi,
];

export function filterContent(content: string): ContentFilterResult {
  if (!content || typeof content !== 'string') {
    return {
      isBlocked: false,
      filteredContent: content,
    };
  }

  const trimmedContent = content.trim();

  // Check if content is too long (spam prevention)
  if (trimmedContent.length > 2000) {
    return {
      isBlocked: true,
      filteredContent: '',
      reason: 'Message too long',
    };
  }

  // Replace blocked words with ***
  let filteredContent = trimmedContent;

  for (const word of BLOCKED_WORDS) {
    const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (regex.test(filteredContent)) {
      filteredContent = filteredContent.replace(regex, '***');
    }
  }

  // Apply inappropriate patterns filtering (already have filteredContent from above)
  for (const pattern of INAPPROPRIATE_PATTERNS) {
    if (pattern.test(filteredContent)) {
      filteredContent = filteredContent.replace(pattern, '***');
    }
  }

  return {
    isBlocked: false,
    filteredContent: filteredContent,
  };
}

export function isContentAppropriate(content: string): boolean {
  const result = filterContent(content);
  return !result.isBlocked;
}
