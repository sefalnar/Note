export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (path.includes("/api/notes")) {
        
        if (request.method === "GET") {
          const { results } = await env.DB.prepare("SELECT * FROM notes ORDER BY created_at DESC").all();
          return new Response(JSON.stringify(results || []), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (request.method === "POST") {
          const body = await request.json();
          const id = Date.now().toString();
          const title = body.title || "";
          const content = body.content || "";

          await env.DB.prepare(
            "INSERT INTO notes (id, title, content) VALUES (?, ?, ?)"
          ).bind(id, title, content).run();

          // إرسال رد واضح وصريح يؤكد النجاح
          return new Response(JSON.stringify({ success: true, id: id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (request.method === "PUT") {
          const body = await request.json();
          await env.DB.prepare(
            "UPDATE notes SET title = ?, content = ? WHERE id = ?"
          ).bind(body.title || "", body.content || "", body.id).run();

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (request.method === "DELETE") {
          const id = url.searchParams.get("id");
          await env.DB.prepare("DELETE FROM notes WHERE id = ?").bind(id).run();

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
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
