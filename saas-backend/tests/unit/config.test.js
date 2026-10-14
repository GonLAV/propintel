'use strict';

/* eslint-disable global-require */

describe('security-sensitive configuration', () => {
  const originalTrustProxy = process.env.TRUST_PROXY;
  const originalEncryptionKey = process.env.ENCRYPTION_KEY;

  afterEach(() => {
    if (originalTrustProxy === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = originalTrustProxy;
    process.env.ENCRYPTION_KEY = originalEncryptionKey;
    jest.resetModules();
  });

  test('does not trust a proxy by default', () => {
    delete process.env.TRUST_PROXY;
    jest.resetModules();
    expect(require('../../src/config').trustProxy).toBe(false);
  });

  test.each(['-1', '256', 'proxy.example.com', '10.0.0.1/99'])(
    'rejects unsafe TRUST_PROXY value %s',
    (value) => {
      process.env.TRUST_PROXY = value;
      jest.resetModules();
      expect(() => require('../../src/config')).toThrow(/TRUST_PROXY/);
    },
  );

  test('accepts an explicit proxy CIDR allowlist', () => {
    process.env.TRUST_PROXY = '127.0.0.1,10.0.0.0/8';
    jest.resetModules();
    expect(require('../../src/config').trustProxy).toEqual(['127.0.0.1', '10.0.0.0/8']);
  });

  test.each([
    'a'.repeat(63),
    'g'.repeat(64),
    '0123456789abcdef'.repeat(5),
  ])('rejects malformed encryption key material', (value) => {
    process.env.ENCRYPTION_KEY = value;
    jest.resetModules();
    expect(() => require('../../src/config')).toThrow(/64 hexadecimal characters/);
  });
});
