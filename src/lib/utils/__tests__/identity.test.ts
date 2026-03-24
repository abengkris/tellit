import { describe, it, expect } from 'vitest';
import { isVanitySlug, RESERVED_SLUGS } from '../identity';

describe('isVanitySlug', () => {
  it('should return false for reserved slugs', () => {
    expect(isVanitySlug('settings')).toBe(false);
    expect(isVanitySlug('notifications')).toBe(false);
    expect(isVanitySlug('og-image.png')).toBe(false);
    expect(isVanitySlug('manifest.webmanifest')).toBe(false);
    expect(isVanitySlug('verified')).toBe(false);
  });

  it('should return false for Nostr identifiers', () => {
    expect(isVanitySlug('npub180cvv07tj0jex0u22v796yv6sq496cn59v9n69s0q6m53u90j6rs9v6r9a')).toBe(false);
    expect(isVanitySlug('nprofile1qqsrh6hd60y66tgdy8l87383qrh8kywyt8m6m6m6m6m6m6m6m6m6m6m6m6m6m')).toBe(false);
  });

  it('should return true for potential vanity usernames', () => {
    expect(isVanitySlug('johndoe')).toBe(true);
    expect(isVanitySlug('alice.bob')).toBe(true);
    expect(isVanitySlug('@user')).toBe(true);
  });

  it('should return false for empty or undefined input', () => {
    expect(isVanitySlug('')).toBe(false);
    // @ts-expect-error - testing invalid input
    expect(isVanitySlug(undefined)).toBe(false);
  });
});

describe('RESERVED_SLUGS', () => {
  it('should contain all essential system routes', () => {
    const essential = [
      'settings', 'notifications', 'messages', 'bookmarks', 'api', 
      'onboarding', 'suggested', 'wallet', 'post', 'article', 
      'login', 'search', 'verified', 'error', 'not-found'
    ];
    essential.forEach(slug => {
      expect(RESERVED_SLUGS.has(slug)).toBe(true);
    });
  });

  it('should contain all essential static files', () => {
    const essential = [
      'manifest.json', 'manifest.webmanifest', 'favicon.ico', 
      'robots.txt', 'sitemap.xml', 'og-image.png'
    ];
    essential.forEach(slug => {
      expect(RESERVED_SLUGS.has(slug)).toBe(true);
    });
  });
});
