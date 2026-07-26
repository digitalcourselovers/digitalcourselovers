// Public VAPID key — safe to ship to the client.
// (The private key is stored server-side as VAPID_PRIVATE_KEY.)
export const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  "BLlV3aD6TSIPLcgjdBeRGpBiRYqT_f2kmjXepX0QxaJQSYNQ4WWvAazlI7Pi1vKMsmExvCD6SI6D_Y00C4Qfdd4";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}
