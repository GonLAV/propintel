import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, Plus, Mail, Phone, Calendar, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function TenantManager({ propertyId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    lease_start_date: '',
    lease_end_date: '',
    monthly_rent: '',
    deposit_amount: '',
    payment_day: 1
  });

  const queryClient = useQueryClient();

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants', propertyId],
    queryFn: async () => {
      const all = await base44.entities.Tenant.list();
      return all.filter(t => t.property_id === propertyId);
    }
  });

  const createTenant = useMutation({
    mutationFn: (data) => base44.entities.Tenant.create({ ...data, property_id: propertyId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenants']);
      setIsOpen(false);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        lease_start_date: '',
        lease_end_date: '',
        monthly_rent: '',
        deposit_amount: '',
        payment_day: 1
      });
      toast.success('שוכר נוסף בהצלחה');
    }
  });

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    notice_given: 'bg-amber-100 text-amber-800',
    ended: 'bg-slate-100 text-slate-800'
  };

  const statusLabels = {
    active: 'פעיל',
    notice_given: 'הודעה ניתנה',
    ended: 'הסתיים'
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            שוכרים
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-3.5 h-3.5 mr-1" />
                שוכר חדש
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>הוספת שוכר חדש</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">שם מלא *</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">אימייל</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">טלפון</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">דמי שכירות חודשיים *</Label>
                    <Input
                      type="number"
                      value={formData.monthly_rent}
                      onChange={(e) => setFormData({...formData, monthly_rent: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">תאריך התחלה *</Label>
                    <Input
                      type="date"
                      value={formData.lease_start_date}
                      onChange={(e) => setFormData({...formData, lease_start_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">תאריך סיום</Label>
                    <Input
                      type="date"
                      value={formData.lease_end_date}
                      onChange={(e) => setFormData({...formData, lease_end_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">פיקדון</Label>
                    <Input
                      type="number"
                      value={formData.deposit_amount}
                      onChange={(e) => setFormData({...formData, deposit_amount: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">יום תשלום בחודש</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.payment_day}
                      onChange={(e) => setFormData({...formData, payment_day: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>ביטול</Button>
                  <Button onClick={() => createTenant.mutate(formData)}>שמור</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {tenants.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">אין שוכרים רשומים</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-900">{tenant.full_name}</p>
                    <Badge className={`${statusColors[tenant.status || 'active']} text-xs mt-1`}>
                      {statusLabels[tenant.status || 'active']}
                    </Badge>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-slate-500">שכירות חודשית</p>
                    <p className="text-lg font-bold text-green-700">₪{tenant.monthly_rent?.toLocaleString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {tenant.email && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Mail className="w-3.5 h-3.5" />
                      {tenant.email}
                    </div>
                  )}
                  {tenant.phone && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Phone className="w-3.5 h-3.5" />
                      {tenant.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(tenant.lease_start_date).toLocaleDateString('he-IL')}
                  </div>
                  {tenant.lease_end_date && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Calendar className="w-3.5 h-3.5" />
                      עד {new Date(tenant.lease_end_date).toLocaleDateString('he-IL')}
                    </div>
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