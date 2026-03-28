import { describe, it, expect } from 'vitest';
import { validateUsernameRegistration, normalizeUsername, BloomFilter } from '../username-validator';

describe('Username Validator', () => {
  describe('normalizeUsername', () => {
    it('should normalize leetspeak characters', () => {
      expect(normalizeUsername('4dm1n')).toBe('admin');
      expect(normalizeUsername('j0k0w1')).toBe('jokowi');
      expect(normalizeUsername('b1tc01n')).toBe('bitcoin');
      expect(normalizeUsername('p3g4d4i4n')).toBe('pegadaian');
      expect(normalizeUsername('v4n1ty')).toBe('uanity'); // v is mapped to u
    });

    it('should handle mixed case and special characters', () => {
      expect(normalizeUsername('AdMiN')).toBe('admin');
      expect(normalizeUsername('!@#$')).toBe('iass'); // ! -> i, @ -> a, $ -> s, # -> #
    });
  });

  describe('BloomFilter', () => {
    it('should add and check for elements', () => {
      const bf = new BloomFilter(100, 3);
      bf.add('hello');
      expect(bf.has('hello')).toBe(true);
      expect(bf.has('world')).toBe(false);
    });

    it('should serialize and deserialize', () => {
      const bf = new BloomFilter(100, 3);
      bf.add('test');
      const data = bf.serialize();
      const bf2 = BloomFilter.deserialize(data, 100, 3);
      expect(bf2.has('test')).toBe(true);
      expect(bf2.has('other')).toBe(false);
    });
  });

  describe('validateUsernameRegistration', () => {
    it('should allow valid usernames', () => {
      expect(validateUsernameRegistration('my_name123').valid).toBe(true);
    });

    it('should reject too short or too long usernames', () => {
      expect(validateUsernameRegistration('').valid).toBe(false);
      expect(validateUsernameRegistration('a'.repeat(21)).valid).toBe(false);
    });

    it('should reject invalid characters', () => {
      expect(validateUsernameRegistration('name!').valid).toBe(false);
      expect(validateUsernameRegistration('name space').valid).toBe(false);
    });

    it('should reject reserved system names', () => {
      expect(validateUsernameRegistration('admin').valid).toBe(false);
      expect(validateUsernameRegistration('4dm1n').valid).toBe(false);
      expect(validateUsernameRegistration('root').valid).toBe(false);
    });

    it('should reject brands and public figures', () => {
      expect(validateUsernameRegistration('google').valid).toBe(false);
      expect(validateUsernameRegistration('jokowi').valid).toBe(false);
      expect(validateUsernameRegistration('elonmusk').valid).toBe(false);
    });

    it('should reject profanity', () => {
      expect(validateUsernameRegistration('porn').valid).toBe(false);
      expect(validateUsernameRegistration('anjing').valid).toBe(false);
    });

    it('should reject high-risk substrings', () => {
      expect(validateUsernameRegistration('myadmin').valid).toBe(false);
      expect(validateUsernameRegistration('official_user').valid).toBe(false);
    });
  });
});
