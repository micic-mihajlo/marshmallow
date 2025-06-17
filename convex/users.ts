import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const createUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
  },
  handler: async (ctx, args) => {
    // check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      // Update existing user with new role if provided
      if (args.role && existingUser.role !== args.role) {
        await ctx.db.patch(existingUser._id, {
          role: args.role,
        });
      }
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      avatarUrl: args.avatarUrl,
      role: args.role || "user",
    });
  },
});

// Sync user data from Clerk identity (preserves existing admin roles)
export const syncUserFromClerk = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    console.log("🔄 syncUserFromClerk called for:", identity.email);

    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (existingUser) {
      console.log("👤 Existing user found:", {
        email: existingUser.email,
        currentRole: existingUser.role
      });

      // Update existing user but PRESERVE admin role
      const updates: Record<string, unknown> = {};
      if (existingUser.name !== (identity.name || identity.email || "Unknown User")) {
        updates.name = identity.name || identity.email || "Unknown User";
      }
      if (existingUser.email !== identity.email) {
        updates.email = identity.email;
      }
      if (existingUser.avatarUrl !== identity.pictureUrl) {
        updates.avatarUrl = identity.pictureUrl;
      }
      
      // IMPORTANT: Only update role if user is currently not an admin
      // This prevents overriding admin roles that were set manually
      if (existingUser.role !== "admin") {
        // For new users or non-admin users, default to "user"
        updates.role = "user";
      } else {
        console.log("🔒 Preserving existing admin role");
      }

      if (Object.keys(updates).length > 0) {
        console.log("📝 Updating user with:", updates);
        await ctx.db.patch(existingUser._id, updates);
      }
      return existingUser._id;
    }

    console.log("➕ Creating new user");
    // Create new user (defaults to "user" role)
    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name || identity.email || "Unknown User",
      email: identity.email!,
      avatarUrl: identity.pictureUrl,
      role: "user", // Default to user, admin must be set manually
    });
  },
});

// Sync user role from Clerk's private metadata (admin only operation)
export const syncRoleFromClerk = mutation({
  args: {
    clerkUserId: v.string(),
    clerkRole: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Check if current user is admin
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "admin") {
      throw new ConvexError("Only admins can sync roles from Clerk");
    }

    // Find the target user
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkUserId))
      .first();

    if (!targetUser) {
      throw new ConvexError("User not found");
    }

    const oldRole = targetUser.role;
    
    // Update the role
    await ctx.db.patch(targetUser._id, {
      role: args.clerkRole,
    });

    // Log the admin action
    const now = Date.now();
    await ctx.db.insert("adminLogs", {
      adminId: currentUser._id,
      action: "user_role_synced_from_clerk",
      targetType: "user",
      targetId: targetUser._id,
      details: {
        targetUserName: targetUser.name,
        targetUserEmail: targetUser.email,
        oldRole: oldRole || "user",
        newRole: args.clerkRole,
        clerkUserId: args.clerkUserId,
      },
      timestamp: now,
    });

    console.log(`🔄 Synced role for ${targetUser.email}: ${oldRole} -> ${args.clerkRole}`);
    
    return { success: true, oldRole, newRole: args.clerkRole };
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

export const updateApiKey = mutation({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      apiKey: args.apiKey, // in production, encrypt this
    });
  },
});

// Check if current user is admin
export const isCurrentUserAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    console.log("🔍 isCurrentUserAdmin - identity:", identity?.subject, identity?.email);
    
    if (!identity) {
      console.log("❌ isCurrentUserAdmin - no identity found");
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    console.log("👤 isCurrentUserAdmin - user found:", {
      userId: user?._id,
      email: user?.email,
      role: user?.role,
      isAdmin: user?.role === "admin"
    });

    return user?.role === "admin";
  },
});

// Set user role (admin only)
export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    // Check if current user is admin
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "admin") {
      throw new ConvexError("Only admins can set user roles");
    }

    // Get the target user for logging
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new ConvexError("User not found");
    }

    const oldRole = targetUser.role;

    await ctx.db.patch(args.userId, {
      role: args.role,
    });

    // Log the admin action
    const now = Date.now();
    await ctx.db.insert("adminLogs", {
      adminId: currentUser._id,
      action: "user_role_changed",
      targetType: "user",
      targetId: args.userId,
      details: {
        targetUserName: targetUser.name,
        targetUserEmail: targetUser.email,
        oldRole: oldRole || "user",
        newRole: args.role,
      },
      timestamp: now,
    });
  },
});


// Make first user admin (for initial setup)
export const makeFirstUserAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) throw new ConvexError("User not found");

    // Check if there are any existing admins
    const existingAdmins = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .collect();

    if (existingAdmins.length > 0) {
      throw new ConvexError("Admin already exists");
    }

    // Make this user admin
    await ctx.db.patch(currentUser._id, {
      role: "admin",
    });

    // Log the admin action (self-promotion)
    const now = Date.now();
    await ctx.db.insert("adminLogs", {
      adminId: currentUser._id,
      action: "user_role_changed",
      targetType: "user",
      targetId: currentUser._id,
      details: {
        targetUserName: currentUser.name,
        targetUserEmail: currentUser.email,
        oldRole: "user",
        newRole: "admin",
        note: "First user admin setup",
      },
      timestamp: now,
    });

    return { message: "You are now an admin!" };
  },
});

// Get all users (admin only)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new ConvexError("Not authorized");
    }

    return await ctx.db.query("users").collect();
  },
});

export const getAdminMetrics = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("clerkId"), identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new ConvexError("Not authorized");
    }

    // Get total users count
    const totalUsers = await ctx.db.query("users").collect();
    
    // Get active conversations (conversations with messages in the last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeConversations = await ctx.db
      .query("messages")
      .filter(q => q.gte(q.field("_creationTime"), oneDayAgo.getTime()))
      .collect();

    // Get messages from today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const messagesToday = await ctx.db
      .query("messages")
      .filter(q => q.gte(q.field("_creationTime"), startOfDay.getTime()))
      .collect();

    return {
      totalUsers: totalUsers.length,
      activeConversations: new Set(activeConversations.map(m => m.conversationId)).size,
      messagesToday: messagesToday.length,
    };
  },
}); 