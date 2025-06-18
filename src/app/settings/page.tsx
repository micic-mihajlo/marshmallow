"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Eye, 
  FileUp, 
  Image, 
  Zap, 
  DollarSign, 
  Loader2,
  Save,
  RotateCcw,
  CheckCircle
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface ModelPreference {
  modelId: Id<"models">;
  isEnabled: boolean;
  displayOrder?: number;
}

export default function SettingsPage() {
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<ModelPreference[]>([]);

  const modelPreferences = useQuery(api.userModelPreferences.getUserModelPreferences);
  const updatePreferences = useMutation(api.userModelPreferences.updateUserModelPreferences);
  const resetPreferences = useMutation(api.userModelPreferences.resetUserModelPreferences);

  // Initialize preferences when data loads
  useState(() => {
    if (modelPreferences && preferences.length === 0) {
      const initialPrefs = modelPreferences.map(model => ({
        modelId: model._id,
        isEnabled: model.userEnabled,
        displayOrder: model.displayOrder,
      }));
      setPreferences(initialPrefs);
    }
  });

  const handleToggleModel = (modelId: Id<"models">, enabled: boolean) => {
    setPreferences(prev => {
      const updated = prev.map(pref => 
        pref.modelId === modelId 
          ? { ...pref, isEnabled: enabled }
          : pref
      );
      
      // If model doesn't exist in preferences, add it
      if (!updated.find(p => p.modelId === modelId)) {
        updated.push({ modelId, isEnabled: enabled });
      }
      
      return updated;
    });
    setHasChanges(true);
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      await updatePreferences({ preferences });
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("Failed to save preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPreferences = async () => {
    if (confirm("Are you sure you want to reset your model preferences? This will enable all available models.")) {
      setIsSaving(true);
      try {
        await resetPreferences();
        // Reset local state
        if (modelPreferences) {
          const resetPrefs = modelPreferences.map(model => ({
            modelId: model._id,
            isEnabled: true,
            displayOrder: model.displayOrder,
          }));
          setPreferences(resetPrefs);
        }
        setHasChanges(false);
      } catch (error) {
        console.error("Error resetting preferences:", error);
        alert("Failed to reset preferences. Please try again.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Group models by provider
  const groupedModels = modelPreferences?.reduce((acc, model) => {
    const provider = model.provider;
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push(model);
    return acc;
  }, {} as Record<string, typeof modelPreferences>) || {};

  const providers = Object.keys(groupedModels).sort();

  const stats = {
    total: modelPreferences?.length || 0,
    enabled: preferences.filter(p => p.isEnabled).length,
    providers: providers.length,
  };

  if (!modelPreferences) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Model Preferences</h1>
          <p className="text-muted-foreground">
            Choose which AI models you want to use in your conversations
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleResetPreferences}
            disabled={isSaving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <Button 
            onClick={handleSavePreferences}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Preferences
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Models</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Enabled Models</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.enabled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Providers</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.providers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Changes Alert */}
      {hasChanges && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  You have unsaved changes to your model preferences
                </span>
              </div>
              <Button size="sm" onClick={handleSavePreferences} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Models by Provider */}
      <Tabs defaultValue={providers[0] || "all"} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-8">
          {providers.slice(0, 8).map((provider) => (
            <TabsTrigger key={provider} value={provider} className="text-xs">
              {provider.charAt(0).toUpperCase() + provider.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {providers.map((provider) => (
          <TabsContent key={provider} value={provider} className="space-y-4">
            <div className="grid gap-4">
              {groupedModels[provider]?.map((model) => {
                const userPref = preferences.find(p => p.modelId === model._id);
                const isEnabled = userPref?.isEnabled ?? model.userEnabled;

                return (
                  <Card key={model._id} className="transition-all hover:shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={isEnabled}
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
                            <Badge variant={isEnabled ? "default" : "secondary"}>
                              {isEnabled ? "Enabled" : "Disabled"}
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
                          {isEnabled ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }) || (
                <div className="text-center py-8 text-muted-foreground">
                  No models found for {provider}
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {modelPreferences.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No models available</p>
              <p className="text-sm">
                Contact your administrator to enable models for use.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 