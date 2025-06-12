import { ConvexReactClient } from "convex/react"

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in your .env file")
}

export const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL) 