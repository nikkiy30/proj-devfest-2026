// Reserved server boundary for a future AI integration. No request body or key
// is read and no provider is invoked until that feature is explicitly built.
export async function POST() {
  return Response.json(
    { code: "AI_DISABLED", error: "AI機能は現在利用していません。" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
