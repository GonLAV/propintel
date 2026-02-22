import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, Briefcase, Building, Users, FileText } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function RecentActivity() {
  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: () => base44.entities.AppraisalCase.list('-created_date', 5),
    initialData: []
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date', 5),
    initialData: []
  });

  const activities = [
    ...cases.map(c => ({
      type: 'case',
      icon: Briefcase,
      title: `תיק חדש: ${c.case_number}`,
      description: c.property_address,
      time: c.created_date,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    })),
    ...properties.slice(0, 3).map(p => ({
      type: 'property',
      icon: Building,
      title: 'נכס חדש נוסף',
      description: `${p.address}, ${p.city}`,
      time: p.created_date,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    }))
  ]
  .sort((a, b) => new Date(b.time) - new Date(a.time))
  .slice(0, 8);

  return (
    <Card className="border border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600" />
          פעילות אחרונה
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">אין פעילות אחרונה</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-white transition-colors"
                >
                  <div className={`p-2 ${activity.bgColor} rounded-lg flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{activity.title}</p>
                    <p className="text-xs text-slate-600 truncate">{activity.description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(activity.time), 'PPp', { locale: he })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}