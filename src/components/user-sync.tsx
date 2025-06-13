"use client"

import { useAuth, useUser } from "@clerk/nextjs"
import { useMutation } from "convex/react"
import { useEffect } from "react"

import { api } from "../../convex/_generated/api"

export function UserSync() {
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const createUser = useMutation(api.users.createUser)

  useEffect(() => {
    if (isSignedIn && user) {
      createUser({
        clerkId: user.id,
        name: user.fullName || user.firstName || "Anonymous",
        email: user.primaryEmailAddress?.emailAddress || "",
        avatarUrl: user.imageUrl,
      }).catch((error) => {
        // User might already exist, which is fine
        console.log("User sync:", error.message)
      })
    }
  }, [isSignedIn, user, createUser])

  return null
} 