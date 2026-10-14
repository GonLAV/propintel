import { useMemo, useState } from 'react'
import { VIEW_DEFINITIONS, VIEW_GROUPS, type ViewId } from '@/lib/viewRegistry'
import { House, MagnifyingGlass, X } from '@phosphor-icons/react'
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter
} from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface AppSidebarProps {
  activeView: ViewId
  onNavigate: (view: ViewId) => void
}

export function AppSidebar({ activeView, onNavigate }: AppSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const menuItems = useMemo(() => VIEW_GROUPS.map(group => ({
    title: group.title,
    items: group.views.map(id => ({ id, ...VIEW_DEFINITIONS[id] })),
  })), [])

  const filteredMenuItems = useMemo(() => {
    if (!searchQuery.trim()) return menuItems

    const query = searchQuery.toLowerCase().trim()
    
    return menuItems
      .map(group => ({
        ...group,
        items: group.items.filter(item => 
          item.label.toLowerCase().includes(query) ||
          item.keywords?.some(keyword => keyword.toLowerCase().includes(query))
        )
      }))
      .filter(group => group.items.length > 0)
  }, [menuItems, searchQuery])

  return (
    <Sidebar collapsible="icon" side="right" className="border-l border-black/[0.08] bg-white">
      <SidebarHeader className="px-4 py-4.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
            <House weight="fill" className="text-white" size={18} />
          </div>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <h2 className="font-semibold text-[15px] tracking-tight text-[#1d1d1f]">
              AppraisalPro
            </h2>
            <p className="text-[12px] text-black/40">
              מערכת שמאות מקצועית
            </p>
          </div>
        </div>

        <div className="mt-3 group-data-[collapsible=icon]:hidden">
          <div className="relative">
            <MagnifyingGlass 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" 
              size={16} 
            />
            <Input
              type="text"
              placeholder="חיפוש..."
              aria-label="חיפוש ניווט"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-xl border-black/8 bg-black/[0.03] pr-9 pl-3 text-[13px] text-[#1d1d1f] placeholder:text-black/30 shadow-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary/30 transition-colors"
            />
            {searchQuery && (
                <Button
                variant="ghost"
                size="icon"
                aria-label="נקה חיפוש"
                  className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearchQuery('')}
              >
                <X size={14} className="text-black/30" />
              </Button>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 border-t border-black/[0.06]">
        <ScrollArea className="h-full">
          {filteredMenuItems.length === 0 ? (
            <div className="text-center py-12 px-4 group-data-[collapsible=icon]:hidden">
              <MagnifyingGlass size={28} className="text-black/20 mx-auto mb-2" weight="duotone" />
              <p className="text-sm text-black/35">
                לא נמצאו תוצאות
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMenuItems.map((group) => (
                <SidebarGroup key={group.title}>
                  <SidebarGroupLabel className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-black/30 group-data-[collapsible=icon]:hidden">
                    {group.title}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon
                        const isActive = activeView === item.id
                        
                        return (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              onClick={() => {
                                onNavigate(item.id)
                                setSearchQuery('')
                              }}
                              isActive={isActive}
                              aria-current={isActive ? 'page' : undefined}
                              className={
                                `relative h-9 w-full rounded-xl px-3 transition-all duration-150 ` +
                                (isActive
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'text-[#6e6e73] hover:bg-black/[0.04] hover:text-[#1d1d1f]')
                              }
                              tooltip={item.label}
                            >
                              {isActive && (
                                <span
                                  className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                                  aria-hidden
                                />
                              )}
                              <Icon 
                                size={18} 
                                weight={isActive ? 'fill' : 'regular'}
                              />
                              <span className="group-data-[collapsible=icon]:hidden text-sm leading-5">
                                {item.label}
                              </span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </div>
          )}
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-t border-black/[0.06] p-3 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-between text-[11px] text-black/30">
          <span>v2.0</span>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
            <span>מקוון</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
