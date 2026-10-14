import * as Phosphor from '@phosphor-icons/react'
import { moduleRegistry, type PlatformCommand } from '@/core/moduleRegistry'
import { bus } from '@/core/eventBus'
import { VIEW_DEFINITIONS, VIEW_GROUPS, type ViewId } from '@/lib/viewRegistry'

const { MagnifyingGlass, Plus, Robot } = Phosphor

function nav(id: ViewId): PlatformCommand {
  const definition = VIEW_DEFINITIONS[id]
  return {
    id: `nav.${id}`,
    label: definition.label,
    keywords: [definition.label, ...definition.keywords],
    icon: definition.icon,
    group: 'navigation',
    execute: () => bus.emit('nav:navigate', id),
  }
}

export function registerCoreModules() {
  for (const group of VIEW_GROUPS) {
    moduleRegistry.register({
      id: group.id,
      name: group.title,
      views: group.views,
      commands: group.views.map(nav),
    })
  }

  moduleRegistry.register({
    id: 'global-actions',
    name: 'פעולות',
    commands: [
      {
        id: 'action.new-property',
        label: 'שומה חדשה',
        keywords: ['חדש', 'נכס', 'שומה', 'הוסף', 'new', 'create'],
        icon: Plus,
        group: 'action',
        shortcut: 'Ctrl+Shift+N',
        execute: () => bus.emit('property:createRequested'),
      },
      {
        id: 'ai.market-summary',
        label: 'AI — סיכום שוק',
        keywords: ['AI', 'סיכום', 'שוק', 'מגמות'],
        icon: Robot,
        group: 'ai',
        execute: () => bus.emit('nav:navigate', 'ai-insights'),
      },
      {
        id: 'ai.search-transactions',
        label: 'חיפוש עסקאות ארצי',
        keywords: ['חיפוש', 'עסקאות', 'ישראל', 'נדלן'],
        icon: MagnifyingGlass,
        group: 'data',
        execute: () => bus.emit('nav:navigate', 'transactions-map'),
      },
    ],
  })
}
