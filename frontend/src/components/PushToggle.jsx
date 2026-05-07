import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Bell, BellOff, AlertCircle } from "lucide-react";

function urlBase64ToUint8Array(b64) {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) out[i] = rawData.charCodeAt(i);
  return out;
}

/**
 * PushToggle — small button users click to enable browser notifications.
 * Shows: 'Activer notifications' (idle) → 'Notifications actives' (subscribed) → error states.
 * Gracefully degrades when VAPID keys are not configured server-side.
 */
export default function PushToggle() {
  const [state, setState] = useState("idle"); // idle | subscribing | subscribed | unsupported | denied | unconfigured | error
  const [pubKey, setPubKey] = useState(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    api.get("/push/public-key").then((r) => {
      if (!r.data.configured) {
        setState("unconfigured");
        return;
      }
      setPubKey(r.data.public_key);
      // Check existing subscription
      navigator.serviceWorker.getRegistration("/sw.js").then(async (reg) => {
        if (!reg) return;
        const sub = await reg.pushManager.getSubscription();
        if (sub) setState("subscribed");
      });
    }).catch(() => setState("error"));
  }, []);

  const subscribe = async () => {
    setState("subscribing");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "idle");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pubKey),
      });
      await api.post("/push/subscribe", sub.toJSON());
      setState("subscribed");
    } catch (e) {
      console.error("Push subscribe failed", e);
      setState("error");
    }
  };

  const unsubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api.post("/push/unsubscribe", { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState("idle");
    } catch { /* noop */ }
  };

  if (state === "unsupported") {
    return (
      <div className="text-xs text-zinc-500 flex items-center gap-2" data-testid="push-unsupported">
        <AlertCircle size={12} /> Push non supporté par ce navigateur
      </div>
    );
  }
  if (state === "unconfigured") {
    return (
      <div className="text-xs text-zinc-500 flex items-center gap-2" data-testid="push-unconfigured">
        <AlertCircle size={12} /> Push désactivé (VAPID non configuré côté serveur)
      </div>
    );
  }
  if (state === "denied") {
    return (
      <div className="text-xs text-[#FF3B30] flex items-center gap-2" data-testid="push-denied">
        <BellOff size={12} /> Notifications bloquées — autorisez-les dans les paramètres du site
      </div>
    );
  }
  if (state === "subscribed") {
    return (
      <button
        onClick={unsubscribe}
        data-testid="push-unsubscribe-btn"
        className="text-xs text-[#FFCC00] flex items-center gap-2 hover:text-white transition-colors"
      >
        <Bell size={12} fill="currentColor" /> Notifications actives — désactiver
      </button>
    );
  }
  return (
    <button
      onClick={subscribe}
      disabled={state === "subscribing"}
      data-testid="push-subscribe-btn"
      className="text-xs font-bold uppercase tracking-wider text-white bg-[#FF3B30] hover:bg-[#FF5C53] disabled:opacity-50 px-3 py-1.5 flex items-center gap-2 transition-colors"
    >
      <Bell size={12} />
      {state === "subscribing" ? "Activation..." : "Activer notifications"}
    </button>
  );
}
