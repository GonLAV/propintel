import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Circle, AlertCircle } from "lucide-react";

export default function CaseTimeline({ appraisalCase }) {
  const timelineSteps = [
    {
      status: 'new',
      label: 'תיק חדש',
      icon: Circle,
      color: 'text-slate-400'
    },
    {
      status: 'data_collection',
      label: 'איסוף נתונים',
      icon: Clock,
      color: 'text-blue-600'
    },
    {
      status: 'site_visit_scheduled',
      label: 'סיור מתוזמן',
      icon: Clock,
      color: 'text-amber-600'
    },
    {
      status: 'site_visit_done',
      label: 'סיור הושלם',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      status: 'analysis',
      label: 'ניתוח',
      icon: Clock,
      color: 'text-indigo-600'
    },
    {
      status: 'report_draft',
      label: 'טיוטת דוח',
      icon: Clock,
      color: 'text-purple-600'
    },
    {
      status: 'review',
      label: 'בבדיקה',
      icon: AlertCircle,
      color: 'text-orange-600'
    },
    {
      status: 'completed',
      label: 'הושלם',
      icon: CheckCircle,
      color: 'text-green-700'
    },
    {
      status: 'delivered',
      label: 'נמסר',
      icon: CheckCircle,
      color: 'text-emerald-700'
    }
  ];

  const currentStatusIndex = timelineSteps.findIndex(
    step => step.status === appraisalCase.status
  );

  return (
    <Card className="border border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">ציר זמן</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {timelineSteps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStatusIndex;
            const isCurrent = index === currentStatusIndex;
            const isPending = index > currentStatusIndex;

            return (
              <div key={step.status} className="flex items-center gap-3">
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  isCompleted ? 'bg-green-100 border-green-600' :
                  isCurrent ? 'bg-indigo-100 border-indigo-600' :
                  'bg-slate-100 border-slate-300'
                }`}>
                  <Icon className={`w-4 h-4 ${
                    isCompleted ? 'text-green-600' :
                    isCurrent ? 'text-indigo-600' :
                    'text-slate-400'
                  }`} />
                  {index < timelineSteps.length - 1 && (
                    <div className={`absolute top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-6 ${
                      isCompleted ? 'bg-green-600' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${
                      isCompleted ? 'text-green-700' :
                      isCurrent ? 'text-indigo-900' :
                      'text-slate-500'
                    }`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <Badge className="bg-indigo-600 text-white text-xs">נוכחי</Badge>
                    )}
                    {isCompleted && (
                      <Badge className="bg-green-100 text-green-800 text-xs">✓</Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}