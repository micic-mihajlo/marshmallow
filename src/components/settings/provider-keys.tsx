"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Key, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  EyeOff
} from "lucide-react";

const PROVIDER_INFO = {
  openai: {
    name: "OpenAI",
    keyFormat: "sk-...",
    description: "Access GPT-4, GPT-4o, and other OpenAI models",
    helpUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    name: "Anthropic",
    keyFormat: "sk-ant-...",
    description: "Access Claude 3.5 Sonnet, Claude 3 Opus, and other Anthropic models",
    helpUrl: "https://console.anthropic.com/",
  },
  google: {
    name: "Google AI",
    keyFormat: "AI...",
    description: "Access Gemini 2.0 Flash, Gemini 1.5 Pro, and other Google models",
    helpUrl: "https://aistudio.google.com/app/apikey",
  },
  openrouter: {
    name: "OpenRouter",
    keyFormat: "sk-or-...",
    description: "Access 200+ models from multiple providers",
    helpUrl: "https://openrouter.ai/keys",
  },
};

type Provider = keyof typeof PROVIDER_INFO;

interface ProviderKey {
  _id: string;
  provider: string;
  isActive: boolean;
  createdAt: number;
  lastUsed?: number;
  lastValidated?: number;
  validationStatus?: string;
}

export function ProviderKeys() {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");

  // Fetch user's provider keys
  const providerKeys = useQuery(api.providerKeys.getUserProviderKeys) || [];
  
  // Mutations
  const storeProviderKey = useMutation(api.providerKeys.storeProviderKey);
  const removeProviderKey = useMutation(api.providerKeys.removeProviderKey);

  const handleAddKey = async () => {
    if (!selectedProvider || !apiKey.trim()) return;

    setIsSubmitting(true);
    setValidationMessage("");

    try {
      // First, validate and encrypt the key via API
      const response = await fetch("/api/byok/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKey.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to process API key");
      }

      // Store the encrypted key in Convex
      await storeProviderKey({
        provider: selectedProvider,
        keyCipher: result.encryptedData.keyCipher,
        iv: result.encryptedData.iv,
        keyHash: result.encryptedData.keyHash,
      });

      setValidationMessage(`✅ ${result.validationMessage}`);
      setApiKey("");
      setSelectedProvider(null);
    } catch (error) {
      console.error("Error adding provider key:", error);
      setValidationMessage(`❌ ${error instanceof Error ? error.message : "Failed to add API key"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveKey = async (provider: string) => {
    if (!confirm(`Are you sure you want to remove your ${PROVIDER_INFO[provider as Provider]?.name} API key?`)) {
      return;
    }

    try {
      await removeProviderKey({ provider });
    } catch (error) {
      console.error("Error removing provider key:", error);
      alert("Failed to remove API key. Please try again.");
    }
  };

  const getStatusBadge = (key: ProviderKey) => {
    switch (key.validationStatus) {
      case "valid":
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Valid
        </Badge>;
      case "invalid":
        return <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Invalid
        </Badge>;
      case "expired":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Expired
        </Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const availableProviders = Object.keys(PROVIDER_INFO).filter(
    provider => !providerKeys.some(key => key.provider === provider && key.isActive)
  ) as Provider[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Keys</h2>
          <p className="text-gray-600 mt-1">
            Bring your own API keys to use premium models at cost
          </p>
        </div>
        
        {availableProviders.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add API Key</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="provider">Provider</Label>
                  <select
                    id="provider"
                    className="w-full mt-1 p-2 border rounded-md"
                    value={selectedProvider || ""}
                    onChange={(e) => setSelectedProvider(e.target.value as Provider || null)}
                  >
                    <option value="">Select a provider</option>
                    {availableProviders.map((provider) => (
                      <option key={provider} value={provider}>
                        {PROVIDER_INFO[provider].name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProvider && (
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900">
                        {PROVIDER_INFO[selectedProvider].name}
                      </h4>
                      <p className="text-sm text-blue-700 mt-1">
                        {PROVIDER_INFO[selectedProvider].description}
                      </p>
                      <p className="text-sm text-blue-600 mt-2">
                        Expected format: <code className="bg-blue-100 px-1 rounded">
                          {PROVIDER_INFO[selectedProvider].keyFormat}
                        </code>
                      </p>
                      <a
                        href={PROVIDER_INFO[selectedProvider].helpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                      >
                        Get your API key →
                      </a>
                    </div>

                    <div>
                      <Label htmlFor="apiKey">API Key</Label>
                      <div className="relative">
                        <Input
                          id="apiKey"
                          type={showKey ? "text" : "password"}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder={`Enter your ${PROVIDER_INFO[selectedProvider].name} API key`}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {validationMessage && (
                      <div className="text-sm p-3 rounded-md bg-gray-50">
                        {validationMessage}
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedProvider(null);
                          setApiKey("");
                          setValidationMessage("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddKey}
                        disabled={!selectedProvider || !apiKey.trim() || isSubmitting}
                      >
                        {isSubmitting ? "Validating..." : "Add Key"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Provider Keys List */}
      <div className="space-y-4">
        {providerKeys.length === 0 ? (
          <Card className="p-8 text-center">
            <Key className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No API Keys</h3>
            <p className="text-gray-600 mb-4">
              Add your API keys to use premium models at cost
            </p>
                         {availableProviders.length > 0 && (
               <Dialog>
                 <DialogTrigger asChild>
                   <Button>
                     <Plus className="w-4 h-4 mr-2" />
                     Add Your First API Key
                   </Button>
                 </DialogTrigger>
                 <DialogContent className="max-w-2xl">
                   <DialogHeader>
                     <DialogTitle>Add API Key</DialogTitle>
                   </DialogHeader>
                   
                   <div className="space-y-4">
                     <div>
                       <Label htmlFor="provider-empty">Provider</Label>
                       <select
                         id="provider-empty"
                         className="w-full mt-1 p-2 border rounded-md"
                         value={selectedProvider || ""}
                         onChange={(e) => setSelectedProvider(e.target.value as Provider || null)}
                       >
                         <option value="">Select a provider</option>
                         {availableProviders.map((provider) => (
                           <option key={provider} value={provider}>
                             {PROVIDER_INFO[provider].name}
                           </option>
                         ))}
                       </select>
                     </div>

                     {selectedProvider && (
                       <>
                         <div className="bg-blue-50 p-4 rounded-lg">
                           <h4 className="font-medium text-blue-900">
                             {PROVIDER_INFO[selectedProvider].name}
                           </h4>
                           <p className="text-sm text-blue-700 mt-1">
                             {PROVIDER_INFO[selectedProvider].description}
                           </p>
                           <p className="text-sm text-blue-600 mt-2">
                             Expected format: <code className="bg-blue-100 px-1 rounded">
                               {PROVIDER_INFO[selectedProvider].keyFormat}
                             </code>
                           </p>
                           <a
                             href={PROVIDER_INFO[selectedProvider].helpUrl}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="text-sm text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                           >
                             Get your API key →
                           </a>
                         </div>

                         <div>
                           <Label htmlFor="apiKey-empty">API Key</Label>
                           <div className="relative">
                             <Input
                               id="apiKey-empty"
                               type={showKey ? "text" : "password"}
                               value={apiKey}
                               onChange={(e) => setApiKey(e.target.value)}
                               placeholder={`Enter your ${PROVIDER_INFO[selectedProvider].name} API key`}
                               className="pr-10"
                             />
                             <button
                               type="button"
                               onClick={() => setShowKey(!showKey)}
                               className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                             >
                               {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                             </button>
                           </div>
                         </div>

                         {validationMessage && (
                           <div className="text-sm p-3 rounded-md bg-gray-50">
                             {validationMessage}
                           </div>
                         )}

                         <div className="flex justify-end space-x-2">
                           <Button
                             variant="outline"
                             onClick={() => {
                               setSelectedProvider(null);
                               setApiKey("");
                               setValidationMessage("");
                             }}
                           >
                             Cancel
                           </Button>
                           <Button
                             onClick={handleAddKey}
                             disabled={!selectedProvider || !apiKey.trim() || isSubmitting}
                           >
                             {isSubmitting ? "Validating..." : "Add Key"}
                           </Button>
                         </div>
                       </>
                     )}
                   </div>
                 </DialogContent>
               </Dialog>
             )}
          </Card>
        ) : (
          <div className="grid gap-4">
            {providerKeys.map((key) => (
              <Card key={key._id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Key className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {PROVIDER_INFO[key.provider as Provider]?.name || key.provider}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Added {formatDate(key.createdAt)}
                        {key.lastUsed && ` • Last used ${formatDate(key.lastUsed)}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(key)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveKey(key.provider)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Information Section */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-2">
              Secure & Private
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your API keys are encrypted and stored securely</li>
              <li>• Keys are validated before storage</li>
              <li>• Only you can access your encrypted keys</li>
              <li>• Remove keys anytime to revoke access</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
} 