import { describe, it, expect } from 'vitest';
import { buildPostTemplate } from '../actions/nostrify-post';
import { buildReactionTemplate } from '../actions/nostrify-reaction';

describe('Nostrify Kind 1 & 7 Migration', () => {
  describe('Kind 1 (Notes)', () => {
    it('should build a simple note template', () => {
      const template = buildPostTemplate('Hello world');
      expect(template.kind).toBe(1);
      expect(template.content).toBe('Hello world');
    });

    it('should handle subject and tags', () => {
      const template = buildPostTemplate('Hello', { 
        subject: 'Greetings',
        tags: [['t', 'test']]
      });
      expect(template.tags).toContainEqual(['subject', 'Greetings']);
      expect(template.tags).toContainEqual(['t', 'test']);
    });

    it('should handle replies with NIP-10 tags', () => {
      const parent = {
        id: 'parent-id',
        pubkey: 'parent-pubkey',
        kind: 1,
        tags: []
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const template = buildPostTemplate('Reply', { replyTo: parent as any });
      expect(template.tags).toContainEqual(['e', 'parent-id', '', 'root']);
      expect(template.tags).toContainEqual(['p', 'parent-pubkey']);
    });
  });

  describe('Kind 7 (Reactions)', () => {
    it('should build a simple like reaction', () => {
      const target = {
        id: 'target-id',
        pubkey: 'target-pubkey',
        kind: 1
      };
      const template = buildReactionTemplate(target, '+');
      expect(template.kind).toBe(7);
      expect(template.content).toBe('+');
      expect(template.tags).toContainEqual(['e', 'target-id']);
      expect(template.tags).toContainEqual(['p', 'target-pubkey']);
      expect(template.tags).toContainEqual(['k', '1']);
    });

    it('should handle custom emoji reactions', () => {
      const target = {
        id: 'target-id',
        pubkey: 'target-pubkey',
        kind: 1
      };
      const template = buildReactionTemplate(target, ':heart:', 'https://example.com/heart.png');
      expect(template.content).toBe(':heart:');
      expect(template.tags).toContainEqual(['emoji', 'heart', 'https://example.com/heart.png']);
    });
  });
});
