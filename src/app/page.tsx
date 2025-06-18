"use client"

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Key, Upload, Share2, BarChart3, CheckCircle, ArrowRight, Settings, Users, Zap } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { AuroraText } from "@/components/magicui/aurora-text"

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth()
  const [mounted, setMounted] = useState(false)

  // Handle hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 font-sans antialiased">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-6xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl mt-4 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 bg-white rounded-xl flex items-center justify-center shadow-lg border border-slate-200">
            <Image src="/marshmallow.png" alt="Marshmallow Logo" width={32} height={32} className="rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Marshmallow</h1>
            <div className="bg-slate-800 text-white px-2.5 py-0.5 rounded-md text-xs font-medium">BETA</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isLoaded && !isSignedIn && (
            <SignInButton mode="modal">
              <Button variant="outline" className="font-medium border-slate-300 text-slate-700 hover:bg-slate-50">
                Sign In
              </Button>
            </SignInButton>
          )}

          {isLoaded && isSignedIn && (
            <>
              <Link href="/chat">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm">
                  Go to Chat <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </>
          )}

          {!isLoaded && (
            <Button variant="outline" disabled>
              Loading...
            </Button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-20">
          <h1 className="text-6xl font-bold text-slate-900 mb-8 leading-tight tracking-tight">
            Your <AuroraText className="font-bold" colors={["#f97316", "#ea580c", "#dc2626", "#b91c1c"]}>Sweetest</AuroraText> AI <br />
            <span className="bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">Workspace Yet</span>
          </h1>

          <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed font-medium">
            Marshmallow makes AI delightfully simple. Chat with <span className="font-semibold text-slate-900">Claude, GPT-4, Gemini & 300+ models</span>, upload files, share conversations, and track costs — all with your own API keys.
          </p>

          {/* Value Props */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div className="bg-white/80 px-5 py-3 rounded-full border border-slate-200 shadow-sm">
              <span className="text-sm font-medium text-slate-700">📎 Upload PDFs & Images</span>
            </div>
            <div className="bg-white/80 px-5 py-3 rounded-full border border-slate-200 shadow-sm">
              <span className="text-sm font-medium text-slate-700">🔗 Share Conversations</span>
            </div>
            <div className="bg-white/80 px-5 py-3 rounded-full border border-slate-200 shadow-sm">
              <span className="text-sm font-medium text-slate-700">📊 Track Usage & Costs</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            {isLoaded && !isSignedIn && (
              <>
                <SignInButton mode="modal">
                  <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-10 py-4 shadow-lg">
                    Start Free <Key className="ml-2 h-5 w-5" />
                  </Button>
                </SignInButton>
                <Button variant="outline" size="lg" className="font-semibold px-10 py-4 border-slate-300 text-slate-700 hover:bg-slate-50">
                  See How It Works <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </>
            )}

            {isLoaded && isSignedIn && (
              <Link href="/chat">
                <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-10 py-4 shadow-lg">
                  Open Chat Interface <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>

          <p className="text-sm text-slate-500">
            💡 <span className="font-medium">Zero subscription fees</span> — Only pay for what you use directly to AI providers
          </p>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl p-8 mb-20 shadow-sm border border-slate-200">
          <h2 className="text-2xl font-semibold text-slate-900 text-center mb-8">Get Started in 3 Simple Steps</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-slate-900 font-bold">1</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Add Your API Key</h3>
              <p className="text-slate-600 text-sm">Connect your existing API key from any provider. Your keys are encrypted and never shared.</p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-slate-900 font-bold">2</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Pick Your Model</h3>
              <p className="text-slate-600 text-sm">Choose from 300+ AI models including Claude 3.5 Sonnet, GPT-4, Gemini Pro, and more.</p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-slate-900 font-bold">3</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Start Creating</h3>
              <p className="text-slate-600 text-sm">Chat, upload files, share conversations, and track costs — all through one unified interface.</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 group">
            <div className="h-14 w-14 bg-slate-900 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <Upload className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Smart File Processing</h3>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Upload PDFs, images, and documents for instant analysis. Vision-enabled models can read text, analyze charts, and understand visual content.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Multi-format support</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>OCR & vision analysis</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 group">
            <div className="h-14 w-14 bg-slate-900 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <Share2 className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Instant Sharing</h3>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Create shareable links for any conversation in seconds. Perfect for collaboration, documentation, or showcasing AI outputs.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>One-click sharing</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Privacy controls</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 group">
            <div className="h-14 w-14 bg-slate-900 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <BarChart3 className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Cost Analytics</h3>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Monitor token usage and costs in real-time. Get detailed breakdowns by model, conversation, and time period.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Live usage tracking</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Spending insights</span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Features */}
        <div className="bg-slate-900 text-white p-12 rounded-2xl mb-20 shadow-xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">Enterprise-Ready Admin Tools</h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Powerful controls for teams and organizations to manage AI access, monitor usage, and maintain security.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <Settings className="h-8 w-8 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Model Governance</h3>
              <p className="text-slate-400 text-sm">Control model access, set usage limits, and configure permissions across your organization.</p>
            </div>
            <div className="text-center">
              <Users className="h-8 w-8 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Team Management</h3>
              <p className="text-slate-400 text-sm">Add team members, assign roles, and monitor individual usage patterns and costs.</p>
            </div>
            <div className="text-center">
              <Zap className="h-8 w-8 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Usage Insights</h3>
              <p className="text-slate-400 text-sm">Comprehensive analytics on model usage, token consumption, and cost optimization.</p>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="relative mb-20">
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200 blur-sm">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Simple, Transparent Pricing</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="border border-slate-200 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-2">Free</h3>
                <p className="text-3xl font-bold mb-4">$0<span className="text-lg font-normal">/mo</span></p>
                <ul className="space-y-2 text-sm text-left">
                  <li>✓ Bring your own API key</li>
                  <li>✓ Access to all models</li>
                  <li>✓ Basic usage tracking</li>
                </ul>
              </div>
              <div className="border-2 border-slate-900 rounded-xl p-6 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-3 py-1 rounded-full text-xs">
                  POPULAR
                </div>
                <h3 className="text-xl font-semibold mb-2">Pro</h3>
                <p className="text-3xl font-bold mb-4">$19<span className="text-lg font-normal">/mo</span></p>
                <ul className="space-y-2 text-sm text-left">
                  <li>✓ Everything in Free</li>
                  <li>✓ Advanced analytics</li>
                  <li>✓ Priority support</li>
                  <li>✓ Team collaboration</li>
                </ul>
              </div>
              <div className="border border-slate-200 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
                <p className="text-3xl font-bold mb-4">Custom</p>
                <ul className="space-y-2 text-sm text-left">
                  <li>✓ Everything in Pro</li>
                  <li>✓ SSO & compliance</li>
                  <li>✓ Dedicated support</li>
                  <li>✓ Custom integrations</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Coming Soon Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/95 backdrop-blur-sm border-2 border-slate-900 rounded-2xl px-8 py-6 shadow-2xl">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Pricing Coming Soon</h3>
              <p className="text-slate-600 mb-4">For now, it&apos;s completely free — just bring your own API key!</p>
              {isLoaded && !isSignedIn && (
                <SignInButton mode="modal">
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white font-semibold w-full">
                    Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </SignInButton>
              )}
            </div>
          </div>
        </div>

        {/* BYOK Section */}
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">
              Why Bring Your Own Key?
            </h2>
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">💰 True Pay-As-You-Go</h3>
                <p className="text-slate-600 text-sm">Pay AI providers directly at cost. No markups, no hidden fees, no surprises.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">🔒 Maximum Privacy</h3>
                <p className="text-slate-600 text-sm">Your API keys are encrypted. We never see or store your conversations.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">⚡ Unlimited Usage</h3>
                <p className="text-slate-600 text-sm">No artificial limits or rate restrictions. Use as much as your API allows.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">🎯 Complete Control</h3>
                <p className="text-slate-600 text-sm">Choose your models, monitor your usage, manage your costs directly.</p>
              </div>
            </div>
            
            {isLoaded && !isSignedIn && (
              <SignInButton mode="modal">
                <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-12 py-4 mt-8 shadow-lg">
                  Start Using Marshmallow Free <ArrowRight className="ml-3 h-5 w-5" />
                </Button>
              </SignInButton>
            )}

            {isLoaded && isSignedIn && (
              <Link href="/chat">
                <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-12 py-4 mt-8 shadow-lg">
                  Continue to Chat <ArrowRight className="ml-3 h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 py-12 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-4 mb-6 md:mb-0">
                          <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-lg border border-slate-200">
              <Image src="/favicon-32x32.png" alt="Marshmallow Logo" width={24} height={24} />
            </div>
              <div>
                <span className="font-semibold text-slate-900 text-lg">Marshmallow</span>
                <div className="text-sm text-slate-500">© 2025 • Sweet AI, Serious Power</div>
              </div>
            </div>
            <div className="flex gap-8">
              <Link href="#" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Documentation
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
