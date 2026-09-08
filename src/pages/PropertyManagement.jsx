import React from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import TenantManager from "@/components/property-management/TenantManager";
import IncomeExpenseTracker from "@/components/property-management/IncomeExpenseTracker";
import MaintenanceScheduler from "@/components/property-management/MaintenanceScheduler";
import { Building } from "lucide-react";

export default function PropertyManagement() {
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('id');

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      if (!propertyId) return null;
      const properties = await base44.entities.Property.list();
      return properties.find(p => p.id === propertyId);
    },
    enabled: !!propertyId
  });

  if (!propertyId) {
    return (
      <div className="text-center py-20">
        <Building className="w-12 h-12 mx-auto mb-3 text-slate-400" />
        <p className="text-slate-600">אנא בחר נכס לניהול</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-600">נכס לא נמצא</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="ניהול נכס"
        subtitle={`${property.address}, ${property.city}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TenantManager propertyId={propertyId} />
        <IncomeExpenseTracker propertyId={propertyId} />
        <div className="lg:col-span-2">
          <MaintenanceScheduler propertyId={propertyId} />
        </div>
      </div>
    </div>
  );
}