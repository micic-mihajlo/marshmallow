"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FileUp, Image, Eye, Zap, Settings2, Save } from "lucide-react";
import { useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";

export function ModelSettings() {
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  
  const models = useQuery(api.models.getModelsWithSettings);
  const updateModelSettings = useMutation(api.modelSettings.updateModelSettings);
  const toggleModelEnabled = useMutation(api.modelSettings.toggleModelEnabled);

  const handleSettingChange = (modelId: Id<"models">, field: string, value: any) => {
    setPendingChanges(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        [field]: value,
      }
    }));
  };

  const saveChanges = async (modelId: Id<"models">) => {
    const changes = pendingChanges[modelId];
    if (!changes) return;

    try {
      await updateModelSettings({
        modelId,
        ...changes,
      });
      
      // Remove from pending changes
      setPendingChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[modelId];
        return newChanges;
      });
    } catch (error) {
      console.error("Error updating model settings:", error);
    }
  };

  const handleToggleEnabled = async (modelId: Id<"models">) => {
    try {
      await toggleModelEnabled({ modelId });
    } catch (error) {
      console.error("Error toggling model:", error);
    }
  };

  const getEffectiveValue = (modelId: Id<"models">, field: string, currentValue: any) => {
    return pendingChanges[modelId]?.[field] ?? currentValue;
  };

  const hasPendingChanges = (modelId: Id<"models">) => {
    return !!pendingChanges[modelId] && Object.keys(pendingChanges[modelId]).length > 0;
  };

  if (!models) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-muted animate-pulse rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-4 bg-muted animate-pulse rounded"></div>
                <div className="h-4 bg-muted animate-pulse rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Model Settings</h2>
        <p className="text-muted-foreground">
          Configure which features are enabled for each model and set usage limits
        </p>
      </div>

      <div className="grid gap-6">
        {models.map((model) => (
          <Card key={model._id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    {model.name}
                  </CardTitle>
                  <CardDescription>
                    {model.provider} • {model.slug}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={model.settings?.enabled ?? false}
                    onCheckedChange={() => handleToggleEnabled(model._id)}
                  />
                  <Label>Enabled</Label>
                </div>
              </div>
            </CardHeader>
            
            {model.settings && (
              <CardContent className="space-y-6">
                {/* Feature Toggles */}
                <div>
                  <h4 className="text-sm font-medium mb-4">Feature Permissions</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`file-upload-${model._id}`} className="flex items-center gap-2">
                        <FileUp className="h-4 w-4" />
                        File Upload
                      </Label>
                      <Switch
                        id={`file-upload-${model._id}`}
                        checked={getEffectiveValue(model._id, 'allowFileUpload', model.settings.allowFileUpload)}
                        onCheckedChange={(checked) => 
                          handleSettingChange(model._id, 'allowFileUpload', checked)
                        }
                        disabled={!model.supportsFileUpload}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor={`image-upload-${model._id}`} className="flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Image Upload
                      </Label>
                      <Switch
                        id={`image-upload-${model._id}`}
                        checked={getEffectiveValue(model._id, 'allowImageUpload', model.settings.allowImageUpload)}
                        onCheckedChange={(checked) => 
                          handleSettingChange(model._id, 'allowImageUpload', checked)
                        }
                        disabled={!model.supportsImageUpload}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor={`vision-${model._id}`} className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Vision
                      </Label>
                      <Switch
                        id={`vision-${model._id}`}
                        checked={getEffectiveValue(model._id, 'allowVision', model.settings.allowVision)}
                        onCheckedChange={(checked) => 
                          handleSettingChange(model._id, 'allowVision', checked)
                        }
                        disabled={!model.supportsVision}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor={`streaming-${model._id}`} className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Streaming
                      </Label>
                      <Switch
                        id={`streaming-${model._id}`}
                        checked={getEffectiveValue(model._id, 'allowStreaming', model.settings.allowStreaming)}
                        onCheckedChange={(checked) => 
                          handleSettingChange(model._id, 'allowStreaming', checked)
                        }
                        disabled={!model.supportsStreaming}
                      />
                    </div>
                  </div>
                </div>

                {/* Usage Limits */}
                <div>
                  <h4 className="text-sm font-medium mb-4">Usage Limits</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`max-tokens-${model._id}`}>Max Tokens Override</Label>
                      <Input
                        id={`max-tokens-${model._id}`}
                        type="number"
                        placeholder={model.maxTokens?.toString() || "No limit"}
                        value={getEffectiveValue(model._id, 'maxTokensOverride', model.settings.maxTokensOverride) || ''}
                        onChange={(e) => 
                          handleSettingChange(model._id, 'maxTokensOverride', 
                            e.target.value ? parseInt(e.target.value) : undefined)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`rate-limit-${model._id}`}>Rate Limit (messages/hour)</Label>
                      <Input
                        id={`rate-limit-${model._id}`}
                        type="number"
                        placeholder="No limit"
                        value={getEffectiveValue(model._id, 'rateLimitPerUser', model.settings.rateLimitPerUser) || ''}
                        onChange={(e) => 
                          handleSettingChange(model._id, 'rateLimitPerUser', 
                            e.target.value ? parseInt(e.target.value) : undefined)
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Model Capabilities (Read-only) */}
                <div>
                  <h4 className="text-sm font-medium mb-4">Model Capabilities</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <FileUp className={`h-4 w-4 ${model.supportsFileUpload ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span className={model.supportsFileUpload ? '' : 'text-muted-foreground'}>
                        File Upload {model.supportsFileUpload ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Image className={`h-4 w-4 ${model.supportsImageUpload ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span className={model.supportsImageUpload ? '' : 'text-muted-foreground'}>
                        Image Upload {model.supportsImageUpload ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Eye className={`h-4 w-4 ${model.supportsVision ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span className={model.supportsVision ? '' : 'text-muted-foreground'}>
                        Vision {model.supportsVision ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className={`h-4 w-4 ${model.supportsStreaming ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span className={model.supportsStreaming ? '' : 'text-muted-foreground'}>
                        Streaming {model.supportsStreaming ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                {hasPendingChanges(model._id) && (
                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={() => saveChanges(model._id)}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}

        {models.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No models configured yet</p>
              <p className="text-sm text-muted-foreground">
                Add models in the Models tab to configure their settings
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 