"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { ChevronDown, Check, Key, DollarSign } from "lucide-react"

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  disabled?: boolean
}

export function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const enabledModels = useQuery(api.userModelPreferences.getUserEnabledModels)
  const providerKeys = useQuery(api.providerKeys.getUserProviderKeys) || []
  
  if (!enabledModels) {
    return (
      <div className="px-3 py-1.5 text-sm text-gray-400">
        Loading models...
      </div>
    )
  }
  
  // Check which providers have valid user keys
  const userProviders = new Set(
    providerKeys
      .filter((key: any) => key.isActive && key.validationStatus === "valid")
      .map((key: any) => key.provider)
  )
  
  const models = enabledModels.map((model: any) => ({
    id: model.slug,
    name: model.name,
    provider: model.provider,
    hasUserKey: userProviders.has(model.provider),
    costPer1kTokens: model.costPer1kTokens,
  }))
  
  // Sort models: user's own keys first, then by cost
  const sortedModels = [...models].sort((a, b) => {
    if (a.hasUserKey && !b.hasUserKey) return -1
    if (!a.hasUserKey && b.hasUserKey) return 1
    if (a.costPer1kTokens && b.costPer1kTokens) {
      return a.costPer1kTokens - b.costPer1kTokens
    }
    return a.name.localeCompare(b.name)
  })
  
  const currentModel = models.find((m: any) => m.id === selectedModel) || models[0]
  
  if (!currentModel) {
    return (
      <div className="px-3 py-1.5 text-sm text-gray-400">
        No models available
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="font-medium">{currentModel.name}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
            {sortedModels.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id)
                  setIsOpen(false)
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors flex items-center justify-between group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-gray-900 text-sm">{model.name}</div>
                    {model.hasUserKey && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                        <Key className="h-3 w-3" />
                        <span>Your Key</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{model.provider}</span>
                    {model.costPer1kTokens && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${model.costPer1kTokens.toFixed(6)}/1K
                      </span>
                    )}
                  </div>
                </div>
                {model.id === selectedModel && (
                  <Check className="h-4 w-4 text-orange-500" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
} 