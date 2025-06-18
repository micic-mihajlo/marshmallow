"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts";
import { 
  DollarSign, 
  Zap, 
  Key,
  Server
} from "lucide-react";

const COLORS = {
  byok: "#10b981", // emerald-500
  system: "#3b82f6", // blue-500
  accent: "#f59e0b", // amber-500
};

interface UsageBreakdown {
  period: string;
  startDate: number;
  endDate: number;
  byokUsage: {
    totalTokens: number;
    totalCost: number;
    requestCount: number;
    models: Record<string, { tokens: number; cost: number; count: number }>;
  };
  systemUsage: {
    totalTokens: number;
    totalCost: number;
    requestCount: number;
    models: Record<string, { tokens: number; cost: number; count: number }>;
  };
  totalUsage: {
    totalTokens: number;
    totalCost: number;
    requestCount: number;
  };
  dailyUsage: Array<{
    date: string;
    byokCost: number;
    systemCost: number;
    byokTokens: number;
    systemTokens: number;
    totalCost: number;
    totalTokens: number;
  }>;
}

interface UsageDashboardProps {
  days?: number;
}

export function UsageDashboard({ days = 30 }: UsageDashboardProps) {
  const { user } = useUser();
  const currentUser = useQuery(api.users.getCurrentUser);

  const usageBreakdown = useQuery(
    api.usageTracking.getUserUsageBreakdown,
    currentUser?._id ? { userId: currentUser._id, days } : "skip"
  ) as UsageBreakdown | undefined;

  if (!user || !currentUser || !usageBreakdown) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { byokUsage, systemUsage, totalUsage, dailyUsage } = usageBreakdown;

  // Prepare data for charts
  const pieData = [
    {
      name: "Your API Key (BYOK)",
      value: byokUsage.totalCost,
      tokens: byokUsage.totalTokens,
      requests: byokUsage.requestCount,
      color: COLORS.byok,
    },
    {
      name: "System Funded",
      value: systemUsage.totalCost,
      tokens: systemUsage.totalTokens,
      requests: systemUsage.requestCount,
      color: COLORS.system,
    },
  ].filter(item => item.value > 0 || item.tokens > 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount < 0.01) return `$${(amount * 1000).toFixed(3)}k`;
    return `$${amount.toFixed(4)}`;
  };

  // Format tokens
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  // Get top models by usage
  const allModels = { ...byokUsage.models, ...systemUsage.models };
  const topModels = Object.entries(allModels)
    .map(([slug, data]) => ({
      slug,
      name: slug.split('/').pop() || slug,
      provider: slug.split('/')[0] || 'unknown',
      ...data,
      isBYOK: slug in byokUsage.models,
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Usage Analytics</h2>
        <p className="text-muted-foreground">
          Track your token usage and costs over the last {days} days
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalUsage.totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              {totalUsage.requestCount} requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTokens(totalUsage.totalTokens)}</div>
            <p className="text-xs text-muted-foreground">
              Input + output tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BYOK Usage</CardTitle>
            <Key className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(byokUsage.totalCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatTokens(byokUsage.totalTokens)} tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Funded</CardTitle>
            <Server className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(systemUsage.totalCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatTokens(systemUsage.totalTokens)} tokens
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="daily">Daily Usage</TabsTrigger>
          <TabsTrigger value="models">Top Models</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Cost Breakdown Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), "Cost"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No usage data yet
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  {pieData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <div className="text-sm font-medium">
                        {formatCurrency(item.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Token Usage Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Token Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pieData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number) => [formatTokens(value), "Tokens"]}
                      />
                      <Bar dataKey="tokens" fill={COLORS.accent} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Daily Usage Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyUsage}>
                    <CartesianGrid strokeDasharray="3 3" />
                                         <XAxis 
                       dataKey="date" 
                       tick={{ fontSize: 10 }}
                       tickFormatter={(date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                     />
                     <YAxis tick={{ fontSize: 10 }} />
                     <Tooltip
                       labelFormatter={(date: string) => new Date(date).toLocaleDateString()}
                       formatter={(value: number, name: string) => [
                         name === 'byokCost' || name === 'systemCost' ? formatCurrency(value) : formatTokens(value),
                         name === 'byokCost' ? 'BYOK Cost' : 
                         name === 'systemCost' ? 'System Cost' :
                         name === 'byokTokens' ? 'BYOK Tokens' : 'System Tokens'
                       ]}
                     />
                    <Area 
                      type="monotone" 
                      dataKey="systemCost" 
                      stackId="1" 
                      stroke={COLORS.system} 
                      fill={COLORS.system}
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="byokCost" 
                      stackId="1" 
                      stroke={COLORS.byok} 
                      fill={COLORS.byok}
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Models by Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topModels.length > 0 ? (
                  topModels.map((model, index) => (
                    <div key={model.slug} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-semibold text-muted-foreground">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-sm text-muted-foreground">{model.provider}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(model.cost)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatTokens(model.tokens)} tokens
                        </div>
                        <Badge variant={model.isBYOK ? "default" : "secondary"} className="mt-1">
                          {model.isBYOK ? "BYOK" : "System"}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No model usage data yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 