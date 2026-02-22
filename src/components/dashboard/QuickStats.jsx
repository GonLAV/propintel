import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Briefcase, Building, Users, TrendingUp, Clock, CheckCircle } from "lucide-react";

export default function QuickStats() {
  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: () => base44.entities.AppraisalCase.list(),
    initialData: []
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list(),
    initialData: []
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: []
  });

  const activeCases = cases.filter(c => !['completed', 'delivered', 'cancelled'].includes(c.status));
  const completedCases = cases.filter(c => c.status === 'completed' || c.status === 'delivered');
  const urgentCases = cases.filter(c => {
    if (!c.due_date) return false;
    const dueDate = new Date(c.due_date);
    const today = new Date();
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  });

  const stats = [
    {
      label: 'תיקים פעילים',
      value: activeCases.length,
      icon: Briefcase,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      label: 'נכסים במערכת',
      value: properties.length,
      icon: Building,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'לקוחות',
      value: clients.length,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'תיקים שהושלמו',
      value: completedCases.length,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    {
      label: 'דחופים',
      value: urgentCases.length,
      icon: Clock,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      label: 'שווי ממוצע',
      value: properties.length > 0 
        ? `₪${Math.round(properties.reduce((sum, p) => sum + (p.estimated_value || 0), 0) / properties.length / 1000)}K`
        : '₪0',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="border border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 ${stat.bgColor} rounded-lg`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-600">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}