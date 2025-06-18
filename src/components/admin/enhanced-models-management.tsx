"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Settings, 
  Eye, 
  FileUp, 
  Image, 
  Zap, 
  DollarSign, 
  Loader2,
  RefreshCw,
  Filter,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface ModelWithSettings {
  _id: Id<"models">;
  name: string;
  slug: string;
  provider: string;
  description?: string;
  supportsFileUpload: boolean;
  supportsImageUpload: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  maxTokens?: number;
  costPer1kTokens?: number;
  settings: {
    _id: Id<"modelSettings">;
    enabled: boolean;
    allowFileUpload: boolean;
    allowImageUpload: boolean;
    allowVision: boolean;
    allowStreaming: boolean;
  } | null;
}

export function EnhancedModelsManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [showEnabledOnly, setShowEnabledOnly] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const models = useQuery(api.models.getModelsWithSettings);
  const seedModels = useMutation(api.seedModels.seedOpenRouterModels);
  const updateModelSettings = useMutation(api.modelSettings.updateModelSettings);

  const handleSeedModels = async (overwrite: boolean = false) => {
    setIsSeeding(true);
    try {
      const result = await seedModels({ overwrite });
      alert(result.message);
    } catch (error) {
      console.error("Error seeding models:", error);
      alert("Failed to seed models. Please try again.");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleToggleModel = async (modelId: Id<"models">, enabled: boolean) => {
    try {
      await updateModelSettings({
        modelId,
        enabled,
      });
    } catch (error) {
      console.error("Error updating model:", error);
    }
  };



  const providers = useMemo(() => {
    if (!models) return [];
    const providerSet = new Set(models.map(m => m.provider));
    return Array.from(providerSet).sort();
  }, [models]);

  const stats = useMemo(() => {
    if (!models) return { total: 0, enabled: 0, providers: 0 };
    return {
      total: models.length,
      enabled: models.filter(m => m.settings?.enabled).length,
      providers: providers.length,
    };
  }, [models, providers]);

  if (!models) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Enhanced Models Management</h2>
          <p className="text-muted-foreground">
            Manage AI models available to users with comprehensive controls
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleSeedModels(false)}
            disabled={isSeeding}
          >
            {isSeeding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Seed OpenRouter Models
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleSeedModels(true)}
            disabled={isSeeding}
          >
            {isSeeding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Force Update All
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Models</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enabled Models</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.enabled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Providers</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.providers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search models by name, slug, or provider..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="min-w-[150px]">
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                >
                  <option value="all">All Providers</option>
                  {providers.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled-only"
                  checked={showEnabledOnly}
                  onCheckedChange={setShowEnabledOnly}
                />
                <Label htmlFor="enabled-only" className="text-sm">
                  Enabled Only
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Models List */}
      <div className="space-y-4">
        {models && models.length > 0 ? (
          <div className="grid gap-4">
            {models
              .filter((model) => {
                const matchesSearch = 
                  model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  model.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  model.provider.toLowerCase().includes(searchQuery.toLowerCase());
                
                const matchesProvider = selectedProvider === "all" || model.provider === selectedProvider;
                const matchesEnabled = !showEnabledOnly || model.settings?.enabled;

                return matchesSearch && matchesProvider && matchesEnabled;
              })
              .map((model) => (
                <Card key={model._id} className="transition-all hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={model.settings?.enabled || false}
                              onCheckedChange={(enabled) => handleToggleModel(model._id, enabled)}
                              id={`model-${model._id}`}
                            />
                            <Label htmlFor={`model-${model._id}`} className="sr-only">
                              Enable {model.name}
                            </Label>
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{model.name}</h3>
                            <p className="text-sm text-muted-foreground font-mono">
                              {model.slug}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {model.provider.charAt(0).toUpperCase() + model.provider.slice(1)}
                          </Badge>
                          <Badge variant={model.settings?.enabled ? "default" : "secondary"}>
                            {model.settings?.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>

                        {model.description && (
                          <p className="text-sm text-muted-foreground">
                            {model.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {model.supportsFileUpload && (
                            <Badge variant="outline" className="text-xs">
                              <FileUp className="h-3 w-3 mr-1" />
                              File Upload
                            </Badge>
                          )}
                          {model.supportsImageUpload && (
                            <Badge variant="outline" className="text-xs">
                              <Image className="h-3 w-3 mr-1" />
                              Image Upload
                            </Badge>
                          )}
                          {model.supportsVision && (
                            <Badge variant="outline" className="text-xs">
                              <Eye className="h-3 w-3 mr-1" />
                              Vision
                            </Badge>
                          )}
                          {model.supportsStreaming && (
                            <Badge variant="outline" className="text-xs">
                              <Zap className="h-3 w-3 mr-1" />
                              Streaming
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {model.maxTokens && (
                            <span>Max Tokens: {model.maxTokens.toLocaleString()}</span>
                          )}
                          {model.costPer1kTokens && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${model.costPer1kTokens.toFixed(6)}/1K tokens
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center">
                        {model.settings?.enabled ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No models found</p>
                <p className="text-sm">
                  Try adjusting your search criteria or seed some models to get started.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 