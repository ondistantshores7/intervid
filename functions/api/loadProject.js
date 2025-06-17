export const onRequestGet = async ({ request, env }) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  try {
    const row = await env.DB.prepare("SELECT id, title, data, created_at, updated_at FROM projects WHERE id=?1")
      .bind(id)
      .first();
    if (!row) return new Response("Not found", { status: 404 });
    return new Response(JSON.stringify(row), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response("DB error: " + err.message, { status: 500 });
  }
};
