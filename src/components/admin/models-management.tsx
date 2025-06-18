"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, FileUp, Image, Eye, Zap, DollarSign } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface ModelFormData {
  name: string;
  slug: string;
  provider: string;
  description: string;
  supportsFileUpload: boolean;
  supportsImageUpload: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  maxTokens: string;
  costPer1kTokens: string;
}

const initialFormData: ModelFormData = {
  name: "",
  slug: "",
  provider: "",
  description: "",
  supportsFileUpload: false,
  supportsImageUpload: false,
  supportsVision: false,
  supportsStreaming: false,
  maxTokens: "",
  costPer1kTokens: "",
};

export function ModelsManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Id<"models"> | null>(null);
  const [formData, setFormData] = useState<ModelFormData>(initialFormData);

  const models = useQuery(api.models.getModelsWithSettings);
  const createModel = useMutation(api.models.createModel);
  const updateModel = useMutation(api.models.updateModel);
  const deleteModel = useMutation(api.models.deleteModel);
  const seedModels = useMutation(api.seedModels.seedSampleModels);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const modelData = {
        name: formData.name,
        slug: formData.slug,
        provider: formData.provider,
        description: formData.description || undefined,
        supportsFileUpload: formData.supportsFileUpload,
        supportsImageUpload: formData.supportsImageUpload,
        supportsVision: formData.supportsVision,
        supportsStreaming: formData.supportsStreaming,
        maxTokens: formData.maxTokens ? parseInt(formData.maxTokens) : undefined,
        costPer1kTokens: formData.costPer1kTokens ? parseFloat(formData.costPer1kTokens) : undefined,
      };

      if (editingModel) {
        await updateModel({
          id: editingModel,
          ...modelData,
        });
      } else {
        await createModel(modelData);
      }

      setFormData(initialFormData);
      setIsAddDialogOpen(false);
      setEditingModel(null);
    } catch (error) {
      console.error("Error saving model:", error);
    }
  };

  const handleEdit = (model: NonNullable<typeof models>[0]) => {
    setFormData({
      name: model.name,
      slug: model.slug,
      provider: model.provider,
      description: model.description || "",
      supportsFileUpload: model.supportsFileUpload,
      supportsImageUpload: model.supportsImageUpload,
      supportsVision: model.supportsVision,
      supportsStreaming: model.supportsStreaming,
      maxTokens: model.maxTokens?.toString() || "",
      costPer1kTokens: model.costPer1kTokens?.toString() || "",
    });
    setEditingModel(model._id);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (modelId: Id<"models">) => {
    if (confirm("Are you sure you want to delete this model? This will also delete all associated settings.")) {
      try {
        await deleteModel({ id: modelId });
      } catch (error) {
        console.error("Error deleting model:", error);
      }
    }
  };

  const handleSeedModels = async () => {
    try {
      const result = await seedModels({});
      alert(result.message);
    } catch (error) {
      console.error("Error seeding models:", error);
      alert("Failed to seed models. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingModel(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Models Management</h2>
          <p className="text-muted-foreground">
            Add, edit, and manage AI models available in your chat application
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeedModels}>
            🌱 Seed Sample Models
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Model
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingModel ? "Edit Model" : "Add New Model"}
              </DialogTitle>
              <DialogDescription>
                Configure the model details and capabilities
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Model Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Claude 3 Haiku"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Model Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g., anthropic/claude-3-haiku"
                    required
                    disabled={!!editingModel}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Input
                  id="provider"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  placeholder="e.g., anthropic, openai, google"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the model..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens (Optional)</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData({ ...formData, maxTokens: e.target.value })}
                    placeholder="e.g., 4096"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costPer1kTokens">Cost per 1K Tokens (USD)</Label>
                  <Input
                    id="costPer1kTokens"
                    type="number"
                    step="0.001"
                    value={formData.costPer1kTokens}
                    onChange={(e) => setFormData({ ...formData, costPer1kTokens: e.target.value })}
                    placeholder="e.g., 0.003"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Model Capabilities</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="supportsFileUpload"
                      checked={formData.supportsFileUpload}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, supportsFileUpload: checked })
                      }
                    />
                    <Label htmlFor="supportsFileUpload" className="flex items-center gap-2">
                      <FileUp className="h-4 w-4" />
                      File Upload
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="supportsImageUpload"
                      checked={formData.supportsImageUpload}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, supportsImageUpload: checked })
                      }
                    />
                    <Label htmlFor="supportsImageUpload" className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Image Upload
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="supportsVision"
                      checked={formData.supportsVision}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, supportsVision: checked })
                      }
                    />
                    <Label htmlFor="supportsVision" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Vision
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="supportsStreaming"
                      checked={formData.supportsStreaming}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, supportsStreaming: checked })
                      }
                    />
                    <Label htmlFor="supportsStreaming" className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Streaming
                    </Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingModel ? "Update Model" : "Add Model"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Models List */}
      <div className="grid gap-4">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {models?.map((model: any) => (
          <Card key={model._id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {model.name}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({model.slug})
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Provider: {model.provider}
                    {model.description && ` • ${model.description}`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(model)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(model._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <FileUp className={`h-4 w-4 ${model.supportsFileUpload ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <span>File Upload</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Image className={`h-4 w-4 ${model.supportsImageUpload ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <span>Image Upload</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Eye className={`h-4 w-4 ${model.supportsVision ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <span>Vision</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className={`h-4 w-4 ${model.supportsStreaming ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <span>Streaming</span>
                </div>
              </div>
              
              {(model.maxTokens || model.costPer1kTokens) && (
                <div className="flex items-center gap-4 mt-4 pt-4 border-t text-sm text-muted-foreground">
                  {model.maxTokens && (
                    <span>Max Tokens: {model.maxTokens.toLocaleString()}</span>
                  )}
                  {model.costPer1kTokens && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {model.costPer1kTokens}/1K tokens
                    </span>
                  )}
                </div>
              )}

              {model.settings && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      model.settings.enabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {model.settings.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {models?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No models configured yet</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Model
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 