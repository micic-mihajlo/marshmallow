"use client"

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { MessageSquare, Sparkles, Users, Zap, Check, Star, ArrowRight, Shield, Clock, TrendingUp, Brain, Rocket, Crown } from "lucide-react"
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 font-sans antialiased">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-6xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl mt-4 shadow-sm border border-orange-100">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-stone-900 tracking-tight">Marshmallow</h1>
            <div className="bg-orange-500 text-white px-2.5 py-0.5 rounded-md text-xs font-medium">BETA</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isLoaded && !isSignedIn && (
            <SignInButton mode="modal">
              <Button variant="outline" className="font-medium border-stone-300 text-stone-700 hover:bg-orange-50">
                Sign In
              </Button>
            </SignInButton>
          )}

          {isLoaded && isSignedIn && (
            <>
              <Link href="/chat">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white font-medium shadow-sm">
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
          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-10 mb-12 text-sm">
            <div className="flex items-center gap-2 text-stone-600">
              <Star className="h-4 w-4 text-amber-500 fill-current" />
              <span className="font-medium">4.9/5 Rating</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600">
              <Users className="h-4 w-4 text-pink-500" />
              <span className="font-medium">2,847+ Users</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600">
              <Shield className="h-4 w-4 text-orange-500" />
              <span className="font-medium">Enterprise Ready</span>
            </div>
          </div>

          <div className="mb-10">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-pink-400/20 rounded-full blur-2xl"></div>
              <div className="relative h-20 w-20 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                <Rocket className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-6xl font-bold text-stone-900 mb-8 leading-tight tracking-tight">
            One Interface for <br />
            <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-rose-500 bg-clip-text text-transparent">All AI Models</span>
          </h1>

          <p className="text-xl text-stone-600 mb-10 max-w-3xl mx-auto leading-relaxed font-medium">
            Access <span className="font-semibold text-stone-900">Claude, GPT-4, Gemini & 15+ premium models</span> in one cozy interface. 
            Your API keys, unlimited usage, complete control.
          </p>

          {/* Value Props */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div className="bg-white/80 px-5 py-3 rounded-full border border-orange-200 shadow-sm">
              <span className="text-sm font-medium text-stone-700">✨ No Usage Limits</span>
            </div>
            <div className="bg-white/80 px-5 py-3 rounded-full border border-pink-200 shadow-sm">
              <span className="text-sm font-medium text-stone-700">⚡ Real-time Streaming</span>
            </div>
            <div className="bg-white/80 px-5 py-3 rounded-full border border-rose-200 shadow-sm">
              <span className="text-sm font-medium text-stone-700">🔒 Private & Secure</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            {isLoaded && !isSignedIn && (
              <>
                <SignInButton mode="modal">
                  <Button size="lg" className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold px-10 py-4 shadow-lg">
                    Start Free Trial <Sparkles className="ml-2 h-5 w-5" />
                  </Button>
                </SignInButton>
                <Button variant="outline" size="lg" className="font-semibold px-10 py-4 border-stone-300 text-stone-700 hover:bg-orange-50">
                  Watch Demo <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </>
            )}

            {isLoaded && isSignedIn && (
              <Link href="/chat">
                <Button size="lg" className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold px-10 py-4 shadow-lg">
                  Continue to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>

          <p className="text-sm text-stone-500">
            🎯 <span className="font-medium">Limited Time:</span> Get 3 months free when you sign up this week
          </p>
        </div>

        {/* Social Proof */}
        <div className="bg-gradient-to-r from-stone-800 to-stone-700 text-white p-8 rounded-2xl mb-20 text-center shadow-xl">
          <p className="font-semibold mb-4 text-lg">
            🚀 <span className="text-orange-300">2,847+ developers</span> saved 15+ hours this week
          </p>
          <div className="flex justify-center items-center gap-10 text-sm text-stone-300">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>94% productivity boost</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>2.3s avg response</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-pink-400" />
              <span>99.9% uptime</span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white/90 border border-orange-200 rounded-2xl p-8 hover:shadow-xl hover:border-orange-300 transition-all duration-300 group">
            <div className="h-14 w-14 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-stone-900 mb-4">15+ Premium Models</h3>
            <p className="text-stone-600 mb-6 leading-relaxed">
              Claude 3.5, GPT-4o, Gemini Pro, Llama 3, and more. Switch instantly without multiple subscriptions.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-stone-600">
                <Check className="h-4 w-4 text-emerald-600 bg-emerald-50 rounded-full p-0.5" />
                <span>No rate limits with your keys</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-stone-600">
                <Check className="h-4 w-4 text-emerald-600 bg-emerald-50 rounded-full p-0.5" />
                <span>Real-time model comparison</span>
              </div>
            </div>
          </div>

          <div className="bg-white/90 border border-pink-200 rounded-2xl p-8 hover:shadow-xl hover:border-pink-300 transition-all duration-300 group">
            <div className="h-14 w-14 bg-gradient-to-br from-pink-400 to-rose-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-stone-900 mb-4">Lightning Fast</h3>
            <p className="text-stone-600 mb-6 leading-relaxed">
              See responses as they're generated. Optimized infrastructure delivers responses 3x faster.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-stone-600">
                <Check className="h-4 w-4 text-emerald-600 bg-emerald-50 rounded-full p-0.5" />
                <span>Sub-second response times</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-stone-600">
                <Check className="h-4 w-4 text-emerald-600 bg-emerald-50 rounded-full p-0.5" />
                <span>Real-time typing indicators</span>
              </div>
            </div>
          </div>

          <div className="bg-white/90 border border-rose-200 rounded-2xl p-8 hover:shadow-xl hover:border-rose-300 transition-all duration-300 group">
            <div className="h-14 w-14 bg-gradient-to-br from-rose-400 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
              <Crown className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-stone-900 mb-4">Enterprise Security</h3>
            <p className="text-stone-600 mb-6 leading-relaxed">
              API keys encrypted at rest. Conversations never stored. SOC 2 compliant infrastructure.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-stone-600">
                <Check className="h-4 w-4 text-emerald-600 bg-emerald-50 rounded-full p-0.5" />
                <span>End-to-end encryption</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-stone-600">
                <Check className="h-4 w-4 text-emerald-600 bg-emerald-50 rounded-full p-0.5" />
                <span>Zero data retention</span>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-center text-stone-900 mb-4 tracking-tight">Success Stories</h2>
          <p className="text-center text-stone-600 mb-12 text-lg">Real results from real users</p>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white/90 border border-orange-200 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center font-semibold text-white text-lg shadow-lg">
                  AJ
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900 text-lg">Alex Johnson</h4>
                  <p className="text-sm text-stone-600">Senior Product Designer</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-amber-400 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-stone-700 mb-6 leading-relaxed text-lg">
                "Cut my research time by 60%. Having Claude for analysis and GPT-4 for creative work in one place is incredible. 
                <span className="font-semibold text-orange-600">Saved $200/month</span> on subscriptions."
              </p>
              <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
                <span className="text-sm font-medium text-orange-700">🎯 Result: 15+ hours saved weekly</span>
              </div>
            </div>

            <div className="bg-white/90 border border-pink-200 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center font-semibold text-white text-lg shadow-lg">
                  SM
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900 text-lg">Sarah Miller</h4>
                  <p className="text-sm text-stone-600">Content Creator</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-amber-400 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-stone-700 mb-6 leading-relaxed text-lg">
                "Game changer for content creation. Compare outputs instantly, pick the best responses. 
                <span className="font-semibold text-pink-600">3x faster workflow</span> and better quality."
              </p>
              <div className="bg-pink-50 border border-pink-100 p-4 rounded-xl">
                <span className="text-sm font-medium text-pink-700">📈 Result: 300% productivity increase</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-orange-500 via-pink-500 to-rose-500 text-white p-12 rounded-3xl text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
          <div className="relative">
            <div className="bg-white text-orange-600 px-4 py-2 rounded-full text-sm font-semibold inline-block mb-8">
              ⏰ LIMITED TIME: 67% OFF FIRST YEAR
            </div>
            <h2 className="text-4xl font-bold mb-6 tracking-tight">
              Join 2,847+ developers who ditched multiple AI subscriptions
            </h2>
            <p className="text-white/90 mb-10 max-w-3xl mx-auto text-xl leading-relaxed">
              Stop paying $60+/month for separate subscriptions. 
              <span className="font-semibold">Get them all for free</span> with your own API keys.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-10">
              <div className="bg-white/10 backdrop-blur px-6 py-4 rounded-2xl text-center border border-white/20">
                <div className="text-3xl font-bold">$0</div>
                <div className="text-sm text-white/80">Monthly fee</div>
              </div>
              <div className="text-2xl font-light">+</div>
              <div className="bg-white/10 backdrop-blur px-6 py-4 rounded-2xl text-center border border-white/20">
                <div className="text-3xl font-bold">Your API</div>
                <div className="text-sm text-white/80">$10-30/month</div>
              </div>
              <div className="text-2xl font-light">=</div>
              <div className="bg-white/20 backdrop-blur px-6 py-4 rounded-2xl text-center border-2 border-white/40">
                <div className="text-3xl font-bold">Unlimited AI</div>
                <div className="text-sm text-white/80">15+ premium models</div>
              </div>
            </div>

            {isLoaded && !isSignedIn && (
              <SignInButton mode="modal">
                <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-semibold px-12 py-5 text-xl shadow-xl">
                  Claim Your Free Account <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </SignInButton>
            )}

            {isLoaded && isSignedIn && (
              <Link href="/chat">
                <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-semibold px-12 py-5 text-xl shadow-xl">
                  Access Your Dashboard <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </Link>
            )}

            <p className="text-white/80 text-sm mt-6">
              ⚡ Setup takes 30 seconds • 🔒 Cancel anytime • 💝 No credit card required
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-32 border-t border-orange-200 py-12 bg-white/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-4 mb-6 md:mb-0">
              <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-semibold text-stone-900 text-lg">Marshmallow AI</span>
                <div className="text-sm text-stone-500">© 2025 • Cozy AI workflows</div>
              </div>
            </div>
            <div className="flex gap-8">
              <Link href="#" className="text-sm text-stone-600 hover:text-orange-600 font-medium transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="text-sm text-stone-600 hover:text-orange-600 font-medium transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="text-sm text-stone-600 hover:text-orange-600 font-medium transition-colors">
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
