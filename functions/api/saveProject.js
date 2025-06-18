export const onRequestPost = async ({ request, env }) => {

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { id, title, data } = body;
  if (!id || !title || !data) {
    return new Response("Missing fields", { status: 400 });
  }

  const now = new Date().toISOString();
  try {
    await env.DB.prepare(
      `INSERT INTO projects (id, title, data, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?4)
       ON CONFLICT(id) DO UPDATE SET title=?2, data=?3, updated_at=?4`
    ).bind(id, title, JSON.stringify(data), now).run();
  } catch (err) {
    return new Response("DB error: " + err.message, { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
