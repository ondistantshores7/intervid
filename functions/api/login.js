// functions/api/login.js

// A simple utility for creating a session cookie. 
// In a real-world application, you would use a library like `jose` for JWTs.
async function createSession(username) {
    const sessionData = JSON.stringify({ username, loggedInAt: Date.now() });
    return btoa(sessionData); // Base64 encode the session data
}

export const onRequestPost = async ({ request, env }) => {
    try {
        const { username, password } = await request.json();

        // Get credentials from environment variables
        const storedUsername = env.ADMIN_USERNAME;
        const storedPassword = env.ADMIN_PASSWORD;

        if (!storedUsername || !storedPassword) {
            return new Response("Administrator credentials are not configured.", { status: 500 });
        }

        // Validate credentials
        if (username === storedUsername && password === storedPassword) {
            const sessionToken = await createSession(username);

            // Set a secure, HttpOnly cookie
            const cookie = `session=${sessionToken}; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=86400`; // 24 hours

            return new Response(JSON.stringify({ success: true, message: "Login successful" }), {
                status: 200,
                headers: {
                    "Set-Cookie": cookie,
                    "Content-Type": "application/json",
                },
            });
        } else {
            return new Response(JSON.stringify({ success: false, message: "Invalid username or password" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({ success: false, message: "An error occurred during login." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
