'use strict';

const crypto = require('crypto');
const config = require('../config');

const ALGO = 'aes-256-gcm';

function getKey() {
  const hex = config.encryptionKeyHex;
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte (64 hex chars) value');
  }
  return Buffer.from(hex, 'hex');
}

// Returns "v1:iv_b64:tag_b64:ct_b64" or null if input is null/undefined.
function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined) return null;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

function decrypt(payload) {
  if (!payload) return null;
  const parts = String(payload).split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Invalid ciphertext');
  const [, ivB64, tagB64, ctB64] = parts;
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const pt = Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]);
  return pt.toString('utf8');
}

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function randomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

module.exports = { encrypt, decrypt, sha256, randomToken };
