import { beforeEach, describe, expect, it, vi } from 'vitest'

const secureStore = vi.hoisted(() => ({
  deleteItemAsync: vi.fn(),
}))

vi.mock('expo-secure-store', () => ({
  deleteItemAsync: secureStore.deleteItemAsync,
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}))

vi.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { apiBaseUrl: 'https://api.example.test' } } },
}))

import { clearAuthSession } from './api'

describe('clearAuthSession', () => {
  beforeEach(() => {
    secureStore.deleteItemAsync.mockReset()
    secureStore.deleteItemAsync.mockResolvedValue(undefined)
  })

  it('removes every stored authentication credential', async () => {
    await expect(clearAuthSession()).resolves.toBeUndefined()
    expect(secureStore.deleteItemAsync).toHaveBeenCalledTimes(3)
  })

  it('fails closed when any secure credential cannot be removed', async () => {
    secureStore.deleteItemAsync
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('keychain unavailable'))
      .mockResolvedValueOnce(undefined)

    await expect(clearAuthSession()).rejects.toThrow(
      'Could not securely clear the authentication session.',
    )
  })
})
