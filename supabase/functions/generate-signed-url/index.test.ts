import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/generate-signed-url`;

const post = async (body: unknown) => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
};

Deno.test("rejects request without filePath", async () => {
  const { status, json } = await post({});
  assertEquals(status, 400);
  assert(json.error?.toString().includes("filePath"));
});

Deno.test("rejects unauthenticated request without qrCodeId", async () => {
  const { status } = await post({ filePath: "test/whatever.pdf" });
  assertEquals(status, 401);
});

Deno.test("rejects invalid qrCodeId", async () => {
  const { status, json } = await post({
    filePath: "test/whatever.pdf",
    qrCodeId: "00000000-0000-0000-0000-000000000000",
  });
  assertEquals(status, 403);
  assert(json.error);
});

Deno.test("signed URL respects expiresIn (short TTL expires)", async () => {
  // Use a known QR code if provided via env, else skip
  const qrId = Deno.env.get("TEST_QR_CODE_ID");
  const filePath = Deno.env.get("TEST_FILE_PATH");
  if (!qrId || !filePath) {
    console.log("Skipping TTL test: TEST_QR_CODE_ID/TEST_FILE_PATH not set");
    return;
  }
  const { status, json } = await post({ filePath, qrCodeId: qrId, expiresIn: 2 });
  assertEquals(status, 200);
  assert(json.signedUrl);

  // Immediately fetchable
  const ok = await fetch(json.signedUrl);
  await ok.arrayBuffer();
  assertEquals(ok.status, 200);

  // After TTL, should fail
  await new Promise((r) => setTimeout(r, 3500));
  const expired = await fetch(json.signedUrl);
  await expired.arrayBuffer();
  assert(expired.status >= 400, `Expected expired URL to fail, got ${expired.status}`);
});