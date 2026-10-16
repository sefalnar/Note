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
        return new Response(JSON.stringify(results || []), {
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

        return new Response(JSON.stringify({ success: true, id: id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 3. تعديل ملاحظة
      if (request.method === "PUT" && url.pathname === "/api/notes") {
        const body = await request.json();
        await env.DB.prepare(
          "UPDATE notes SET title = ?, content = ? WHERE id = ?"
        ).bind(body.title || "", body.content || "", body.id).run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 4. حذف ملاحظة
      if (request.method === "DELETE" && url.pathname === "/api/notes") {
        const id = url.searchParams.get("id");
        await env.DB.prepare("DELETE FROM notes WHERE id = ?").bind(id).run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 5. عرض الواجهة الرئيسية مباشرة
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
        const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>ملاحظاتي</title>
    <style>
        :root { --p: #6366f1; --bg: #f3f4f6; }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { font-family: sans-serif; background: var(--bg); margin: 0; height: 100dvh; overflow: hidden; }
        .hidden { display: none !important; }
        .header { background: var(--p); color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; position: fixed; top:0; width:100%; z-index: 5; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; padding: 15px; margin-top: 60px; height: calc(100dvh - 60px); overflow-y: auto; align-content: start; }
        .card { background: white; padding: 12px; border-radius: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); cursor: pointer; }
        .card h4 { margin: 0 0 5px 0; font-size: 16px; color: #333; }
        .card p { margin: 0; color: #666; font-size: 14px; }
        .fab { position: fixed; bottom: 25px; left: 25px; width: 65px; height: 65px; background: var(--p); color: white; border-radius: 50%; border: none; font-size: 35px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); z-index: 10; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .modal { position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.7); display:none; justify-content: center; align-items: center; z-index: 100; padding: 15px; }
        .modal-content { background: white; width: 100%; max-width: 500px; padding: 25px; border-radius: 20px; position: relative; max-height: 90dvh; overflow-y: auto; }
        input, textarea { width: 100%; padding: 12px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 10px; font-size: 16px; outline: none; }
        .btn { padding: 14px; border-radius: 10px; border: none; cursor: pointer; font-weight: bold; width: 100%; margin-top: 10px; font-size: 16px; }
        .btn-p { background: var(--p); color: white; }
        .close { position: absolute; top: 10px; right: 15px; font-size: 30px; color: #aaa; cursor: pointer; }
    </style>
</head>
<body>

<div id="app-section">
    <div class="header"><b>ملاحظاتي</b></div>
    <div id="list" class="grid"></div>
    <button class="fab" onclick="showAdd()">+</button>
</div>

<div id="modal" class="modal">
    <div class="modal-content">
        <span class="close" onclick="closeM()">&times;</span>
        <h3 id="m-title">ملاحظة جديدة</h3>
        <input type="hidden" id="edit-id">
        <input type="text" id="title" placeholder="العنوان">
        <textarea id="content" placeholder="التفاصيل..." rows="5"></textarea>
        <button id="save-btn" class="btn btn-p" onclick="saveNote()">حفظ</button>
        <div id="edit-btns" class="hidden">
            <button class="btn" style="background:#dcfce7; color:#10b981" onclick="enableEdit()">تعديل</button>
            <button class="btn" style="background:#fee2e2; color:#ef4444" onclick="deleteNote()">حذف</button>
        </div>
    </div>
</div>

<script>
    window.onload = () => { loadNotes(); };

    async function loadNotes() {
        try {
            const res = await fetch('/api/notes');
            const notes = await res.json();
            const list = document.getElementById('list');
            list.innerHTML = '';
            if (Array.isArray(notes)) {
                notes.forEach(n => {
                    const d = document.createElement('div');
                    d.className = 'card';
                    d.innerHTML = '<h4>' + escapeHtml(n.title) + '</h4><p>' + escapeHtml(n.content).substring(0, 40) + '...</p>';
                    d.onclick = () => showView(n);
                    list.appendChild(d);
                });
            }
        } catch (e) { console.error(e); }
    }

    async function saveNote() {
        const id = document.getElementById('edit-id').value;
        const title = document.getElementById('title').value;
        const content = document.getElementById('content').value;
        
        if (!title && !content) {
            alert("الرجاء كتابة العنوان أو المحتوى أولاً");
            return;
        }

        try {
            const method = id ? 'PUT' : 'POST';
            const res = await fetch('/api/notes', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, title, content })
            });

            const text = await res.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (err) {
                alert("رد غير صالح من السيرفر: " + text);
                return;
            }

            if (result.success) { 
                closeM(); 
                loadNotes(); 
            } else { 
                alert("خطأ: " + (result.error || "غير معروف")); 
            }
        } catch (e) { 
            alert("فشل الاتصال: " + e.message); 
        }
    }

    async function deleteNote() {
        const id = document.getElementById('edit-id').value;
        if (confirm('هل أنت متأكد من الحذف؟')) {
            try {
                const res = await fetch('/api/notes?id=' + id, { method: 'DELETE' });
                const result = await res.json();
                if (result.success) { closeM(); loadNotes(); }
            } catch (e) { alert("خطأ بالحذف"); }
        }
    }

    function showAdd() {
        resetForm();
        document.getElementById('m-title').innerText = "ملاحظة جديدة";
        document.getElementById('modal').style.display = 'flex';
        document.getElementById('edit-btns').classList.add('hidden');
        document.getElementById('save-btn').classList.remove('hidden');
    }

    function showView(n) {
        document.getElementById('m-title').innerText = "عرض الملاحظة";
        document.getElementById('edit-id').value = n.id;
        document.getElementById('title').value = n.title;
        document.getElementById('content').value = n.content;
        document.getElementById('title').readOnly = true;
        document.getElementById('content').readOnly = true;
        document.getElementById('save-btn').classList.add('hidden');
        document.getElementById('edit-btns').classList.remove('hidden');
        document.getElementById('modal').style.display = 'flex';
    }

    function enableEdit() {
        document.getElementById('m-title').innerText = "تعديل الملاحظة";
        document.getElementById('title').readOnly = false;
        document.getElementById('content').readOnly = false;
        document.getElementById('save-btn').classList.remove('hidden');
        document.getElementById('edit-btns').classList.add('hidden');
    }

    function closeM() { document.getElementById('modal').style.display = 'none'; }
    function resetForm() {
        document.getElementById('edit-id').value = '';
        document.getElementById('title').value = '';
        document.getElementById('content').value = '';
        document.getElementById('title').readOnly = false;
        document.getElementById('content').readOnly = false;
    }
    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
</script>
</body>
</html>`;

        return new Response(htmlContent, {
          headers: { ...corsHeaders, "Content-Type": "text/html;charset=UTF-8" },
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
