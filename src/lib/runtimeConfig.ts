const DEFAULT_MVP_API_BASE_URL = 'http://localhost:3001'

type SparkImportMetaEnv = ImportMeta & {
  env?: Record<string, string | undefined>
}

function readEnv(name: string): string | undefined {
  return (import.meta as SparkImportMetaEnv).env?.[name]
}

function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  const candidate = (value || fallback).trim()
  return candidate.replace(/\/+$/, '')
}

export function getMvpApiBaseUrl(): string {
  return normalizeBaseUrl(
    readEnv('VITE_MVP_API_BASE_URL') || readEnv('VITE_API_BASE_URL') || readEnv('VITE_API_URL'),
    DEFAULT_MVP_API_BASE_URL,
  )
}

export const runtimeConfig = {
  mvpApiBaseUrl: getMvpApiBaseUrl(),
}