import { isNativeApp, getApiBase } from "./api-base";

type PushNotificationsPlugin = {
  requestPermissions: () => Promise<{ receive: string }>;
  register: () => Promise<void>;
  addListener: (
    event: string,
    callback: (data: unknown) => void
  ) => Promise<{ remove: () => void }>;
  getDeliveredNotifications: () => Promise<{ notifications: unknown[] }>;
  removeDeliveredNotifications: (options: { notifications: unknown[] }) => Promise<void>;
};

let _pushPlugin: PushNotificationsPlugin | null = null;

async function getPushPlugin(): Promise<PushNotificationsPlugin | null> {
  if (!isNativeApp()) {
    console.log("[Push] Not native app, skipping");
    return null;
  }
  if (_pushPlugin) return _pushPlugin;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    console.log("[Push] PushNotifications plugin loaded successfully");
    _pushPlugin = PushNotifications as unknown as PushNotificationsPlugin;
    return _pushPlugin;
  } catch (e) {
    console.error("[Push] Failed to load PushNotifications plugin:", e);
    return null;
  }
}

export interface CapacitorPushHandlers {
  onToken?: (token: string) => void;
  onNotification?: (title: string, body: string, data?: Record<string, string>) => void;
  onError?: (error: string) => void;
}

export async function initCapacitorPush(handlers: CapacitorPushHandlers = {}): Promise<boolean> {
  console.log("[Push] Starting initCapacitorPush");
  const plugin = await getPushPlugin();
  if (!plugin) {
    console.error("[Push] Plugin not available");
    handlers.onError?.("plugin_unavailable");
    return false;
  }

  try {
    const initTimeout = new Promise<boolean>((_, reject) =>
      setTimeout(() => reject(new Error("init_timeout")), 25000)
    );

    return await Promise.race([
      (async () => {
    console.log("[Push] Requesting permissions...");
    const timeoutPromise = new Promise<{ receive: string }>((_, reject) => 
      setTimeout(() => reject(new Error("timeout")), 10000)
    );
    const permResult = await Promise.race([
      plugin.requestPermissions(),
      timeoutPromise
    ]);
    console.log("[Push] Permission result:", permResult);
    if (permResult.receive !== "granted") {
      handlers.onError?.("permission_denied");
      return false;
    }

    let tokenResolve: ((t: string) => void) | null = null;
    let tokenReject: ((e: Error) => void) | null = null;
    const tokenPromise = new Promise<string>((resolve, reject) => {
      tokenResolve = resolve;
      tokenReject = reject;
    });

    // NOTE: Do not await addListener — some native builds can hang here.
    void plugin.addListener("registration", (token: unknown) => {
      const tokenStr = (token as { value: string }).value;
      console.log("[Push] registration token received");
      handlers.onToken?.(tokenStr);
      try {
        localStorage.setItem("fcm_token", tokenStr);
        void sendTokenToServer(tokenStr);
      } catch {}
      tokenResolve?.(tokenStr);
    });

    void plugin.addListener("registrationError", (err: unknown) => {
      const msg = (err as { error?: string; message?: string }).error || (err as { message?: string }).message || "registration_error";
      console.error("[Push] registrationError:", err);
      handlers.onError?.(msg);
      tokenReject?.(new Error(msg));
    });

    void plugin.addListener("pushNotificationReceived", (notification: unknown) => {
      const n = notification as { title?: string; body?: string; data?: Record<string, string> };
      handlers.onNotification?.(n.title ?? "دليل التوبة", n.body ?? "", n.data);
    });

    void plugin.addListener("pushNotificationActionPerformed", (action: unknown) => {
      const a = action as { notification?: { data?: { url?: string } } };
      const url = a.notification?.data?.url;
      if (url && url !== "/" && typeof window !== "undefined") {
        window.location.hash = url;
      }
    });

    console.log("[Push] Registering...");
    await Promise.race([
      plugin.register(),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error("register_timeout")), 12000)),
    ]);
    console.log("[Push] Registered successfully");

    // Wait for token so the UI doesn't hang on "activating" forever
    try {
      const token = await Promise.race([
        tokenPromise,
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error("token_timeout")), 15000)),
      ]);
      console.log("[Push] Token ready:", token ? "(redacted)" : "(empty)");
    } catch (e) {
      console.error("[Push] Token wait failed:", e);
      handlers.onError?.(e instanceof Error ? e.message : "token_timeout");
      return false;
    }

    return true;
      })(),
      initTimeout as unknown as Promise<boolean>,
    ]);
  } catch (e) {
    console.error("[Push] initCapacitorPush failed:", e);
    handlers.onError?.(e instanceof Error ? e.message : "init_failed");
    return false;
  }
}

async function sendTokenToServer(token: string): Promise<void> {
  try {
    const sessionId = localStorage.getItem("tawbah_session") ?? "guest";
    await fetch(`${getApiBase()}/push/fcm-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, token, platform: "android" }),
    });
  } catch {}
}

export async function getCapacitorPermission(): Promise<"granted" | "denied" | "default"> {
  const plugin = await getPushPlugin();
  if (!plugin) return "denied";
  try {
    const result = await plugin.requestPermissions();
    if (result.receive === "granted") return "granted";
    if (result.receive === "denied") return "denied";
    return "default";
  } catch {
    return "denied";
  }
}

export async function isCapacitorPushAvailable(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    await import("@capacitor/push-notifications");
    return true;
  } catch {
    return false;
  }
}
