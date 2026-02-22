/**
 * Module Registry — Self-describing, pluggable feature modules.
 * ─────────────────────────────────────────────────────────────
 * Each module declares what it provides (views, commands, data types).
 * The platform discovers capabilities at runtime — no hard-wiring.
 *
 * Usage:
 *   moduleRegistry.register({
 *     id: 'valuations',
 *     name: 'שומות',
 *     commands: [...],
 *     views: [...],
 *   })
 */

import type { ViewId } from '@/lib/viewRegistry'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'

// ── Command definition ────────────────────────────────────────────
export interface PlatformCommand {
  /** Unique key, e.g. 'property.create' */
  id: string
  /** Hebrew display label */
  label: string
  /** Search keywords (Hebrew + English) */
  keywords: string[]
  /** Phosphor icon component */
  icon?: PhosphorIcon
  /** Which group in the command palette */
  group: 'navigation' | 'action' | 'data' | 'settings' | 'ai'
  /** Keyboard shortcut (e.g. 'mod+shift+n') */
  shortcut?: string
  /** Execute the command. Return false to keep palette open. */
  execute: () => void | false
  /** Optional: only show when predicate is true */
  when?: () => boolean
}

// ── Module definition ─────────────────────────────────────────────
export interface PlatformModule {
  /** Unique module ID */
  id: string
  /** Human-readable Hebrew name */
  name: string
  /** Short Hebrew description */
  description?: string
  /** Which views belong to this module */
  views?: ViewId[]
  /** Commands this module contributes */
  commands?: PlatformCommand[]
  /** Called once when module is loaded */
  onInit?: () => void | Promise<void>
  /** Called when module is torn down (HMR) */
  onDestroy?: () => void
}

// ── Registry implementation ───────────────────────────────────────
class ModuleRegistryImpl {
  private modules = new Map<string, PlatformModule>()
  private commands = new Map<string, PlatformCommand>()

  register(module: PlatformModule): void {
    if (this.modules.has(module.id)) {
      // HMR: unregister first
      this.unregister(module.id)
    }
    this.modules.set(module.id, module)
    module.commands?.forEach(cmd => this.commands.set(cmd.id, cmd))
    module.onInit?.()
  }

  unregister(moduleId: string): void {
    const mod = this.modules.get(moduleId)
    if (!mod) return
    mod.commands?.forEach(cmd => this.commands.delete(cmd.id))
    mod.onDestroy?.()
    this.modules.delete(moduleId)
  }

  getModule(id: string): PlatformModule | undefined {
    return this.modules.get(id)
  }

  getAllModules(): PlatformModule[] {
    return Array.from(this.modules.values())
  }

  getAllCommands(): PlatformCommand[] {
    return Array.from(this.commands.values()).filter(
      cmd => !cmd.when || cmd.when()
    )
  }

  /** Search commands by query (matches label, keywords, id) */
  searchCommands(query: string): PlatformCommand[] {
    if (!query.trim()) return this.getAllCommands()
    const q = query.toLowerCase().trim()
    return this.getAllCommands().filter(cmd =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.id.toLowerCase().includes(q) ||
      cmd.keywords.some(k => k.toLowerCase().includes(q))
    )
  }

  /** Find which module owns a given view */
  findModuleForView(viewId: ViewId): PlatformModule | undefined {
    for (const mod of this.modules.values()) {
      if (mod.views?.includes(viewId)) return mod
    }
    return undefined
  }

  clear(): void {
    for (const mod of this.modules.values()) {
      mod.onDestroy?.()
    }
    this.modules.clear()
    this.commands.clear()
  }
}

/** Singleton module registry */
export const moduleRegistry = new ModuleRegistryImpl()
