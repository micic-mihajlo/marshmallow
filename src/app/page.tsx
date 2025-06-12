"use client"

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { MessageSquare, Sparkles, Users, Zap } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"

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
    <div className="min-h-screen bg-[#FDF6E3]">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-[#FF5B04] rounded-xl flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-[#FDF6E3]" />
          </div>
          <h1 className="text-2xl font-bold text-[#233038]">Marshmallow</h1>
        </div>

        <div className="flex items-center gap-4">
          {isLoaded && !isSignedIn && (
            <SignInButton mode="modal">
              <Button
                variant="outline"
                className="border-[#075056] text-[#075056] hover:bg-[#075056] hover:text-[#FDF6E3]"
              >
                Sign In
              </Button>
            </SignInButton>
          )}

          {isLoaded && isSignedIn && (
            <>
              <Link href="/chat">
                <Button className="bg-[#FF5B04] text-[#FDF6E3] hover:bg-[#FF5B04]/90">Go to Chat</Button>
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
      <main className="container mx-auto px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col items-center text-center mb-16">
            <div className="mb-8 relative">
              <div className="absolute -inset-6 bg-gradient-to-r from-[#FF5B04] to-[#F4D47C] rounded-full opacity-30 blur-xl"></div>
              <div className="h-20 w-20 bg-[#FF5B04] rounded-2xl flex items-center justify-center relative">
                <Sparkles className="h-10 w-10 text-[#FDF6E3]" />
              </div>
            </div>

            <h1 className="text-6xl font-bold text-[#233038] mb-6 leading-tight">
              Chat with Multiple <span className="text-[#FF5B04]">AI Models</span>
            </h1>

            <p className="text-xl text-[#233038]/80 mb-10 max-w-2xl mx-auto">
              Experience the power of different AI models in one interface. Switch between Claude, GPT, and other models
              seamlessly with your own API keys.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isLoaded && !isSignedIn && (
                <SignInButton mode="modal">
                  <Button
                    size="lg"
                    className="text-lg px-8 py-6 bg-[#FF5B04] text-[#FDF6E3] hover:bg-[#FF5B04]/90 rounded-xl font-medium"
                  >
                    Get Started Free
                  </Button>
                </SignInButton>
              )}

              {isLoaded && isSignedIn && (
                <Link href="/chat">
                  <Button
                    size="lg"
                    className="text-lg px-8 py-6 bg-[#FF5B04] text-[#FDF6E3] hover:bg-[#FF5B04]/90 rounded-xl font-medium"
                  >
                    Start Chatting
                  </Button>
                </Link>
              )}

              {!isLoaded && (
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 bg-[#FF5B04] text-[#FDF6E3] hover:bg-[#FF5B04]/90 rounded-xl font-medium"
                  disabled
                >
                  Loading...
                </Button>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-24">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-[#D3DBDD]/50 hover:border-[#FF5B04]/20 transition-all hover:shadow-xl group">
              <div className="h-14 w-14 bg-[#FF5B04]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#FF5B04]/20 transition-all">
                <MessageSquare className="h-7 w-7 text-[#FF5B04]" />
              </div>
              <h3 className="text-xl font-semibold text-[#233038] mb-3">Multiple Models</h3>
              <p className="text-[#233038]/70">
                Access Claude, GPT-4, and other leading AI models through OpenRouter integration.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-[#D3DBDD]/50 hover:border-[#075056]/20 transition-all hover:shadow-xl group">
              <div className="h-14 w-14 bg-[#075056]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#075056]/20 transition-all">
                <Zap className="h-7 w-7 text-[#075056]" />
              </div>
              <h3 className="text-xl font-semibold text-[#233038] mb-3">Real-time Streaming</h3>
              <p className="text-[#233038]/70">
                Watch responses generate in real-time with seamless streaming technology.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-[#D3DBDD]/50 hover:border-[#F4D47C]/30 transition-all hover:shadow-xl group">
              <div className="h-14 w-14 bg-[#F4D47C]/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#F4D47C]/30 transition-all">
                <Users className="h-7 w-7 text-[#233038]" />
              </div>
              <h3 className="text-xl font-semibold text-[#233038] mb-3">Bring Your Keys</h3>
              <p className="text-[#233038]/70">
                Use your own API keys for unlimited access and complete control over your usage.
              </p>
            </div>
          </div>

          {/* Testimonials */}
          <div className="mt-32">
            <h2 className="text-3xl font-bold text-center text-[#233038] mb-12">What Our Users Say</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-[#D3DBDD]/50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-[#075056]"></div>
                  <div>
                    <h4 className="font-semibold text-[#233038]">Alex Johnson</h4>
                    <p className="text-sm text-[#233038]/70">Product Designer</p>
                  </div>
                </div>
                <p className="text-[#233038]/80 italic">
                  "Marshmallow has completely transformed how I interact with AI models. The ability to switch between
                  different models has been a game-changer for my workflow."
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-lg border border-[#D3DBDD]/50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-[#FF5B04]"></div>
                  <div>
                    <h4 className="font-semibold text-[#233038]">Sarah Miller</h4>
                    <p className="text-sm text-[#233038]/70">Content Creator</p>
                  </div>
                </div>
                <p className="text-[#233038]/80 italic">
                  "The real-time streaming feature is incredible. I can see the AI thinking and responding, which makes
                  the interaction feel much more natural and engaging."
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-32 bg-gradient-to-r from-[#075056] to-[#233038] p-12 rounded-3xl text-center">
            <h2 className="text-3xl font-bold text-[#FDF6E3] mb-4">Ready to experience the future of AI chat?</h2>
            <p className="text-[#FDF6E3]/80 mb-8 max-w-2xl mx-auto">
              Join thousands of users who are already enhancing their productivity with Marshmallow.
            </p>

            {isLoaded && !isSignedIn && (
              <SignInButton mode="modal">
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 bg-[#FF5B04] text-[#FDF6E3] hover:bg-[#FF5B04]/90 rounded-xl font-medium"
                >
                  Get Started Free
                </Button>
              </SignInButton>
            )}

            {isLoaded && isSignedIn && (
              <Link href="/chat">
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 bg-[#FF5B04] text-[#FDF6E3] hover:bg-[#FF5B04]/90 rounded-xl font-medium"
                >
                  Start Chatting
                </Button>
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-24 border-t border-[#D3DBDD]/50 py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="h-8 w-8 bg-[#FF5B04] rounded-lg flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-[#FDF6E3]" />
              </div>
              <span className="text-sm text-[#233038] font-medium">© 2025 Marshmallow AI</span>
            </div>
            <div className="flex gap-6">
              <Link href="#" className="text-sm text-[#233038]/70 hover:text-[#FF5B04]">
                Privacy
              </Link>
              <Link href="#" className="text-sm text-[#233038]/70 hover:text-[#FF5B04]">
                Terms
              </Link>
              <Link href="#" className="text-sm text-[#233038]/70 hover:text-[#FF5B04]">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
