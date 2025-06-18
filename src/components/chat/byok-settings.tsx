"use client"

import { useState } from "react"
import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"

interface BYOKSettingsProps {
  children: React.ReactNode
}

export function BYOKSettings({ children }: BYOKSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null)

  const userApiKeyStatus = useQuery(api.userApiKeys.getUserApiKey)
  const encryptApiKey = useAction(api.byok.encryptApiKey)
  const testApiKey = useAction(api.byok.testApiKey)
  const updateUserApiKey = useMutation(api.userApiKeys.updateUserApiKey)
  const updateBYOKPreference = useMutation(api.userApiKeys.updateBYOKPreference)
  const removeUserApiKey = useMutation(api.userApiKeys.removeUserApiKey)

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      console.log("No API key entered")
      return
    }

    setIsLoading(true)
    setTestResult(null)
    
    try {
      // First test the API key
      console.log("[BYOK] Testing API key before saving...")
      const testResponse = await testApiKey({ apiKey: apiKey.trim() })
      
      if (!testResponse.valid) {
        console.error("[BYOK] API key test failed:", testResponse.message)
        setTestResult({ valid: false, message: testResponse.message })
        return
      }
      
      console.log("[BYOK] API key test passed:", testResponse.message)
      setTestResult({ valid: true, message: testResponse.message })
      
      // If test passes, encrypt and save the API key
      const encryptedKey = await encryptApiKey({ apiKey: apiKey.trim() })
      
      // Save to database
      await updateUserApiKey({ encryptedApiKey: encryptedKey })
      
      // Enable BYOK preference
      await updateBYOKPreference({ useBYOK: true })
      
      setApiKey("")
      setIsOpen(false)
      console.log("API key saved successfully")
    } catch (error) {
      console.error("Failed to save API key:", error)
      setTestResult({ 
        valid: false, 
        message: error instanceof Error ? error.message : "Failed to save API key" 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveApiKey = async () => {
    if (!confirm("Are you sure you want to remove your API key? You'll fall back to using the system default.")) {
      return
    }

    setIsLoading(true)
    try {
      // Remove the API key using the dedicated remove function
      await removeUserApiKey({})
      console.log("API key removed successfully")
      setTestResult(null)
      setIsOpen(false) // Close the dialog after successful removal
    } catch (error) {
      console.error("Failed to remove API key:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleApiKey = async (enabled: boolean) => {
    if (enabled) {
      // If enabling but no API key is saved, show an alert
      if (!userApiKeyStatus?.hasApiKey) {
        console.log("Please save an API key first before enabling BYOK mode")
        return
      }
      
      setIsLoading(true)
      try {
        await updateBYOKPreference({ useBYOK: true })
        console.log("BYOK mode enabled")
      } catch (error) {
        console.error("Failed to enable BYOK:", error)
      } finally {
        setIsLoading(false)
      }
    } else {
      // If disabling, just update the preference but keep the key
      if (!confirm("Are you sure you want to disable BYOK mode? You'll fall back to using the system default. Your saved key will be preserved.")) {
        return
      }
      
      setIsLoading(true)
      try {
        await updateBYOKPreference({ useBYOK: false })
        console.log("BYOK mode disabled successfully")
      } catch (error) {
        console.error("Failed to disable BYOK:", error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <div className="space-y-4">
          <div>
            <DialogTitle className="text-lg font-semibold text-gray-900">Bring Your Own Key (BYOK)</DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              Configure your own OpenRouter API key for unlimited usage and better privacy.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Current Status</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {userApiKeyStatus?.useBYOK ? "Using your own API key" : "Using system default"}
                </p>
              </div>
              <Switch 
                checked={userApiKeyStatus?.useBYOK || false}
                onCheckedChange={handleToggleApiKey}
                disabled={isLoading}
              />
            </div>
            {userApiKeyStatus?.hasApiKey && !userApiKeyStatus?.useBYOK && (
              <p className="text-xs text-amber-600 mt-2">
                You have an API key saved but BYOK mode is disabled.
              </p>
            )}
            {!userApiKeyStatus?.hasApiKey && (
              <p className="text-xs text-gray-500 mt-2">
                Save an API key below to enable BYOK mode.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="apiKey" className="text-sm font-medium text-gray-700 block mb-2">
                OpenRouter API Key
              </Label>
              <div className="space-y-2">
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setTestResult(null) // Clear test result when key changes
                  }}
                  disabled={isLoading}
                  className="bg-white border border-gray-200 rounded-lg"
                />
                <p className="text-xs text-gray-500">
                  Get your API key from{" "}
                  <a 
                    href="https://openrouter.ai/keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    OpenRouter Dashboard
                  </a>
                </p>
              </div>
              
              {testResult && (
                <div className={`text-xs p-3 rounded-lg mt-2 ${
                  testResult.valid 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {testResult.message}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleSaveApiKey} 
                disabled={isLoading || !apiKey.trim()}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
              >
                {isLoading ? "Testing & Saving..." : "Save API Key"}
              </Button>
              
              {userApiKeyStatus?.hasApiKey && (
                <Button 
                  variant="outline" 
                  onClick={handleRemoveApiKey}
                  disabled={isLoading}
                  className="rounded-lg border-gray-200 hover:bg-gray-50"
                >
                  Remove
                </Button>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">Benefits of BYOK:</h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Unlimited usage based on your OpenRouter account</li>
                <li>• Direct billing to your OpenRouter account</li>
                <li>• Enhanced privacy - your API key is encrypted</li>
                <li>• Access to all OpenRouter models</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 