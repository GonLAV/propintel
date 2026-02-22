import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import type { TeamMember, UserRole, Permission } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UsersThree, Plus, Shield, CheckCircle, XCircle, Eye } from '@phosphor-icons/react'
import { toast } from 'sonner'

const roleLabels: Record<UserRole, string> = {
  'senior-appraiser': 'שמאי בכיר',
  'junior-appraiser': 'שמאי',
  'intern': 'מתמחה',
  'admin': 'אדמיניסטרציה',
  'viewer': 'צופה בלבד'
}

const roleColors: Record<UserRole, string> = {
  'senior-appraiser': 'bg-primary/20 text-primary',
  'junior-appraiser': 'bg-accent/20 text-accent',
  'intern': 'bg-warning/20 text-warning',
  'admin': 'bg-destructive/20 text-destructive',
  'viewer': 'bg-muted text-muted-foreground'
}

const defaultPermissions: Record<UserRole, Permission[]> = {
  'senior-appraiser': [
    { resource: 'cases', actions: ['view', 'create', 'edit', 'delete', 'approve', 'sign'], scope: 'all' },
    { resource: 'clients', actions: ['view', 'create', 'edit', 'delete'], scope: 'all' },
    { resource: 'properties', actions: ['view', 'create', 'edit', 'delete'], scope: 'all' },
    { resource: 'reports', actions: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'sign'], scope: 'all' },
    { resource: 'invoices', actions: ['view', 'create', 'edit', 'delete', 'approve'], scope: 'all' },
    { resource: 'settings', actions: ['view', 'edit'], scope: 'all' },
    { resource: 'team', actions: ['view', 'create', 'edit'], scope: 'all' }
  ],
  'junior-appraiser': [
    { resource: 'cases', actions: ['view', 'create', 'edit'], scope: 'assigned' },
    { resource: 'clients', actions: ['view', 'create'], scope: 'all' },
    { resource: 'properties', actions: ['view', 'create', 'edit'], scope: 'assigned' },
    { resource: 'reports', actions: ['view', 'create', 'edit', 'export'], scope: 'assigned' },
    { resource: 'invoices', actions: ['view', 'create'], scope: 'assigned' },
    { resource: 'settings', actions: ['view'], scope: 'own' },
    { resource: 'team', actions: ['view'], scope: 'all' }
  ],
  'intern': [
    { resource: 'cases', actions: ['view'], scope: 'assigned' },
    { resource: 'clients', actions: ['view'], scope: 'assigned' },
    { resource: 'properties', actions: ['view'], scope: 'assigned' },
    { resource: 'reports', actions: ['view'], scope: 'assigned' },
    { resource: 'invoices', actions: ['view'], scope: 'none' },
    { resource: 'settings', actions: ['view'], scope: 'own' },
    { resource: 'team', actions: ['view'], scope: 'all' }
  ],
  'admin': [
    { resource: 'cases', actions: ['view', 'create', 'edit', 'delete'], scope: 'all' },
    { resource: 'clients', actions: ['view', 'create', 'edit', 'delete'], scope: 'all' },
    { resource: 'properties', actions: ['view', 'create', 'edit', 'delete'], scope: 'all' },
    { resource: 'reports', actions: ['view', 'create', 'edit', 'export'], scope: 'all' },
    { resource: 'invoices', actions: ['view', 'create', 'edit', 'delete', 'approve'], scope: 'all' },
    { resource: 'settings', actions: ['view', 'edit'], scope: 'all' },
    { resource: 'team', actions: ['view', 'create', 'edit', 'delete'], scope: 'all' }
  ],
  'viewer': [
    { resource: 'cases', actions: ['view'], scope: 'assigned' },
    { resource: 'clients', actions: ['view'], scope: 'assigned' },
    { resource: 'properties', actions: ['view'], scope: 'assigned' },
    { resource: 'reports', actions: ['view'], scope: 'assigned' },
    { resource: 'invoices', actions: ['view'], scope: 'none' },
    { resource: 'settings', actions: ['view'], scope: 'own' },
    { resource: 'team', actions: ['view'], scope: 'all' }
  ]
}

