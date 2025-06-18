"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricsDashboard } from "@/components/admin/metrics-dashboard";
import { UsageDashboard } from "@/components/admin/usage-dashboard";
import { ModelSelector } from "@/components/chat/model-selector";
import { AdminLogs } from "@/components/admin/admin-logs";
import { UserManagement } from "@/components/admin/user-management";

export default function AdminPage() {
  const [selectedModel, setSelectedModel] = useState<string>("");
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage Monitoring</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
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
          <Card>
            <CardHeader>
              <CardTitle>Model Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-xl">
                <ModelSelector 
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <AdminLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
} 