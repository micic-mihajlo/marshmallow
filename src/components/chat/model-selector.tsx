"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { ChevronDown, Check, Key } from "lucide-react"
import { Badge } from "@/components/ui/badge"


interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  disabled?: boolean
  dropdownDirection?: "up" | "down"
}

export function ModelSelector({ selectedModel, onModelChange, disabled, dropdownDirection = "down" }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const enabledModels = useQuery(api.userModelPreferences.getUserEnabledModels)
  const allEnabledModels = useQuery(api.models.getEnabledModels) // Fallback to all admin-enabled models
  const user = useQuery(api.users.getCurrentUser)
  
  if (!enabledModels || !allEnabledModels) {
    return (
      <div className="px-4 py-3 text-sm text-gray-500 bg-gray-50/80 rounded-xl border border-gray-200 animate-pulse">
        Loading models...
      </div>
    )
  }
  
  // Use user's enabled models, but if the selected model is not in there, add just that model
  const selectedInUserModels = enabledModels.find(m => m.slug === selectedModel);
  const modelsToShow = [...enabledModels];
  
  if (!selectedInUserModels && selectedModel) {
    // If the selected model is not in user's enabled models, add just that specific model
    // This happens when switching to conversations that use models not in user preferences
    const conversationModel = allEnabledModels.find(m => m.slug === selectedModel);
    if (conversationModel) {
      modelsToShow.push({
        ...conversationModel,
        isDefault: conversationModel.slug === "google/gemini-2.0-flash-exp" || conversationModel.slug === "google/gemini-2.5-flash-preview-05-20",
        canDisable: !(conversationModel.slug === "google/gemini-2.0-flash-exp" || conversationModel.slug === "google/gemini-2.5-flash-preview-05-20"),
      });
    }
  }
  
  const models = modelsToShow.map(model => ({
    id: model.slug,
    name: model.name,
    provider: model.provider,
    isDefault: model.isDefault || false,
    canDisable: model.canDisable !== false,
  }))

  // Check if user has BYOK configured
  const hasBYOK = user?.useBYOK && user?.apiKey

  // Helper function to determine if a model likely requires BYOK
  // This is a simplified check - in production, you'd query the actual model requirements
  const requiresBYOK = (modelId: string) => {
    const expensiveModels = [
      'openai/o1-pro', 'openai/gpt-4.5-preview', 'openai/gpt-4', 'openai/o3-pro',
      'openai/o1-preview', 'openai/o1', 'anthropic/claude-opus-4', 'anthropic/claude-3-opus'
    ];
    return expensiveModels.some(expensive => modelId.includes(expensive.split('/')[1])) ||
           modelId.includes('gpt-4') || modelId.includes('claude-3-opus') || modelId.includes('o1');
  }
  
  const currentModel = models.find(m => m.id === selectedModel) || models[0]
  
  if (!currentModel) {
    return (
      <div className="px-4 py-3 text-sm text-gray-500 bg-gray-50/80 rounded-xl border border-gray-200">
        No models available
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center justify-between w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300"
        type="button"
      >
        <div className="flex flex-col items-start gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{currentModel.name}</span>
            {currentModel.isDefault && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                Default
              </Badge>
            )}
            {requiresBYOK(currentModel.id) && (
              <Badge variant={hasBYOK ? "default" : "destructive"} className="text-xs px-1.5 py-0.5">
                <Key className="h-3 w-3 mr-1" />
                BYOK
              </Badge>
            )}
          </div>
          <span className="text-xs text-gray-600 font-medium">{currentModel.provider}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ml-4 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className={`absolute ${dropdownDirection === "up" ? "bottom-full mb-2" : "top-full mt-2"} right-0 w-60 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden`}>
            {models.map((model, index) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between group ${
                  index !== models.length - 1 ? 'border-b border-gray-100' : ''
                }`}
                type="button"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-gray-900 text-sm group-hover:text-gray-800">{model.name}</div>
                    {model.isDefault && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                        Default
                      </Badge>
                    )}
                    {requiresBYOK(model.id) && (
                      <Badge variant={hasBYOK ? "default" : "destructive"} className="text-xs px-1.5 py-0.5">
                        <Key className="h-3 w-3 mr-1" />
                        BYOK
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 font-medium">{model.provider}</div>
                </div>
                {model.id === selectedModel && (
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-orange-500" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
} 