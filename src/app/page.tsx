"use client";

import { SignInButton, UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles, Users, Zap } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Marshmallow
          </h1>
        </div>
        
                 <div className="flex items-center gap-4">
           <Unauthenticated>
             <SignInButton mode="modal">
               <Button variant="outline">Sign In</Button>
             </SignInButton>
           </Unauthenticated>
           <Authenticated>
             <Link href="/chat">
               <Button>Go to Chat</Button>
             </Link>
             <UserButton afterSignOutUrl="/" />
           </Authenticated>
           <AuthLoading>
             <Button variant="outline" disabled>Loading...</Button>
           </AuthLoading>
         </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Chat with Multiple AI Models
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
            Experience the power of different AI models in one interface. 
            Switch between Claude, GPT, and other models seamlessly with your own API keys.
          </p>

                     <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
             <Unauthenticated>
               <SignInButton mode="modal">
                 <Button size="lg" className="text-lg px-8 py-3">
                   Get Started Free
                 </Button>
               </SignInButton>
             </Unauthenticated>
             <Authenticated>
               <Link href="/chat">
                 <Button size="lg" className="text-lg px-8 py-3">
                   Start Chatting
                 </Button>
               </Link>
             </Authenticated>
             <AuthLoading>
               <Button size="lg" className="text-lg px-8 py-3" disabled>
                 Loading...
               </Button>
             </AuthLoading>
           </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Multiple Models
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Access Claude, GPT-4, and other leading AI models through OpenRouter integration.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Real-time Streaming
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Watch responses generate in real-time with seamless streaming powered by Convex.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Bring Your Keys
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Use your own API keys for unlimited access and complete control over your usage.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
