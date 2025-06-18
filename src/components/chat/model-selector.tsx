"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { ChevronDown, Check } from "lucide-react"


interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  disabled?: boolean
}

export function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const enabledModels = useQuery(api.userModelPreferences.getUserEnabledModels)
  
  if (!enabledModels) {
    return (
      <div className="px-3 py-1.5 text-sm text-gray-400">
        Loading models...
      </div>
    )
  }
  
  const models = enabledModels.map(model => ({
    id: model.slug,
    name: model.name,
    provider: model.provider,
  }))
  
  const currentModel = models.find(m => m.id === selectedModel) || models[0]
  
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
          <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id)
                  setIsOpen(false)
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="font-medium text-gray-900 text-sm">{model.name}</div>
                  <div className="text-xs text-gray-500">{model.provider}</div>
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