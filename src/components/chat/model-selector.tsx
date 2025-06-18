"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { ChevronDown, Check } from "lucide-react"


interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  disabled?: boolean
  dropdownDirection?: "up" | "down"
}

export function ModelSelector({ selectedModel, onModelChange, disabled, dropdownDirection = "down" }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const enabledModels = useQuery(api.userModelPreferences.getUserEnabledModels)
  
  if (!enabledModels) {
    return (
      <div className="px-4 py-3 text-sm text-gray-500 bg-gray-50/80 rounded-xl border border-gray-200 animate-pulse">
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
      >
        <div className="flex flex-col items-start gap-0.5">
          <span className="font-semibold text-gray-900">{currentModel.name}</span>
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
              >
                <div className="flex flex-col gap-0.5">
                  <div className="font-semibold text-gray-900 text-sm group-hover:text-gray-800">{model.name}</div>
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