export function TeamManagement() {
  const [team, setTeam] = useKV<TeamMember[]>('team-members', [])
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newMember, setNewMember] = useState<Partial<TeamMember>>({
    role: 'junior-appraiser',
    isActive: true
  })

  const handleCreateMember = () => {
    if (!newMember.name || !newMember.email) {
      toast.error('נא להזין שם ואימייל')
      return
    }

    const member: TeamMember = {
      id: crypto.randomUUID(),
      name: newMember.name,
      email: newMember.email,
      role: newMember.role as UserRole || 'junior-appraiser',
      licenseNumber: newMember.licenseNumber,
      phone: newMember.phone,
      permissions: defaultPermissions[newMember.role as UserRole || 'junior-appraiser'],
      activeCases: [],
      completedCases: 0,
      performance: {
        avgCompletionTime: 0,
        clientSatisfaction: 0,
        accuracy: 0
      },
      isActive: true,
      joinedAt: new Date().toISOString()
    }

    setTeam(current => [...(current || []), member])
    setIsCreateDialogOpen(false)
    setNewMember({ role: 'junior-appraiser', isActive: true })
    toast.success('חבר צוות נוסף בהצלחה')
  }

  const handleToggleActive = (memberId: string) => {
    setTeam(current =>
      (current || []).map(m =>
        m.id === memberId
          ? { ...m, isActive: !m.isActive, lastActive: new Date().toISOString() }
          : m
      )
    )
    toast.success('סטטוס עודכן')
  }

  const handleUpdateRole = (memberId: string, newRole: UserRole) => {
    setTeam(current =>
      (current || []).map(m =>
        m.id === memberId
          ? { ...m, role: newRole, permissions: defaultPermissions[newRole] }
          : m
      )
    )
    toast.success('תפקיד עודכן')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const activeMembers = (team || []).filter(m => m.isActive).length
  const totalCases = (team || []).reduce((sum, m) => sum + m.activeCases.length, 0)
  const avgCompletion = (team || []).reduce((sum, m) => sum + m.completedCases, 0)

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <UsersThree size={32} weight="duotone" className="text-primary" />
            ניהול צוות והרשאות
          </h2>
          <p className="text-muted-foreground mt-2">
            שיתוף עבודה, הרשאות והגנה משפטית
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" size="lg">
              <Plus size={20} weight="bold" />
              הוספת חבר צוות
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>הוספת חבר צוות</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>שם מלא *</Label>
                  <Input
                    value={newMember.name || ''}
                    onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                    placeholder="ישראל ישראלי"
                  />
                </div>
                <div className="space-y-2">
                  <Label>אימייל *</Label>
                  <Input
                    type="email"
                    value={newMember.email || ''}
                    onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                    placeholder="israel@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>תפקיד *</Label>
                  <Select value={newMember.role} onValueChange={v => setNewMember({ ...newMember, role: v as UserRole })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>טלפון</Label>
                  <Input
                    value={newMember.phone || ''}
                    onChange={e => setNewMember({ ...newMember, phone: e.target.value })}
                    placeholder="050-1234567"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>מספר רישיון</Label>
                <Input
                  value={newMember.licenseNumber || ''}
                  onChange={e => setNewMember({ ...newMember, licenseNumber: e.target.value })}
                  placeholder="123456"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  ביטול
                </Button>
                <Button onClick={handleCreateMember}>
                  הוספה
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 glass-effect">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">חברי צוות פעילים</p>
              <p className="text-3xl font-bold text-foreground mt-1">{activeMembers}</p>
            </div>
            <UsersThree size={40} weight="duotone" className="text-primary" />
          </div>
        </Card>
        <Card className="p-6 glass-effect">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">תיקים פעילים</p>
              <p className="text-3xl font-bold text-foreground mt-1">{totalCases}</p>
            </div>
            <Shield size={40} weight="duotone" className="text-accent" />
          </div>
        </Card>
        <Card className="p-6 glass-effect">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">תיקים שהושלמו</p>
              <p className="text-3xl font-bold text-foreground mt-1">{avgCompletion}</p>
            </div>
            <CheckCircle size={40} weight="duotone" className="text-success" />
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        {(!team || team.length === 0) ? (
          <Card className="p-12 text-center glass-effect">
            <UsersThree size={64} weight="duotone" className="mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg text-muted-foreground">אין חברי צוות עדיין</p>
            <p className="text-sm text-muted-foreground mt-2">הוסף חבר צוות ראשון כדי להתחיל</p>
          </Card>
        ) : (
          team.map(member => (
            <Card key={member.id} className="p-6 glass-effect hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{member.name}</h3>
                      <Badge className={roleColors[member.role]}>
                        {roleLabels[member.role]}
                      </Badge>
                      {member.isActive ? (
                        <Badge className="bg-success/20 text-success gap-1">
                          <CheckCircle size={12} weight="fill" />
                          פעיל
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <XCircle size={12} />
                          לא פעיל
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>{member.email}</p>
                      {member.phone && <p>{member.phone}</p>}
                      {member.licenseNumber && <p>רישיון: {member.licenseNumber}</p>}
                    </div>
                    <div className="flex items-center gap-6 mt-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">תיקים פעילים: </span>
                        <span className="font-semibold">{member.activeCases.length}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">הושלמו: </span>
                        <span className="font-semibold">{member.completedCases}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={member.role} onValueChange={v => handleUpdateRole(member.id, v as UserRole)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleToggleActive(member.id)}
                  >
                    {member.isActive ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setSelectedMember(member)}>
                    <Eye size={18} />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {selectedMember && (
        <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
          <DialogContent className="max-w-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>הרשאות - {selectedMember.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-3">
                {selectedMember.permissions.map((perm, idx) => (
                  <Card key={idx} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold capitalize">{perm.resource}</h4>
                      <Badge variant="outline">{perm.scope}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {perm.actions.map(action => (
                        <Badge key={action} variant="secondary" className="text-xs">
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
