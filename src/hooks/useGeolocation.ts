/**
 * useGeolocation — GPS hook with caching, permission handling, and
 *                  reverse geocoding for Israeli addresses.
 * ────────────────────────────────────────────────────────────────
 * Returns the user's coordinates and a human-readable Hebrew address.
 *
 * Usage:
 *   const { position, address, loading, error, refresh } = useGeolocation()
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createLogger } from '@/lib/logger'

const logger = createLogger('Geolocation')

export interface GeoPosition {
  lat: number
  lng: number
  accuracy: number          // meters
  timestamp: number
}

export interface GeoAddress {
  /** Full formatted address in Hebrew */
  formatted: string
  street?: string
  houseNumber?: string
  city?: string
  neighborhood?: string
}

interface UseGeolocationState {
  position: GeoPosition | null
  address: GeoAddress | null
  loading: boolean
  error: string | null
  /** Supported by browser? */
  supported: boolean
}

interface UseGeolocationOptions {
  /** Auto-request on mount? Default: false */
  auto?: boolean
  /** Max age for cached position (ms). Default: 5 min */
  maxAge?: number
  /** High accuracy (GPS vs cell tower). Default: true */
  highAccuracy?: boolean
  /** Timeout for position request (ms). Default: 15 s */
  timeout?: number
  /** Reverse-geocode the position? Default: true */
  reverseGeocode?: boolean
}

const GEO_CACHE_KEY = 'geo:lastPosition'

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    auto = false,
    maxAge = 5 * 60_000,
    highAccuracy = true,
    timeout = 15_000,
    reverseGeocode = true,
  } = options

  const [state, setState] = useState<UseGeolocationState>({
    position: null,
    address: null,
    loading: false,
    error: null,
    supported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
  })

  const abortRef = useRef(false)

  // ── Reverse-geocode via Nominatim (free, no key) ────────────────
  const geocode = useCallback(async (lat: number, lng: number): Promise<GeoAddress | null> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=he&zoom=18&addressdetails=1`
      const res = await fetch(url, { headers: { 'User-Agent': 'AppraisalPro/1.0' } })
      if (!res.ok) return null
      const data = await res.json()
      const addr = data.address ?? {}
      return {
        formatted: data.display_name ?? '',
        street: addr.road ?? addr.pedestrian ?? addr.highway ?? undefined,
        houseNumber: addr.house_number ?? undefined,
        city: addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? undefined,
        neighborhood: addr.suburb ?? addr.neighbourhood ?? undefined,
      }
    } catch (err) {
      logger.warn('[geo] Reverse-geocode failed', err)
      return null
    }
  }, [])

  // ── Request position ────────────────────────────────────────────
  const refresh = useCallback(() => {
    if (!state.supported) {
      setState(s => ({ ...s, error: 'הדפדפן אינו תומך בשירותי מיקום' }))
      return
    }

    abortRef.current = false
    setState(s => ({ ...s, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (abortRef.current) return
        const position: GeoPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        }

        // Cache
        try {
          sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(position))
        } catch { /* ignore quota errors */ }

        let address: GeoAddress | null = null
        if (reverseGeocode) {
          address = await geocode(position.lat, position.lng)
        }

        if (!abortRef.current) {
          setState(s => ({ ...s, position, address, loading: false, error: null }))
        }
      },
      (err) => {
        if (abortRef.current) return
        const messages: Record<number, string> = {
          1: 'גישה למיקום נדחתה — יש לאשר הרשאה בדפדפן',
          2: 'לא ניתן לקבוע מיקום — בדוק חיבור GPS',
          3: 'תם הזמן הקצוב לקבלת מיקום',
        }
        setState(s => ({
          ...s,
          loading: false,
          error: messages[err.code] ?? 'שגיאת מיקום לא ידועה',
        }))
      },
      {
        enableHighAccuracy: highAccuracy,
        maximumAge: maxAge,
        timeout,
      },
    )
  }, [state.supported, highAccuracy, maxAge, timeout, reverseGeocode, geocode])

  // ── Try to load from cache on mount ─────────────────────────────
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(GEO_CACHE_KEY)
      if (cached) {
        const pos = JSON.parse(cached) as GeoPosition
        if (Date.now() - pos.timestamp < maxAge) {
          setState(s => ({ ...s, position: pos }))
        }
      }
    } catch { /* ignore */ }
  }, [maxAge])

  // ── Auto-request on mount if asked ──────────────────────────────
  useEffect(() => {
    if (auto) refresh()
    return () => { abortRef.current = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto])

  return { ...state, refresh }
}
