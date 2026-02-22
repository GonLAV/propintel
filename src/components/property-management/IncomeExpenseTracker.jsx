import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function IncomeExpenseTracker({ propertyId }) {
  const [incomeDialog, setIncomeDialog] = useState(false);
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    amount: '',
    payment_method: 'bank_transfer'
  });
  const [expenseForm, setExpenseForm] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'maintenance',
    description: '',
    amount: '',
    vendor: ''
  });

  const queryClient = useQueryClient();

  const { data: income = [] } = useQuery({
    queryKey: ['income', propertyId],
    queryFn: async () => {
      const all = await base44.entities.RentalIncome.list();
      return all.filter(i => i.property_id === propertyId);
    }
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', propertyId],
    queryFn: async () => {
      const all = await base44.entities.PropertyExpense.list();
      return all.filter(e => e.property_id === propertyId);
    }
  });

  const createIncome = useMutation({
    mutationFn: (data) => base44.entities.RentalIncome.create({ ...data, property_id: propertyId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['income']);
      setIncomeDialog(false);
      toast.success('הכנסה נרשמה');
    }
  });

  const createExpense = useMutation({
    mutationFn: (data) => base44.entities.PropertyExpense.create({ ...data, property_id: propertyId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      setExpenseDialog(false);
      toast.success('הוצאה נרשמה');
    }
  });

  const totalIncome = income.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netIncome = totalIncome - totalExpenses;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-600" />
          ניהול כספי
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <p className="text-xs text-green-700 mb-1">הכנסות</p>
            <p className="text-lg font-bold text-green-900">₪{totalIncome.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <p className="text-xs text-red-700 mb-1">הוצאות</p>
            <p className="text-lg font-bold text-red-900">₪{totalExpenses.toLocaleString()}</p>
          </div>
          <div className={`${netIncome >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-orange-50 border-orange-200'} rounded-lg p-3 border`}>
            <p className={`text-xs ${netIncome >= 0 ? 'text-indigo-700' : 'text-orange-700'} mb-1`}>נטו</p>
            <p className={`text-lg font-bold ${netIncome >= 0 ? 'text-indigo-900' : 'text-orange-900'}`}>
              ₪{netIncome.toLocaleString()}
            </p>
          </div>
        </div>

        <Tabs defaultValue="income">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="income">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              הכנסות
            </TabsTrigger>
            <TabsTrigger value="expenses">
              <TrendingDown className="w-3.5 h-3.5 mr-1" />
              הוצאות
            </TabsTrigger>
          </TabsList>

          <TabsContent value="income" className="space-y-3 mt-3">
            <Dialog open={incomeDialog} onOpenChange={setIncomeDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  רשום הכנסה
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>רישום הכנסה</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">תאריך תשלום</Label>
                      <Input
                        type="date"
                        value={incomeForm.payment_date}
                        onChange={(e) => setIncomeForm({...incomeForm, payment_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">סכום</Label>
                      <Input
                        type="number"
                        value={incomeForm.amount}
                        onChange={(e) => setIncomeForm({...incomeForm, amount: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">חודש</Label>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        value={incomeForm.period_month}
                        onChange={(e) => setIncomeForm({...incomeForm, period_month: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">שנה</Label>
                      <Input
                        type="number"
                        value={incomeForm.period_year}
                        onChange={(e) => setIncomeForm({...incomeForm, period_year: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIncomeDialog(false)}>ביטול</Button>
                    <Button onClick={() => createIncome.mutate(incomeForm)}>שמור</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {income.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.period_month}/{item.period_year}
                  </p>
                  <p className="text-xs text-slate-600">
                    {new Date(item.payment_date).toLocaleDateString('he-IL')}
                  </p>
                </div>
                <p className="text-lg font-bold text-green-700">₪{item.amount.toLocaleString()}</p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="expenses" className="space-y-3 mt-3">
            <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full bg-red-600 hover:bg-red-700">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  רשום הוצאה
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>רישום הוצאה</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-xs">קטגוריה</Label>
                      <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm({...expenseForm, category: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="maintenance">תחזוקה</SelectItem>
                          <SelectItem value="repairs">תיקונים</SelectItem>
                          <SelectItem value="utilities">שירותים</SelectItem>
                          <SelectItem value="property_tax">ארנונה</SelectItem>
                          <SelectItem value="insurance">ביטוח</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">תאריך</Label>
                      <Input
                        type="date"
                        value={expenseForm.expense_date}
                        onChange={(e) => setExpenseForm({...expenseForm, expense_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">סכום</Label>
                      <Input
                        type="number"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-xs">תיאור</Label>
                      <Input
                        value={expenseForm.description}
                        onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setExpenseDialog(false)}>ביטול</Button>
                    <Button onClick={() => createExpense.mutate(expenseForm)}>שמור</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {expenses.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.description}</p>
                  <p className="text-xs text-slate-600">{item.category}</p>
                </div>
                <p className="text-lg font-bold text-red-700">₪{item.amount.toLocaleString()}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}