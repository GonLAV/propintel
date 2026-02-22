import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Wrench, Plus, Calendar, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function MaintenanceScheduler({ propertyId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'maintenance',
    priority: 'medium',
    scheduled_date: '',
    assigned_to: '',
    estimated_cost: ''
  });

  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['maintenance', propertyId],
    queryFn: async () => {
      const all = await base44.entities.MaintenanceTask.list();
      return all.filter(t => t.property_id === propertyId);
    }
  });

  const createTask = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceTask.create({ ...data, property_id: propertyId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['maintenance']);
      setIsOpen(false);
      setFormData({
        title: '',
        description: '',
        category: 'maintenance',
        priority: 'medium',
        scheduled_date: '',
        assigned_to: '',
        estimated_cost: ''
      });
      toast.success('משימה נוספה');
    }
  });

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-amber-100 text-amber-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  const statusColors = {
    scheduled: 'bg-slate-100 text-slate-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4 text-indigo-600" />
            תחזוקה ותיקונים
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-3.5 h-3.5 mr-1" />
                משימה חדשה
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>משימת תחזוקה חדשה</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">כותרת *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">תיאור</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">קטגוריה</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plumbing">אינסטלציה</SelectItem>
                        <SelectItem value="electrical">חשמל</SelectItem>
                        <SelectItem value="hvac">מיזוג</SelectItem>
                        <SelectItem value="appliances">מכשירי חשמל</SelectItem>
                        <SelectItem value="painting">צביעה</SelectItem>
                        <SelectItem value="cleaning">ניקיון</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">עדיפות</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">נמוכה</SelectItem>
                        <SelectItem value="medium">בינונית</SelectItem>
                        <SelectItem value="high">גבוהה</SelectItem>
                        <SelectItem value="urgent">דחוף</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">תאריך מתוזמן</Label>
                    <Input
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">עלות משוערת</Label>
                    <Input
                      type="number"
                      value={formData.estimated_cost}
                      onChange={(e) => setFormData({...formData, estimated_cost: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">קבלן/טכנאי</Label>
                    <Input
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>ביטול</Button>
                  <Button onClick={() => createTask.mutate(formData)}>שמור</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">אין משימות תחזוקה</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-sm">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-slate-600 mt-1">{task.description}</p>
                    )}
                  </div>
                  <Badge className={priorityColors[task.priority]}>
                    {task.priority === 'urgent' && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {task.priority}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={statusColors[task.status || 'scheduled']}>
                      {task.status || 'scheduled'}
                    </Badge>
                    {task.scheduled_date && (
                      <span className="text-slate-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.scheduled_date).toLocaleDateString('he-IL')}
                      </span>
                    )}
                  </div>
                  {task.estimated_cost && (
                    <span className="font-semibold text-slate-900">₪{task.estimated_cost.toLocaleString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}