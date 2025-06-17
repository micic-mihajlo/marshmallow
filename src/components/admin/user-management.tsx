"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Users, Shield, User, Crown } from "lucide-react";
import { useState } from "react";
import { Id, Doc } from "../../../convex/_generated/dataModel";

export function UserManagement() {
  const users = useQuery(api.users.getAllUsers);
  const setUserRole = useMutation(api.users.setUserRole);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const handleRoleChange = async (userId: Id<"users">, newRole: "admin" | "user") => {
    setLoadingUserId(userId);
    try {
      await setUserRole({ userId, role: newRole });
    } catch (error) {
      console.error("Failed to change user role:", error);
    } finally {
      setLoadingUserId(null);
    }
  };

  if (!users) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>Loading users...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
        </CardTitle>
        <CardDescription>
          Manage user roles and permissions. Total users: {users.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user: Doc<"users">) => (
            <div
              key={user._id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                    alt={user.name}
                    className="rounded-full"
                  />
                </Avatar>
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge
                  variant={user.role === "admin" ? "default" : "secondary"}
                  className="flex items-center gap-1"
                >
                  {user.role === "admin" ? (
                    <Crown className="h-3 w-3" />
                  ) : (
                    <User className="h-3 w-3" />
                  )}
                  {user.role || "user"}
                </Badge>
                
                {user.role !== "admin" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRoleChange(user._id, "admin")}
                    disabled={loadingUserId === user._id}
                    className="flex items-center gap-1"
                  >
                    <Shield className="h-3 w-3" />
                    Make Admin
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRoleChange(user._id, "user")}
                    disabled={loadingUserId === user._id}
                    className="flex items-center gap-1"
                  >
                    <User className="h-3 w-3" />
                    Remove Admin
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 