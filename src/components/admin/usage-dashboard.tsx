"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, DollarSign, Zap, Clock, Users, TrendingUp, 
  AlertTriangle, CheckCircle, XCircle, BarChart3, PieChart as PieChartIcon
} from "lucide-react";

export function UsageDashboard() {
  const systemStats = useQuery(api.usageTracking.getSystemUsageStats, { 
    period: "daily", 
    limit: 30 
  });
  
  const topUsers = useQuery(api.usageTracking.getTopUsersByUsage, { 
    period: "monthly", 
    limit: 10 
  });

  const recentRequests = useQuery(api.requestLogs.getRecentRequests, { limit: 100 });
  const alerts = useQuery(api.systemAlerts.getActiveAlerts);
  const modelStats = useQuery(api.usageTracking.getModelUsageStats, { 
    period: "weekly", 
    limit: 15 
  });

  if (!systemStats || !topUsers || !recentRequests) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
      </div>
    );
  }

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatNumber = (num: number) => 
    new Intl.NumberFormat('en-US').format(num);

  // Calculate summary statistics
  const totalRequests = systemStats.reduce((sum, day) => sum + day.totalRequests, 0);
  const totalTokens = systemStats.reduce((sum, day) => sum + day.totalTokens, 0);
  const totalCost = systemStats.reduce((sum, day) => sum + day.totalCost, 0);
  const avgSuccessRate = systemStats.length > 0 
    ? systemStats.reduce((sum, day) => sum + day.successRate, 0) / systemStats.length 
    : 0;

  const recentErrors = recentRequests.filter(req => req.status === "error").length;
  const errorRate = recentRequests.length > 0 ? (recentErrors / recentRequests.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {alerts && alerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-medium text-yellow-800">
              {alerts.length} Active Alert{alerts.length > 1 ? 's' : ''}
            </h3>
          </div>
          <div className="mt-2 space-y-1">
            {alerts.slice(0, 3).map((alert) => (
              <p key={alert._id} className="text-sm text-yellow-700">
                <span className="font-medium">{alert.title}:</span> {alert.message}
              </p>
            ))}
            {alerts.length > 3 && (
              <p className="text-sm text-yellow-600">
                +{alerts.length - 3} more alerts...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalRequests)}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days • {formatNumber(Math.round(totalRequests / 30))} avg/day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalTokens)}</div>
            <p className="text-xs text-muted-foreground">
              Across all models • {formatNumber(Math.round(totalTokens / totalRequests))} avg/request
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              OpenRouter charges • {formatCurrency(totalCost / 30)}/day avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSuccessRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {errorRate.toFixed(1)}% error rate • {recentErrors} recent errors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Top Users</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Daily Usage Trends
                </CardTitle>
                <CardDescription>Request volume and token usage over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemStats.slice(-7).map((day) => (
                    <div key={day.period} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-sm font-medium">
                          {new Date(day.period).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatNumber(day.totalRequests)} requests</div>
                        <div className="text-xs text-muted-foreground">
                          {formatNumber(day.totalTokens)} tokens • {formatCurrency(day.totalCost)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
                <CardDescription>System performance and reliability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Response Time</span>
                    <span className="text-sm font-medium">
                      {systemStats.length > 0 
                        ? Math.round(systemStats.reduce((sum, day) => sum + day.avgProcessingTime, 0) / systemStats.length)
                        : 0
                      }ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Success Rate</span>
                    <span className="text-sm font-medium">{avgSuccessRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Models Used</span>
                    <span className="text-sm font-medium">
                      {systemStats.length > 0 
                        ? Math.max(...systemStats.map(day => day.uniqueModelsUsed))
                        : 0
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Users</span>
                    <span className="text-sm font-medium">{topUsers.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Users by Usage
              </CardTitle>
              <CardDescription>Monthly usage leaders and their activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topUsers.map((userStat, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{userStat.user?.name}</p>
                        <p className="text-sm text-muted-foreground">{userStat.user?.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatNumber(userStat.stats.totalTokens)} tokens</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(userStat.stats.totalCost)} • {userStat.stats.totalRequests} requests
                      </p>
                    </div>
                  </div>
                ))}
                {topUsers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No user data available for this period
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Model Usage Statistics
              </CardTitle>
              <CardDescription>Most popular models and their performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modelStats && modelStats.length > 0 ? (
                  modelStats.slice(0, 10).map((model, index) => (
                    <div key={model.modelSlug} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{model.modelSlug}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatNumber(model.count)} requests • Avg: {Math.round(model.avgProcessingTime)}ms
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatNumber(model.totalTokens)} tokens</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(model.totalCost)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No model usage data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Requests
              </CardTitle>
              <CardDescription>Latest API requests and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentRequests.slice(0, 50).map((request) => (
                  <div key={request._id} className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      {request.status === "success" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : request.status === "error" ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                      <div>
                        <span className="text-sm font-medium">{request.requestType}</span>
                        {request.user && (
                          <span className="text-xs text-muted-foreground ml-2">
                            by {request.user.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {new Date(request.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {request.processingTimeMs}ms
                        {request.status === "error" && request.errorMessage && (
                          <span className="text-red-500 ml-1">• Error</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {recentRequests.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No recent requests found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Daily Cost Breakdown
                </CardTitle>
                <CardDescription>OpenRouter costs over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {systemStats.slice(-14).map((day) => (
                    <div key={day.period} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {new Date(day.period).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-2 bg-blue-500 rounded"
                          style={{ 
                            width: `${Math.max(10, (day.totalCost / Math.max(...systemStats.map(d => d.totalCost))) * 100)}px` 
                          }}
                        />
                        <span className="text-sm font-medium min-w-[60px] text-right">
                          {formatCurrency(day.totalCost)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
                <CardDescription>Cost efficiency and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Monthly Cost</span>
                    <span className="text-sm font-medium">{formatCurrency(totalCost)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Cost per Request</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(totalRequests > 0 ? totalCost / totalRequests : 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cost per 1K Tokens</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Projected Monthly Cost</span>
                    <span className="text-sm font-medium">
                      {formatCurrency((totalCost / 30) * 30)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 