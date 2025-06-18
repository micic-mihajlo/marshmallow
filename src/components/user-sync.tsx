"use client"

import { useAuth, useUser } from "@clerk/nextjs"
import { useMutation } from "convex/react"
import { useEffect } from "react"

import { api } from "../../convex/_generated/api"

export function UserSync() {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const syncUserFromClerk = useMutation(api.users.syncUserFromClerk)

  useEffect(() => {
    if (isSignedIn && user) {
      // Sync user data from Clerk (including role from private metadata)
      syncUserFromClerk().catch((error) => {
        console.log("User sync error:", error.message)
      })
    }
  }, [isSignedIn, user, syncUserFromClerk])

  return null
} 