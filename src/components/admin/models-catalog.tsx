"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Download, Search, Filter, RefreshCw, Eye, Settings } from "lucide-react"

interface ModelData {
  id: string
  name: string
  provider: string
  description: string
  created: number
  pricing: {
    prompt: number
    completion: number
    image: number
    request: number
    promptPer1M: number
    completionPer1M: number
  }
  capabilities: {
    supportsText: boolean
    supportsImages: boolean
    outputsText: boolean
    contextLength: number
    tokenizer: string
  }
  moderation: {
    isModerated: boolean
  }
  huggingFaceId: string | null
  supportedParameters: string[]
  perRequestLimits: Record<string, unknown>
  requiresBYOK: boolean
  isEnabled: boolean
  notes: string
}

interface ModelsData {
  fetchedAt: string
  stats: {
    totalModels: number
    providers: string[]
    byProvider: Record<string, number>
    priceRanges: {
      promptMin: number
      promptMax: number
      completionMin: number
      completionMax: number
    }
    capabilities: {
      withImages: number
      textOnly: number
      moderated: number
    }
  }
  models: ModelData[]
}

export function ModelsCatalogManager() {
  const [modelsData, setModelsData] = useState<ModelsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<string>("all")
  const [showBYOKOnly, setShowBYOKOnly] = useState(false)
  const [showImageModels, setShowImageModels] = useState<string>("all") // all, yes, no
  const [sortBy, setSortBy] = useState<string>("name") // name, price, provider, context
  const [sortOrder, setSortOrder] = useState<string>("asc")

  useEffect(() => {
    loadModelsData()
  }, [])

  const loadModelsData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/data/openrouter-models.json')
      if (response.ok) {
        const data = await response.json()
        setModelsData(data)
      } else {
        console.error("Failed to load models data")
      }
    } catch (error) {
      console.error("Error loading models data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedModels = useMemo(() => {
    if (!modelsData) return []

    const filtered = modelsData.models.filter(model => {
      // Search filter
      if (searchTerm && !model.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !model.id.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !model.provider.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // Provider filter
      if (selectedProvider !== "all" && model.provider !== selectedProvider) {
        return false
      }

      // BYOK filter
      if (showBYOKOnly && !model.requiresBYOK) {
        return false
      }

      // Image support filter
      if (showImageModels === "yes" && !model.capabilities.supportsImages) {
        return false
      }
      if (showImageModels === "no" && model.capabilities.supportsImages) {
        return false
      }

      return true
    })

    // Sort
    filtered.sort((a, b) => {
      let valueA, valueB
      
      switch (sortBy) {
        case "provider":
          valueA = a.provider
          valueB = b.provider
          break
        case "price":
          valueA = a.pricing.promptPer1M
          valueB = b.pricing.promptPer1M
          break
        case "context":
          valueA = a.capabilities.contextLength
          valueB = b.capabilities.contextLength
          break
        case "name":
        default:
          valueA = a.name
          valueB = b.name
          break
      }

      if (typeof valueA === "string") {
        const comparison = valueA.localeCompare(valueB as string)
        return sortOrder === "asc" ? comparison : -comparison
      } else {
        const comparison = (valueA as number) - (valueB as number)
        return sortOrder === "asc" ? comparison : -comparison
      }
    })

    return filtered
  }, [modelsData, searchTerm, selectedProvider, showBYOKOnly, showImageModels, sortBy, sortOrder])

  const refreshData = async () => {
    try {
      setLoading(true)
      // This would ideally call an API endpoint that runs the fetch script
      const response = await fetch('/api/admin/refresh-models', { method: 'POST' })
      if (response.ok) {
        await loadModelsData()
      }
    } catch (error) {
      console.error("Error refreshing models:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleBYOK = async (modelId: string, requiresBYOK: boolean) => {
    // This would save to a database or configuration file
    console.log(`Toggle BYOK for ${modelId}: ${requiresBYOK}`)
    
    if (modelsData) {
      const updatedModels = modelsData.models.map(model =>
        model.id === modelId ? { ...model, requiresBYOK } : model
      )
      setModelsData({ ...modelsData, models: updatedModels })
    }
  }

  const formatPrice = (price: number) => {
    if (price === 0) return "Free"
    if (price < 0.001) return `$${(price * 1000000).toFixed(2)}/1M`
    return `$${price.toFixed(6)}`
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading models data...</p>
        </div>
      </div>
    )
  }

  if (!modelsData) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">Failed to load models data</p>
        <Button onClick={loadModelsData}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Models</CardDescription>
            <CardTitle className="text-2xl">{modelsData.stats.totalModels}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Providers</CardDescription>
            <CardTitle className="text-2xl">{modelsData.stats.providers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>With Images</CardDescription>
            <CardTitle className="text-2xl">{modelsData.stats.capabilities.withImages}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>BYOK Required</CardDescription>
            <CardTitle className="text-2xl">
              {modelsData.models.filter(m => m.requiresBYOK).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Provider Filter */}
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Providers</option>
              {modelsData.stats.providers.map(provider => (
                <option key={provider} value={provider}>
                  {provider} ({modelsData.stats.byProvider[provider]})
                </option>
              ))}
            </select>

            {/* Image Support Filter */}
            <select
              value={showImageModels}
              onChange={(e) => setShowImageModels(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Models</option>
              <option value="yes">With Images</option>
              <option value="no">Text Only</option>
            </select>

            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-')
                setSortBy(field)
                setSortOrder(order)
              }}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="provider-asc">Provider A-Z</option>
              <option value="price-asc">Price Low-High</option>
              <option value="price-desc">Price High-Low</option>
              <option value="context-desc">Context Length</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="byok-filter"
                checked={showBYOKOnly}
                onCheckedChange={setShowBYOKOnly}
              />
              <Label htmlFor="byok-filter">Show BYOK Only</Label>
            </div>

            <Button onClick={refreshData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredAndSortedModels.length} of {modelsData.stats.totalModels} models
      </div>

      {/* Models Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Model</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Provider</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Pricing</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Context</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Features</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">BYOK Required</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedModels.map((model) => (
                  <tr key={model.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-sm">{model.name}</div>
                        <div className="text-xs text-gray-500">{model.id}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{model.provider}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div>P: {formatPrice(model.pricing.prompt)}</div>
                        <div>C: {formatPrice(model.pricing.completion)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {model.capabilities.contextLength.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {model.capabilities.supportsImages && (
                          <Badge variant="secondary" className="text-xs">IMG</Badge>
                        )}
                        {model.moderation.isModerated && (
                          <Badge variant="secondary" className="text-xs">MOD</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                                           <Switch
                       checked={model.requiresBYOK}
                       onCheckedChange={(checked) => toggleBYOK(model.id, checked)}
                     />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filteredAndSortedModels.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No models match your current filters.
        </div>
      )}
    </div>
  )
} 