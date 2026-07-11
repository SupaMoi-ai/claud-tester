import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase/client";
import { env } from "@/lib/env";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Registers this device for Expo push notifications and stores the token on
 * the given member. Guarded and non-throwing: without a real EAS project id
 * (no live credentials in this build) this simply logs and returns null
 * rather than crashing the app.
 */
export async function registerPushToken(memberId: string): Promise<string | null> {
  try {
    const projectId = env.easProjectId;
    if (!projectId) {
      console.warn("registerPushToken: no EAS project id configured, skipping.");
      return null;
    }

    const permissions = await Notifications.getPermissionsAsync();
    let status = permissions.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") {
      console.warn("registerPushToken: notification permission not granted.");
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    const { error } = await supabase
      .from("members")
      .update({ push_token: token })
      .eq("id", memberId);
    if (error) throw error;

    return token;
  } catch (err) {
    console.warn("registerPushToken failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
