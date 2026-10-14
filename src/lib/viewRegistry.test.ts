import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VIEW_GROUPS, VIEW_IDS } from '@/lib/viewRegistry'
import { moduleRegistry } from '@/core/moduleRegistry'
import { registerCoreModules } from '@/core/modules'
import { bus } from '@/core/eventBus'

describe('view discovery and commands', () => {
  beforeEach(() => {
    moduleRegistry.clear()
    bus.clear()
  })

  it('places every registered view in exactly one discoverable group', () => {
    const grouped = VIEW_GROUPS.flatMap(group => group.views)
    expect(grouped).toHaveLength(VIEW_IDS.length)
    expect(new Set(grouped).size).toBe(VIEW_IDS.length)
    expect(new Set(grouped)).toEqual(new Set(VIEW_IDS))
  })

  it('registers a navigation command for every view', () => {
    registerCoreModules()
    const navigationIds = moduleRegistry.getAllCommands()
      .filter(command => command.group === 'navigation')
      .map(command => command.id)
    expect(navigationIds).toEqual(expect.arrayContaining(VIEW_IDS.map(id => `nav.${id}`)))
  })

  it('opens property creation from the new appraisal command', () => {
    const listener = vi.fn()
    bus.on('property:createRequested', listener)
    registerCoreModules()
    moduleRegistry.getAllCommands().find(command => command.id === 'action.new-property')?.execute()
    expect(listener).toHaveBeenCalledOnce()
  })
})
