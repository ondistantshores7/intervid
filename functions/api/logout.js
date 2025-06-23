// functions/api/logout.js

export const onRequestPost = async () => {
    // To log out, we clear the session cookie by setting its expiration date to the past.
    const cookie = `session=; HttpOnly; Secure; Path=/; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

    return new Response(JSON.stringify({ success: true, message: "Logout successful" }), {
        status: 200,
        headers: {
            "Set-Cookie": cookie,
            "Content-Type": "application/json",
        },
    });
};
