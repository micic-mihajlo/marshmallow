"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Zap, DollarSign, Activity, TrendingUp } from "lucide-react";

export function MetricsDashboard() {
  const currentMetrics = useQuery(api.metrics.getCurrentMetrics);
  const modelUsageStats = useQuery(api.metrics.getModelUsageStats, { days: 7 });
  const userActivityStats = useQuery(api.metrics.getUserActivityStats, { days: 30 });

  if (!currentMetrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-6 bg-muted animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(currentMetrics.totalUsers)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(currentMetrics.activeUsers)} active today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(currentMetrics.totalMessages)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(currentMetrics.messagesLast24h)} in last 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(currentMetrics.totalTokensUsed)}</div>
            <p className="text-xs text-muted-foreground">
              Total across all conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentMetrics.totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              Based on token usage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Model Usage Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Model Usage (Last 7 Days)
            </CardTitle>
            <CardDescription>
              Most popular models by conversation count
            </CardDescription>
          </CardHeader>
          <CardContent>
            {modelUsageStats && modelUsageStats.length > 0 ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {modelUsageStats.slice(0, 5).map((model: any) => (
                  <div key={model.slug} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm font-medium">{model.name}</p>
                        <p className="text-xs text-muted-foreground">{model.provider}</p>
                      </div>
                    </div>
                    <div className="text-sm font-medium">{formatNumber(model.count)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No usage data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              User activity over the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userActivityStats && userActivityStats.length > 0 ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {userActivityStats.slice(-7).map((day: any) => (
                  <div key={day.date} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <div className="flex gap-4">
                      <span>{day.activeUsers} users</span>
                      <span>{day.messages} messages</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No activity data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversations Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations Overview</CardTitle>
          <CardDescription>
            Total conversations and engagement metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold">{formatNumber(currentMetrics.totalConversations)}</div>
              <p className="text-sm text-muted-foreground">Total Conversations</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {currentMetrics.totalConversations > 0 
                  ? (currentMetrics.totalMessages / currentMetrics.totalConversations).toFixed(1)
                  : '0'
                }
              </div>
              <p className="text-sm text-muted-foreground">Avg Messages per Conversation</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {currentMetrics.totalUsers > 0 
                  ? (currentMetrics.totalConversations / currentMetrics.totalUsers).toFixed(1)
                  : '0'
                }
              </div>
              <p className="text-sm text-muted-foreground">Avg Conversations per User</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
 