export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "PDF file is required" }, { status: 400 });
  return new Response(await file.arrayBuffer(), {
    headers: { "Content-Type": "application/pdf", "X-Compression-Method": "original" },
  });
}
