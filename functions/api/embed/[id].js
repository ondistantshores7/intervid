export async function onRequestGet(context) {
  const { request, env, params } = context;
  const { id } = params;

  console.log(`Embed API requested for project: ${id}`);
  
  try {
    // Connect to the D1 database
    const db = env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: "Database connection failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Query for the project by ID
    const project = await db.prepare(`SELECT * FROM projects WHERE id = ?`).bind(id).first();
    
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    
    // Parse the data column from JSON string to object
    if (project.data && typeof project.data === 'string') {
      project.data = JSON.parse(project.data);
    }
    
    // Return the project data
    return new Response(JSON.stringify(project.data), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=600"
      }
    });
  } catch (error) {
    console.error("Error fetching project for embed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
