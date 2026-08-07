/**
 * Cloudflare R2 access helpers (server-only).
 *
 * Uses the S3-compatible endpoint with SigV4 request signing via aws4fetch,
 * which is Workers-safe (no Node-only dependencies).
 */
import { AwsClient } from "aws4fetch";

type R2Config = {
  client: AwsClient;
  base: string;
};

export function r2Configured(): boolean {
  return Boolean(
    process.env["R2_ACCOUNT_ID"] &&
      process.env["R2_ACCESS_KEY_ID"] &&
      process.env["R2_SECRET_ACCESS_KEY"] &&
      process.env["R2_BUCKET"],
  );
}

function getConfig(): R2Config {
  const accountId = process.env["R2_ACCOUNT_ID"];
  const accessKeyId = process.env["R2_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["R2_SECRET_ACCESS_KEY"];
  const bucket = process.env["R2_BUCKET"];
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("R2 is not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET)");
  }
  return {
    client: new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: "s3",
      region: "auto",
    }),
    base: `https://${accountId}.r2.cloudflarestorage.com/${bucket}`,
  };
}

function objectUrl(base: string, key: string) {
  const safe = key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${base}/${safe}`;
}

/** Presigned PUT URL the browser uses to upload encrypted bytes directly. */
export async function signPutUrl(key: string, expiresSeconds = 600): Promise<string> {
  const { client, base } = getConfig();
  const url = new URL(objectUrl(base, key));
  url.searchParams.set("X-Amz-Expires", String(expiresSeconds));
  const signed = await client.sign(new Request(url, { method: "PUT" }), {
    aws: { signQuery: true, allHeaders: false },
  });
  return signed.url;
}

/** Presigned GET URL used for lazy media reads. */
export async function signGetUrl(key: string, expiresSeconds = 3600): Promise<string> {
  const { client, base } = getConfig();
  const url = new URL(objectUrl(base, key));
  url.searchParams.set("X-Amz-Expires", String(expiresSeconds));
  const signed = await client.sign(new Request(url, { method: "GET" }), {
    aws: { signQuery: true, allHeaders: false },
  });
  return signed.url;
}

/** Permanently removes objects from R2. Failures are logged, never thrown. */
export async function deleteObjects(keys: string[]): Promise<void> {
  if (!keys.length || !r2Configured()) return;
  const { client, base } = getConfig();
  for (const key of keys) {
    try {
      const res = await client.fetch(objectUrl(base, key), { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        console.error("[r2] delete failed", key, res.status);
      }
    } catch (e) {
      console.error("[r2] delete error", key, (e as Error).message);
    }
  }
}
