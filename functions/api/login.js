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

                // Build an array of allowed credential pairs (at least admin must exist)
        const credentialPairs = [
            { username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD },
            { username: env.GUEST_USERNAME, password: env.GUEST_PASSWORD },
        ].filter(c => c.username && c.password);

        if (credentialPairs.length === 0) {
            return new Response("No valid credentials configured.", { status: 500 });
        }

        const isValid = credentialPairs.some(c => c.username === username && c.password === password);

        if (isValid) {
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
