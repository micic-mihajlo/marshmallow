"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, User, Settings, Database, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const actionIcons: Record<string, React.ReactNode> = {
  user_role_changed: <User className="h-4 w-4" />,
  model_created: <Database className="h-4 w-4" />,
  model_updated: <Settings className="h-4 w-4" />,
  model_deleted: <Database className="h-4 w-4" />,
  settings_updated: <Settings className="h-4 w-4" />,
  admin_login: <Shield className="h-4 w-4" />,
  default: <Activity className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
  user_role_changed: "bg-blue-100 text-blue-800",
  model_created: "bg-green-100 text-green-800",
  model_updated: "bg-yellow-100 text-yellow-800",
  model_deleted: "bg-red-100 text-red-800",
  settings_updated: "bg-purple-100 text-purple-800",
  admin_login: "bg-gray-100 text-gray-800",
  default: "bg-gray-100 text-gray-800",
};

export function AdminLogs() {
  const logsData = useQuery(api.adminLogs.getAdminLogs, { limit: 100 });
  const recentActivity = useQuery(api.adminLogs.getRecentAdminActivity, { hours: 24 });

  if (!logsData || !recentActivity) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Admin Activity Logs</CardTitle>
            <CardDescription>Loading admin activity...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recent Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentActivity.totalActions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Admins</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(recentActivity.adminActivity).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Common Action</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {Object.entries(recentActivity.actionCounts).length > 0
                ? Object.entries(recentActivity.actionCounts).sort(([,a], [,b]) => b - a)[0][0]
                : "None"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Admin Actions</CardTitle>
          <CardDescription>
            Detailed log of all administrative actions performed in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {logsData.logs.map((log) => (
                <div
                  key={log._id}
                  className="flex items-start space-x-4 p-4 border rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {actionIcons[log.action] || actionIcons.default}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          className={actionColors[log.action] || actionColors.default}
                          variant="secondary"
                        >
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          by {log.adminName}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <div className="mt-1">
                      <p className="text-sm text-gray-900">
                        {getActionDescription(log)}
                      </p>
                      
                      {log.targetType && log.targetId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Target: {log.targetType} ({log.targetId})
                        </p>
                      )}
                      
                      {Object.keys(log.details).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            View details
                          </summary>
                          <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {logsData.logs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No admin activity logs found
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function getActionDescription(log: {
  action: string;
  details: Record<string, unknown>;
}): string {
  switch (log.action) {
    case "user_role_changed":
      return `Changed user role to ${log.details.newRole || 'unknown'}`;
    case "model_created":
      return `Created new model: ${log.details.modelName || 'Unknown Model'}`;
    case "model_updated":
      return `Updated model settings for: ${log.details.modelName || 'Unknown Model'}`;
    case "model_deleted":
      return `Deleted model: ${log.details.modelName || 'Unknown Model'}`;
    case "settings_updated":
      return `Updated system settings`;
    case "admin_login":
      return `Admin logged into the system`;
    default:
      return `Performed action: ${log.action}`;
  }
} 