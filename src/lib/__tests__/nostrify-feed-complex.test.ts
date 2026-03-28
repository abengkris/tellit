import { describe, it, expect } from 'vitest';
import { type NostrEvent } from '@nostrify/types';

// Mock matching logic
function matchesFilter(event: NostrEvent, filterType: string): boolean {
  if (filterType === 'all') return true;
  if (filterType === 'posts') {
    return !event.tags.some(t => t[0] === 'e' || t[0] === 'a');
  }
  if (filterType === 'replies') {
    return event.tags.some(t => t[0] === 'e' || t[0] === 'a');
  }
  return true;
}

describe('Nostrify Feed Complex Filtering', () => {
  const mockPost: NostrEvent = {
    id: '1', pubkey: 'a', kind: 1, content: 'root', tags: [], created_at: 100, sig: 's'
  };
  const mockReply: NostrEvent = {
    id: '2', pubkey: 'b', kind: 1, content: 'reply', tags: [['e', '1']], created_at: 110, sig: 's'
  };

  it('should filter posts correctly', () => {
    expect(matchesFilter(mockPost, 'posts')).toBe(true);
    expect(matchesFilter(mockReply, 'posts')).toBe(false);
  });

  it('should filter replies correctly', () => {
    expect(matchesFilter(mockPost, 'replies')).toBe(false);
    expect(matchesFilter(mockReply, 'replies')).toBe(true);
  });
});
