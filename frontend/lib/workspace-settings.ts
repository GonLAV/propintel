export type WorkspaceSettings = {
  company: string
  criticalValuationAlerts: boolean
}

export const workspaceSettingsStorageKey = 'propintel.workspace-settings.v1'
export const defaultWorkspaceSettings: WorkspaceSettings = {
  company: 'Northline Capital',
  criticalValuationAlerts: true,
}

type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>

export function loadWorkspaceSettings(storage: StorageAdapter): WorkspaceSettings {
  const stored = storage.getItem(workspaceSettingsStorageKey)
  if (!stored) return defaultWorkspaceSettings

  try {
    const parsed = JSON.parse(stored) as Partial<WorkspaceSettings>
    return {
      company: normalizeCompany(parsed.company),
      criticalValuationAlerts: typeof parsed.criticalValuationAlerts === 'boolean'
        ? parsed.criticalValuationAlerts
        : defaultWorkspaceSettings.criticalValuationAlerts,
    }
  } catch {
    return defaultWorkspaceSettings
  }
}

export function saveWorkspaceSettings(storage: StorageAdapter, settings: WorkspaceSettings) {
  const normalized = {
    company: normalizeCompany(settings.company),
    criticalValuationAlerts: settings.criticalValuationAlerts,
  }
  storage.setItem(workspaceSettingsStorageKey, JSON.stringify(normalized))
  return normalized
}

function normalizeCompany(value: unknown) {
  if (typeof value !== 'string') return defaultWorkspaceSettings.company
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120)
  return cleaned || defaultWorkspaceSettings.company
}
