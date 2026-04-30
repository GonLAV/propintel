'use strict';

const { encrypt, decrypt, sha256, randomToken } = require('../../src/utils/encryption');

describe('encryption', () => {
  test('AES-GCM round-trip', () => {
    const plain = 'hello world 1234';
    const ct = encrypt(plain);
    expect(ct.startsWith('v1:')).toBe(true);
    expect(decrypt(ct)).toBe(plain);
  });

  test('decrypt rejects tampered ciphertext', () => {
    const ct = encrypt('secret');
    const tampered = ct.slice(0, -2) + (ct.endsWith('aa') ? 'bb' : 'aa');
    expect(() => decrypt(tampered)).toThrow();
  });

  test('sha256 is deterministic', () => {
    expect(sha256('x')).toBe(sha256('x'));
    expect(sha256('x')).not.toBe(sha256('y'));
  });

  test('randomToken length and uniqueness', () => {
    const a = randomToken(32);
    const b = randomToken(32);
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });
});
