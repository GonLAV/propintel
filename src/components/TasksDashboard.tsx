import { useMemo, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { CalendarBlank, CheckCircle, Clock, DotsThreeOutline, Funnel, MagnifyingGlass, NotePencil, Plus, Tag } from '@phosphor-icons/react'

type TaskStatus = 'todo' | 'in-progress' | 'done' | 'blocked'
type Priority = 'low' | 'medium' | 'high' | 'urgent'

interface TaskItem {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  dueDate?: string
  tags: string[]
  projectId?: string
  clientId?: string
  createdAt: string
  updatedAt: string
}

const statusLabels: Record<TaskStatus, string> = {
  todo: 'לביצוע',
  'in-progress': 'בתהליך',
  done: 'בוצע',
  blocked: 'חסום'
}

const priorityLabels: Record<Priority, string> = {
  low: 'נמוכה',
  medium: 'רגילה',
  high: 'גבוהה',
  urgent: 'דחוף'
}

export function TasksDashboard() {
  const [tasks, setTasks] = useKV<TaskItem[]>('tasks', [])
  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<Priority>('medium')

  const filtered = useMemo(() => {
    const list = tasks || []
    return list.filter(t => {
      const matchesQuery = query.trim()
        ? (t.title + ' ' + (t.description || '') + ' ' + t.tags.join(' '))
            .toLowerCase()
            .includes(query.trim().toLowerCase())
        : true
      const matchesStatus = filterStatus === 'all' ? true : t.status === filterStatus
      const matchesPriority = filterPriority === 'all' ? true : t.priority === filterPriority
      return matchesQuery && matchesStatus && matchesPriority
    })
  }, [tasks, query, filterStatus, filterPriority])

  const addTask = () => {
    const title = newTitle.trim()
    if (!title) {
      toast.error('נא לתת שם למשימה')
      return
    }
    const now = new Date().toISOString()
    const item: TaskItem = {
      id: String(Date.now()),
      title,
      status: 'todo',
      priority: newPriority,
      tags: [],
      createdAt: now,
      updatedAt: now
    }
    setTasks((cur) => [ ...(cur || []), item ])
    setNewTitle('')
    toast.success('משימה נוספה')
  }

  const updateStatus = (id: string, status: TaskStatus) => {
    setTasks((cur) => (cur || []).map(t => t.id === id ? { ...t, status, updatedAt: new Date().toISOString() } : t))
  }

  const updatePriority = (id: string, priority: Priority) => {
    setTasks((cur) => (cur || []).map(t => t.id === id ? { ...t, priority, updatedAt: new Date().toISOString() } : t))
  }

  const removeTask = (id: string) => {
    setTasks((cur) => (cur || []).filter(t => t.id !== id))
    toast.success('משימה הוסרה')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
          <NotePencil className="w-6 h-6 text-primary" weight="duotone" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">משימות</h1>
          <p className="text-muted-foreground">לוח משימות חכם עם סטטוס, עדיפויות ותאריכים</p>
        </div>
      </div>

      {/* Add Task */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="title">שם משימה</Label>
            <Input id="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="לדוגמה: הכנת דוח לקוח" />
          </div>

          <div className="space-y-2">
            <Label>עדיפות</Label>
            <div className="flex gap-2 flex-wrap">
              {(['low','medium','high','urgent'] as Priority[]).map(p => (
                <Button key={p} variant={p === newPriority ? 'default' : 'outline'} size="sm" onClick={() => setNewPriority(p)}>
                  {priorityLabels[p]}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-end">
            <Button onClick={addTask} className="w-full md:w-auto">
              <Plus className="w-4 h-4 ml-2" /> הוסף משימה
            </Button>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <MagnifyingGlass className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש משימות..." className="pr-9 w-64" />
          </div>
          <Separator orientation="vertical" className="h-8" />
          <Funnel size={16} className="text-muted-foreground" />
          <div className="flex gap-2">
            {(['all','todo','in-progress','done','blocked'] as Array<TaskStatus | 'all'>).map(s => (
              <Button key={s} variant={s === filterStatus ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(s)}>
                {s === 'all' ? 'הכל' : statusLabels[s]}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            {(['all','low','medium','high','urgent'] as Array<Priority | 'all'>).map(p => (
              <Button key={p} variant={p === filterPriority ? 'default' : 'outline'} size="sm" onClick={() => setFilterPriority(p)}>
                {p === 'all' ? 'כל העדיפויות' : priorityLabels[p]}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* List */}
      <Card className="p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">אין משימות תואמות</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <div key={t.id} className="p-3 rounded-xl border bg-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={t.status === 'done' ? 'success' : t.status === 'blocked' ? 'destructive' : 'secondary'}>
                    {statusLabels[t.status]}
                  </Badge>
                  <span className="font-semibold">{t.title}</span>
                  {t.priority !== 'medium' && (
                    <Badge variant={t.priority === 'urgent' ? 'destructive' : 'secondary'} className="mr-2">
                      {priorityLabels[t.priority]}
                    </Badge>
                  )}
                  {t.tags.length > 0 && (
                    <div className="flex gap-1 items-center text-muted-foreground text-xs">
                      <Tag size={14} /> {t.tags.join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {t.dueDate && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarBlank size={14} /> {t.dueDate}
                    </div>
                  )}
                  <Separator orientation="vertical" className="h-6" />
                  <Button variant="ghost" size="sm" onClick={() => updateStatus(t.id, t.status === 'done' ? 'todo' : 'done')}>
                    <CheckCircle size={16} className={t.status === 'done' ? 'text-success' : ''} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => updatePriority(t.id, t.priority === 'urgent' ? 'medium' : 'urgent')}>
                    <Clock size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeTask(t.id)}>
                    <DotsThreeOutline size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default TasksDashboard
