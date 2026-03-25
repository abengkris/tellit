/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { buildPostTemplate } from '../nostrify-post';

describe('nostrify-post buildPostTemplate', () => {
  it('should build a simple post template', () => {
    const template = buildPostTemplate('hello');
    expect(template.content).toBe('hello');
    expect(template.kind).toBe(1);
  });

  it('should handle subject and content warning', () => {
    const template = buildPostTemplate('hello', { subject: 'test', contentWarning: 'nsfw' });
    expect(template.tags).toContainEqual(['subject', 'test']);
    expect(template.tags).toContainEqual(['content-warning', 'nsfw']);
  });

  it('should handle NIP-10 replies', () => {
    const parent = {
      id: 'parent-id',
      pubkey: 'parent-pubkey',
      tags: [],
    } as any;
    
    const template = buildPostTemplate('reply', { replyTo: parent });
    expect(template.tags).toContainEqual(['e', 'parent-id', '', 'root']);
    expect(template.tags).toContainEqual(['p', 'parent-pubkey']);
  });
});
