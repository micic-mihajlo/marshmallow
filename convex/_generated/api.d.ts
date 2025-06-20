/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as adminLogs from "../adminLogs.js";
import type * as byok from "../byok.js";
import type * as chat from "../chat.js";
import type * as conversations from "../conversations.js";
import type * as fileStorage from "../fileStorage.js";
import type * as messages from "../messages.js";
import type * as metrics from "../metrics.js";
import type * as modelSettings from "../modelSettings.js";
import type * as models from "../models.js";
import type * as requestLogs from "../requestLogs.js";
import type * as seedModels from "../seedModels.js";
import type * as systemAlerts from "../systemAlerts.js";
import type * as usageTracking from "../usageTracking.js";
import type * as userApiKeys from "../userApiKeys.js";
import type * as userModelPreferences from "../userModelPreferences.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  adminLogs: typeof adminLogs;
  byok: typeof byok;
  chat: typeof chat;
  conversations: typeof conversations;
  fileStorage: typeof fileStorage;
  messages: typeof messages;
  metrics: typeof metrics;
  modelSettings: typeof modelSettings;
  models: typeof models;
  requestLogs: typeof requestLogs;
  seedModels: typeof seedModels;
  systemAlerts: typeof systemAlerts;
  usageTracking: typeof usageTracking;
  userApiKeys: typeof userApiKeys;
  userModelPreferences: typeof userModelPreferences;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
