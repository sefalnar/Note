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
      // 1. جلب الملاحظات (GET)
      if (request.method === "GET" && url.pathname === "/api/notes") {
        const { results } = await env.DB.prepare("SELECT * FROM notes ORDER BY created_at DESC").all();
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. إضافة ملاحظة جديدة (POST)
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

      // 3. تعديل ملاحظة (PUT)
      if (request.method === "PUT" && url.pathname === "/api/notes") {
        const body = await request.json();
        await env.DB.prepare(
          "UPDATE notes SET title = ?, content = ? WHERE id = ?"
        ).bind(body.title || "", body.content || "", body.id).run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 4. حذف ملاحظة (DELETE)
      if (request.method === "DELETE" && url.pathname === "/api/notes") {
        const id = url.searchParams.get("id");
        await env.DB.prepare("DELETE FROM notes WHERE id = ?").bind(id).run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "المسار غير موجود" }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
