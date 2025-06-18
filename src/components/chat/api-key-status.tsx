"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Badge } from "@/components/ui/badge"

export function ApiKeyStatus() {
  const userApiKeyStatus = useQuery(api.userApiKeys.getUserApiKey)

  if (userApiKeyStatus === undefined) {
    return (
      <Badge variant="secondary" className="text-xs">
        Loading...
      </Badge>
    )
  }

  if (userApiKeyStatus?.useBYOK && userApiKeyStatus?.hasApiKey) {
    return (
      <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
        Using Your Key
      </Badge>
    )
  }

  if (userApiKeyStatus?.hasApiKey && !userApiKeyStatus?.useBYOK) {
    return (
      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 border-amber-200">
        Key Saved (Disabled)
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="text-xs">
      System Default
    </Badge>
  )
} 