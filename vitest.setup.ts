import '@testing-library/jest-dom';
import { vi } from 'vitest';
import crypto from 'node:crypto';

// Add Web Crypto support for tests
if (!global.crypto) {
  Object.defineProperty(global, 'crypto', {
    value: crypto.webcrypto,
  });
}

// No global NDK mock anymore because we'll use NDK Test Utils.
// But we might need to mock browser-only things if necessary.

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (index: number) => Object.keys(store)[index] || null,
    length: 0,
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});
