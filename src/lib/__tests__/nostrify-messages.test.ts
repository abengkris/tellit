import { describe, it, expect, vi } from 'vitest';
import { buildRumor, wrapMessage } from '../actions/nostrify-actions';

describe('Nostrify NIP-17 Messages', () => {
  const senderPubkey = 'sender-pubkey';
  const recipientPubkey = 'recipient-pubkey';

  describe('buildRumor', () => {
    it('should build a Kind 14 rumor', () => {
      const rumor = buildRumor('Hello', recipientPubkey);
      expect(rumor.kind).toBe(14);
      expect(rumor.content).toBe('Hello');
      expect(rumor.tags).toContainEqual(['p', recipientPubkey]);
    });
  });

  describe('wrapMessage', () => {
    it('should wrap a message into a Kind 1059 Gift Wrap', async () => {
      const mockSigner = {
        getPublicKey: vi.fn().mockResolvedValue(senderPubkey),
        signEvent: vi.fn().mockImplementation(async (e) => ({ ...e, id: 'event-id', sig: 'sig', pubkey: senderPubkey })),
        nip44: {
          encrypt: vi.fn().mockResolvedValue('encrypted-content'),
          decrypt: vi.fn(),
        },
      };

      const rumor = buildRumor('Hello', recipientPubkey);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const giftWrap = await wrapMessage(rumor, recipientPubkey, mockSigner as unknown as any);

      expect(giftWrap.kind).toBe(1059);
      expect(giftWrap.tags).toContainEqual(['p', recipientPubkey]);
      expect(giftWrap.content).toBe('encrypted-content');
      expect(mockSigner.nip44.encrypt).toHaveBeenCalled();
    });
  });
});
