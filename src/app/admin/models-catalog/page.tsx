"use client"

import { AdminGuard } from "@/components/admin/admin-guard"
import { ModelsCatalogManager } from "@/components/admin/models-catalog"

export default function ModelsCatalogPage() {
  return (
    <AdminGuard>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">OpenRouter Models Catalog</h1>
          <p className="text-gray-600 mt-2">
            View, filter, and manage OpenRouter models. Configure which models require BYOK access.
          </p>
        </div>
        
        <ModelsCatalogManager />
      </div>
    </AdminGuard>
  )
} 