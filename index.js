export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. جلب الملاحظات
      if (request.method === "GET" && url.pathname === "/api/notes") {
        const { results } = await env.DB.prepare("SELECT * FROM notes ORDER BY created_at DESC").all();
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. إضافة ملاحظة جديدة
      if (request.method === "POST" && url.pathname === "/api/notes") {
        const body = await request.json();
        const id = Date.now().toString();
        const title = body.title || "";
        const content = body.content || "";

        await env.DB.prepare(
          "INSERT INTO notes (id, title, content) VALUES (?, ?, ?)"
        ).bind(id, title, content).run();

        return new Response(JSON.stringify({ success: true, id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 3. تعديل ملاحظة
      if (request.method === "PUT"
