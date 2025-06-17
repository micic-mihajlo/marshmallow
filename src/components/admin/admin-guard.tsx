"use client";

import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ShieldAlert, Crown } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const router = useRouter();

  // Check if user is admin using Convex
  const isAdmin = useQuery(api.users.isCurrentUserAdmin);
  
  useEffect(() => {
    // Wait for everything to load
    if (isAuthLoading || !isUserLoaded) {
      return;
    }
    
    // If not authenticated, redirect to sign in
    if (!isAuthenticated || !user) {
      router.push("/sign-in");
      return;
    }
    
    // If admin check is complete and user is not admin, redirect
    if (isAdmin === false) {
      router.push("/");
      return;
    }
  }, [isAuthenticated, isAuthLoading, user, isUserLoaded, isAdmin, router]);

  // Show loading while checking authentication
  if (isAuthLoading || !isUserLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-blue-500" />
            <CardTitle>Loading Authentication</CardTitle>
            <CardDescription>Please wait while we verify your credentials...</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading while checking admin status
  if (isAdmin === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader className="text-center">
            <Crown className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <CardTitle>Checking Admin Permissions</CardTitle>
            <CardDescription>Verifying your access level...</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If not authenticated or not admin, show access denied
  if (!isAuthenticated || !user || isAdmin === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader className="text-center">
            <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>
              You don&apos;t have permission to access the admin panel.
              {user?.primaryEmailAddress?.emailAddress && (
                <div className="mt-2 text-sm">
                  Logged in as: {user.primaryEmailAddress.emailAddress}
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/")} variant="outline">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user is admin, render children
  return <>{children}</>;
} 