"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { MetricsDashboard } from "@/components/admin/metrics-dashboard";
import { UsageDashboard } from "@/components/admin/usage-dashboard";
import { AdminLogs } from "@/components/admin/admin-logs";
import { UserManagement } from "@/components/admin/user-management";
import { EnhancedModelsManagement } from "@/components/admin/enhanced-models-management";
import { ModelsCatalogManager } from "@/components/admin/models-catalog";

export default function AdminPage() {
  const router = useRouter();
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        <Button 
          variant="outline" 
          onClick={() => router.push('/')}
        >
          Back to Home
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage Monitoring</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="catalog">Models Catalog</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <MetricsDashboard />
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <UsageDashboard />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <EnhancedModelsManagement />
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <ModelsCatalogManager />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <AdminLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
} 