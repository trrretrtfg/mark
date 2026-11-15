// Edge Function: zikra-media
// تُنشر مع إيقاف verify_jwt:  supabase functions deploy zikra-media --no-verify-jwt
// الهوية تُتحقق داخل قاعدة البيانات عبر توكن الجلسة المخصص، ولا تعتمد على Supabase Auth.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "zikra-media";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function codeFrom(err: { message?: string } | null): string {
  const m = (err?.message ?? "").match(/[A-Z][A-Z_]{3,}/);
  return m ? m[0] : "SERVER_ERROR";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "BAD_REQUEST" }, 400);
  }

  const token = String(body.token ?? "");
  if (!UUID_RE.test(token)) return json({ error: "SESSION_INVALID" });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    if (body.action === "upload_urls") {
      const memoryId = String(body.memory_id ?? "");
      const count = Math.floor(Number(body.count ?? 0));
      if (!UUID_RE.test(memoryId) || !(count >= 1 && count <= 10)) return json({ error: "BAD_REQUEST" }, 400);

      const { data, error } = await admin.rpc("media_authorize_upload", { p_token: token, p_memory: memoryId });
      if (error) return json({ error: codeFrom(error) });
      if (Number(data.existing) + count > 10) return json({ error: "MEDIA_LIMIT" });

      const items = [];
      for (let i = 0; i < count; i++) {
        const base = `${data.room_id}/${data.memory_id}/${crypto.randomUUID()}`;
        const path = `${base}.jpg`;
        const thumbPath = `${base}_t.jpg`;
        const [a, b] = await Promise.all([
          admin.storage.from(BUCKET).createSignedUploadUrl(path),
          admin.storage.from(BUCKET).createSignedUploadUrl(thumbPath),
        ]);
        if (a.error || b.error) return json({ error: "SERVER_ERROR" });
        items.push({
          path,
          thumb_path: thumbPath,
          token: a.data.token,
          thumb_token: b.data.token,
        });
      }
      return json({ items });
    }

    if (body.action === "sign") {
      const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
      const variant = body.variant === "full" ? "full" : "thumb";
      if (ids.length < 1 || ids.length > 60 || !ids.every((i) => UUID_RE.test(i))) {
        return json({ error: "BAD_REQUEST" }, 400);
      }
      const { data, error } = await admin.rpc("media_resolve", { p_token: token, p_ids: ids });
      if (error) return json({ error: codeFrom(error) });

      const rows = data as { id: string; path: string; thumb_path: string }[];
      const paths = rows.map((r) => (variant === "full" ? r.path : r.thumb_path));
      if (paths.length === 0) return json({ urls: {} });
      const signed = await admin.storage.from(BUCKET).createSignedUrls(paths, 3600);
      if (signed.error) return json({ error: "SERVER_ERROR" });

      const urls: Record<string, string> = {};
      signed.data.forEach((s, i) => {
        if (s.signedUrl) urls[rows[i].id] = s.signedUrl;
      });
      return json({ urls });
    }

    return json({ error: "BAD_REQUEST" }, 400);
  } catch {
    return json({ error: "SERVER_ERROR" }, 500);
  }
});
