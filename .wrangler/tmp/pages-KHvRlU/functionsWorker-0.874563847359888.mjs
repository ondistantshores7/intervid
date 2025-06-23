var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../.wrangler/tmp/bundle-ryvzru/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// api/embed/[id].js
async function onRequestGet(context) {
  const { request, env, params } = context;
  const { id } = params;
  console.log(`Embed API requested for project: ${id}`);
  try {
    const db = env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: "Database connection failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
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
    if (project.data && typeof project.data === "string") {
      project.data = JSON.parse(project.data);
    }
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
__name(onRequestGet, "onRequestGet");

// api/loadProject.js
var onRequestGet2 = /* @__PURE__ */ __name(async ({ request, env }) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return new Response("Missing id", { status: 400 });
  }
  try {
    const row = await env.DB.prepare("SELECT id, title, data, created_at, updated_at FROM projects WHERE id=?1").bind(id).first();
    if (!row) return new Response("Not found", { status: 404 });
    return new Response(JSON.stringify(row), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response("DB error: " + err.message, { status: 500 });
  }
}, "onRequestGet");

// api/login.js
async function createSession(username) {
  const sessionData = JSON.stringify({ username, loggedInAt: Date.now() });
  return btoa(sessionData);
}
__name(createSession, "createSession");
var onRequestPost = /* @__PURE__ */ __name(async ({ request, env }) => {
  try {
    const { username, password } = await request.json();
    const storedUsername = env.ADMIN_USERNAME;
    const storedPassword = env.ADMIN_PASSWORD;
    if (!storedUsername || !storedPassword) {
      return new Response("Administrator credentials are not configured.", { status: 500 });
    }
    if (username === storedUsername && password === storedPassword) {
      const sessionToken = await createSession(username);
      const cookie = `session=${sessionToken}; HttpOnly; Secure; Path=/; SameSite=Strict; Max-Age=86400`;
      return new Response(JSON.stringify({ success: true, message: "Login successful" }), {
        status: 200,
        headers: {
          "Set-Cookie": cookie,
          "Content-Type": "application/json"
        }
      });
    } else {
      return new Response(JSON.stringify({ success: false, message: "Invalid username or password" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: "An error occurred during login." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestPost");

// api/logout.js
var onRequestPost2 = /* @__PURE__ */ __name(async () => {
  const cookie = `session=; HttpOnly; Secure; Path=/; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  return new Response(JSON.stringify({ success: true, message: "Logout successful" }), {
    status: 200,
    headers: {
      "Set-Cookie": cookie,
      "Content-Type": "application/json"
    }
  });
}, "onRequestPost");

// api/saveProject.js
var onRequestPost3 = /* @__PURE__ */ __name(async ({ request, env }) => {
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
  const now = (/* @__PURE__ */ new Date()).toISOString();
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
    headers: { "Content-Type": "application/json" }
  });
}, "onRequestPost");

// player/[[path]].js
async function onRequest({ request, params, env }) {
  const projectId = new URL(request.url).searchParams.get("project");
  const htmlContent = `<!DOCTYPE html>

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Video Player</title>
    <style>
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #000;
        }
        #player-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #video-container {
            position: relative;
            width: 100%;
            height: 100%;
        }
        video {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        .buttons-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }
        .interactive-button {
            position: absolute;
            background: rgba(255, 255, 255, 0.8);
            border: 2px solid #3498db;
            border-radius: 5px;
            padding: 8px 15px;
            font-family: Arial, sans-serif;
            font-size: 16px;
            color: #333;
            cursor: pointer;
            pointer-events: all;
            transition: all 0.3s;
            z-index: 10;
        }
        .interactive-button:hover {
            background: rgba(255, 255, 255, 0.95);
            transform: scale(1.05);
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
        }
        
        /* Highlighter styles */
        #highlighter-controls {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 100;
            background: rgba(255, 255, 255, 0.7);
            border-radius: 5px;
            padding: 5px;
        }
        #highlighter-toggle {
            background: #3498db;
            color: white;
            border: none;
            border-radius: 3px;
            padding: 5px 10px;
            cursor: pointer;
        }
        #highlighter-toggle.active {
            background: #e74c3c;
        }
        #color-picker {
            margin-top: 5px;
            display: none;
        }
        #color-picker.active {
            display: block;
        }
        .color-option {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: inline-block;
            margin: 0 3px;
            cursor: pointer;
        }
        #canvas-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 5;
            pointer-events: none;
        }
        #highlight-canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        }
        #highlight-canvas.active {
            pointer-events: auto;
        }
        #loading-indicator {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-family: Arial, sans-serif;
            font-size: 20px;
            z-index: 1000;
        }
        #error-message {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            background: rgba(255, 0, 0, 0.7);
            padding: 20px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            display: none;
            text-align: center;
            max-width: 80%;
        }
    </style>
</head>
<body>
    <div id="loading-indicator">Loading player...</div>
    <div id="error-message"></div>
    
    <div id="player-container">
        <div id="video-container">
            <video id="video-player" playsinline controls muted autoplay></video>
            <div class="buttons-overlay"></div>
            <div id="canvas-container">
                <canvas id="highlight-canvas"></canvas>
            </div>
            <div id="highlighter-controls">
                <button id="highlighter-toggle">Highlighter</button>
                <div id="color-picker">
                    <div class="color-option" style="background-color: #ff0000;"></div>
                    <div class="color-option" style="background-color: #00ff00;"></div>
                    <div class="color-option" style="background-color: #0000ff;"></div>
                    <div class="color-option" style="background-color: #ffff00;"></div>
                    <div class="color-option" style="background-color: #ff00ff;"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Include HLS.js for streaming video -->
    <script src="https://cdn.jsdelivr.net/npm/hls.js@1.4.0/dist/hls.min.js"><\/script>
    
    <!-- Self-contained player script -->
    <script>
        document.addEventListener('DOMContentLoaded', async () => {
            // Get project ID from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const projectId = urlParams.get('project');
            
            if (!projectId) {
                showError('No project ID specified');
                return;
            }
            
            console.log('Loading project:', projectId);
            
            try {
                // Use hardcoded domain to avoid CORS/origin issues
                const apiUrl = \`https://learn.threeminutetheory.com/api/embed/\${projectId}\`;
                console.log('Fetching project data from:', apiUrl);
                
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    mode: 'cors',
                    credentials: 'omit', // Don't send cookies to avoid auth issues
                    cache: 'no-cache'
                });
                
                if (!response.ok) {
                    throw new Error(\`Failed to load project: \${response.status} \${response.statusText}\`);
                }
                
                const projectData = await response.json();
                console.log('Project data loaded:', projectData);
                
                // Hide loading indicator
                document.getElementById('loading-indicator').style.display = 'none';
                
                // Initialize player with the project data
                const player = new VideoPlayer(projectData);
                
            } catch (error) {
                console.error('Error loading project:', error);
                showError(\`Error loading project: \${error.message}\`);
            }
        });
        
        function showError(message) {
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            const errorElement = document.getElementById('error-message');
            if (errorElement) {
                errorElement.textContent = message;
                errorElement.style.display = 'block';
            }
        }
        
        class VideoPlayer {
            constructor(projectData) {
                this.project = projectData;
                this.videoEl = document.getElementById('video-player');
                this.buttonsContainer = document.querySelector('.buttons-overlay');
                
                // Highlighter elements
                this.canvas = document.getElementById('highlight-canvas');
                this.ctx = this.canvas.getContext('2d');
                this.isDrawing = false;
                this.isHighlightMode = false;
                
                // HLS instance
                this.hls = null;
                
                // Set default line style
                this.lineWidth = 3;
                this.lineColor = '#ff0000';
                
                // Time update handler
                this.timeUpdateHandler = null;
                
                // Loop counter
                this.loopCount = 0;
                
                // Active buttons
                this.activeButtons = new Map();
                
                // Add video end event listener
                this.videoEl.addEventListener('ended', this.handleVideoEnd.bind(this));
                
                // Initialize highlighter functionality
                this.setupHighlighter();
                
                // Resize canvas to match video dimensions
                this.resizeCanvas();
                window.addEventListener('resize', this.resizeCanvas.bind(this));
                
                // Load the first video
                const startNodeId = projectData.startNodeId || 
                    (projectData.videos && projectData.videos.length > 0 ? projectData.videos[0].id : null);
                
                if (startNodeId) {
                    this.loadVideo(startNodeId);
                } else {
                    showError('No valid start node found in project data');
                }
            }
            
            setupHighlighter() {
                // Set up toggle button
                const toggleButton = document.getElementById('highlighter-toggle');
                const colorPicker = document.getElementById('color-picker');
                
                toggleButton.addEventListener('click', () => {
                    this.isHighlightMode = !this.isHighlightMode;
                    toggleButton.classList.toggle('active');
                    colorPicker.classList.toggle('active');
                    this.canvas.classList.toggle('active');
                    
                    if (!this.isHighlightMode) {
                        this.clearCanvas();
                    }
                });
                
                // Set up color options
                const colorOptions = document.querySelectorAll('.color-option');
                colorOptions.forEach(option => {
                    option.addEventListener('click', () => {
                        this.lineColor = option.style.backgroundColor;
                    });
                });
                
                // Set up canvas events for drawing
                this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
                this.canvas.addEventListener('mousemove', this.draw.bind(this));
                this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
                this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
                
                // Touch support
                this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
                this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
                this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
            }
            
            resizeCanvas() {
                if (this.canvas) {
                    const videoRect = this.videoEl.getBoundingClientRect();
                    this.canvas.width = videoRect.width;
                    this.canvas.height = videoRect.height;
                }
            }
            
            clearCanvas() {
                if (this.ctx) {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                }
            }
            
            startDrawing(e) {
                if (!this.isHighlightMode) return;
                this.isDrawing = true;
                this.ctx.beginPath();
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.ctx.moveTo(x, y);
            }
            
            handleTouchStart(e) {
                if (!this.isHighlightMode) return;
                e.preventDefault();
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                this.isDrawing = true;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
            }
            
            handleTouchMove(e) {
                if (!this.isHighlightMode || !this.isDrawing) return;
                e.preventDefault();
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                this.ctx.lineTo(x, y);
                this.ctx.strokeStyle = this.lineColor;
                this.ctx.lineWidth = this.lineWidth;
                this.ctx.lineCap = 'round';
                this.ctx.stroke();
            }
            
            draw(e) {
                if (!this.isHighlightMode || !this.isDrawing) return;
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                this.ctx.lineTo(x, y);
                this.ctx.strokeStyle = this.lineColor;
                this.ctx.lineWidth = this.lineWidth;
                this.ctx.lineCap = 'round';
                this.ctx.stroke();
            }
            
            stopDrawing() {
                this.isDrawing = false;
            }
            
            _convertCloudflareStreamUrlToMp4(hlsUrl) {
                if (typeof hlsUrl === 'string' && hlsUrl.includes('cloudflarestream.com') && hlsUrl.includes('/manifest/video.m3u8')) {
                    const match = hlsUrl.match(/https://([^/]+)/([a-f0-9]{32})/manifest/video.m3u8/);
                    if (match && match[1] && match[2]) {
                        const customerDomain = match[1];
                        const videoId = match[2];
                        return 'https://' + customerDomain + '/' + videoId + '/downloads/default.mp4';
                    }
                }
                return hlsUrl;
            }
            
            loadVideo(nodeId) {
                console.log('Player: Attempting to load video node: ' + nodeId);

                if (this.activeButtons && typeof this.clearButtons === 'function') {
                    this.clearButtons(); // Clears from DOM and map
                }

                const node = this.project.videos.find(v => v.id === nodeId);
                if (!node) {
                    console.error('Player: Node not found:', nodeId);
                    showError('Video content not found. Please check project data.');
                    return;
                }
                this.currentNode = node;
                this.currentNodeId = nodeId;
                this.loopCount = 0;

                if (this.hls) {
                    this.hls.destroy();
                    this.hls = null;
                }

                const videoURL = node.url;
                if (!videoURL || typeof videoURL !== 'string') {
                    console.error('Player: Video URL is missing or invalid for node:', nodeId, node);
                    showError('Video URL is invalid. Please check project data.');
                    return;
                }

                console.log('Player: Processing video URL: ' + videoURL + ' for node ' + nodeId);
                this.videoEl.poster = ''; // Clear poster

                if (Hls.isSupported() && videoURL.includes('.m3u8')) {
                    console.log('Player: HLS.js is supported. Loading HLS stream.');
                    this.hls = new Hls({
                        maxBufferSize: 0, // Set to 0 for live/low-latency, or a few MB for VOD
                        maxBufferLength: 30, // Max buffer length in seconds
                        enableWorker: true // Use Web Workers for HLS processing
                    });
                    this.hls.loadSource(videoURL);
                    this.hls.attachMedia(this.videoEl);
                    this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        console.log('Player: HLS manifest parsed. Attempting to play.');
                        this.videoEl.play().catch(e => console.error('Player: HLS playback failed after manifest parse:', e));
                    });
                    this.hls.on(Hls.Events.ERROR, (event, data) => {
                        console.error('Player: HLS.js error:', { type: data.type, details: data.details, fatal: data.fatal, url: data.url });
                        if (data.fatal) {
                            let mp4UrlAttempted = false;
                            switch (data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    console.error('Player: HLS fatal network error.');
                                    const mp4Url = this._convertCloudflareStreamUrlToMp4(videoURL);
                                    if (mp4Url !== videoURL) {
                                        console.log('Player: HLS.js network error, attempting MP4 fallback: ' + mp4Url);
                                        if (this.hls) { this.hls.destroy(); this.hls = null; }
                                        this.videoEl.src = mp4Url;
                                        this.videoEl.play().catch(e => console.error('Player: MP4 fallback playback failed (network error):', e));
                                        mp4UrlAttempted = true;
                                    }
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    console.error('Player: HLS fatal media error, trying to recover...');
                                    if (this.hls) this.hls.recoverMediaError();
                                    break;
                                default:
                                    if (this.hls) { this.hls.destroy(); this.hls = null; }
                                    break;
                            }
                            if (!mp4UrlAttempted && videoURL.includes('.m3u8')) {
                                const fallbackMp4Url = this._convertCloudflareStreamUrlToMp4(videoURL);
                                if (fallbackMp4Url !== videoURL) {
                                    console.warn('Player: Unhandled HLS.js fatal error (' + data.details + '), attempting MP4 fallback: ' + fallbackMp4Url);
                                    if (this.hls) { this.hls.destroy(); this.hls = null; }
                                    this.videoEl.src = fallbackMp4Url;
                                    this.videoEl.play().catch(e => console.error('Player: MP4 fallback playback failed (default fatal error):', e));
                                }
                            }
                        }
                    });
                } else if (this.videoEl.canPlayType('application/vnd.apple.mpegurl') && videoURL.includes('.m3u8')) {
                    console.log('Player: Native HLS supported (e.g., Safari). Setting src directly.');
                    this.videoEl.src = videoURL;
                    this.videoEl.addEventListener('loadedmetadata', () => {
                        console.log('Player: Native HLS metadata loaded. Attempting to play.');
                        this.videoEl.play().catch(e => console.error('Player: Native HLS playback failed:', e));
                    }, { once: true });
                } else {
                    console.log('Player: HLS.js not supported or not an M3U8 URL. Trying direct play or MP4 conversion.');
                    const playableUrl = this._convertCloudflareStreamUrlToMp4(videoURL);
                    console.log('Player: Using URL for direct play: ' + playableUrl);
                    this.videoEl.src = playableUrl;
                    this.videoEl.play().catch(e => console.error('Player: Direct/MP4 playback failed:', e));
                }

                if (this.timeUpdateHandler) {
                    this.videoEl.removeEventListener('timeupdate', this.timeUpdateHandler);
                }
                this.timeUpdateHandler = this.updateButtons.bind(this);
                this.videoEl.addEventListener('timeupdate', this.timeUpdateHandler);
                
                if (typeof this.clearCanvas === 'function') {
                    this.clearCanvas();
                }
                console.log('Player: Finished setting up video node: ' + nodeId);
            }

            updateButtons() {
                if (!this.videoEl || !this.currentNode || !this.currentNode.buttons) {
                    this.clearButtons();
                    return;
                }
                const currentTime = this.videoEl.currentTime;
                const buttonsToShow = new Set();

                this.currentNode.buttons.forEach(buttonData => {
                    if (currentTime >= buttonData.startTime && currentTime <= buttonData.endTime) {
                        buttonsToShow.add(buttonData.id);
                        if (!this.activeButtons.has(buttonData.id)) {
                            this.createButton(buttonData);
                        }
                    }
                });

                // Remove buttons that are no longer active
                const currentActiveButtonIds = Array.from(this.activeButtons.keys());
                currentActiveButtonIds.forEach(buttonId => {
                    if (!buttonsToShow.has(buttonId)) {
                        this.removeButton(buttonId);
                    }
                });
            }
            
            createButton(buttonData) {
                const buttonEl = document.createElement('button');
                buttonEl.className = 'interactive-button';
                buttonEl.textContent = buttonData.text || 'Click';
                buttonEl.dataset.targetNodeId = buttonData.targetNodeId;
                
                // Position the button using string concatenation
                buttonEl.style.position = 'absolute'; // Ensure buttons are positioned within overlay
                buttonEl.style.top = String(buttonData.position.y) + '%';
                buttonEl.style.left = String(buttonData.position.x) + '%';
                
                buttonEl.addEventListener('click', () => {
                    if (buttonData.targetNodeId) {
                        this.loadVideo(buttonData.targetNodeId);
                    }
                });
                
                this.buttonsContainer.appendChild(buttonEl);
                this.activeButtons.set(buttonData.id, buttonEl);
                return buttonEl;
            }
            
            removeButton(buttonId) {
                const buttonEl = this.activeButtons.get(buttonId);
                if (buttonEl && buttonEl.parentNode) {
                    buttonEl.parentNode.removeChild(buttonEl);
                }
                this.activeButtons.delete(buttonId);
            }
            
            clearButtons() {
                this.activeButtons.forEach((buttonEl) => {
                    if (buttonEl.parentNode) {
                        buttonEl.parentNode.removeChild(buttonEl);
                    }
                });
                
                this.activeButtons.clear();
            }
            
            handleVideoEnd() {
                // Find the current node
                const currentNode = this.project.videos.find(video => video.id === this.currentNodeId);
                if (!currentNode) return;
                
                // Check if there's a default next node
                if (currentNode.defaultNextNodeId) {
                    console.log('Auto-advancing to next node:', currentNode.defaultNextNodeId);
                    this.loadVideo(currentNode.defaultNextNodeId);
                    return;
                }
                
                // If there's only one button, treat it as the default next node
                if (currentNode.buttons && currentNode.buttons.length === 1) {
                    console.log('Auto-advancing to only button target:', currentNode.buttons[0].targetNodeId);
                    this.loadVideo(currentNode.buttons[0].targetNodeId);
                    return;
                }
                
                // Loop the video if no next node and loop count is less than max
                const maxLoops = 2;
                if (this.loopCount < maxLoops) {
                    this.loopCount++;
                    this.videoEl.currentTime = 0;
                    this.videoEl.play();
                    return;
                }
                
                this.loopCount = 0;
                console.log('Video ended with no auto-advance configuration');
            }
        }
    <\/script>
</body>
</html>`;
  return new Response(htmlContent, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
__name(onRequest, "onRequest");

// _middleware.js
async function verifySession(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match2 = cookieHeader.match(/session=([^;]+)/);
  return !!match2;
}
__name(verifySession, "verifySession");
var onRequest2 = /* @__PURE__ */ __name(async ({ request, next }) => {
  const url = new URL(request.url);
  const { pathname } = url;
  if (pathname === "/login" || pathname === "/api/login" || pathname === "/js/login.js" || pathname === "/css/login.css" || pathname.startsWith("/embed") || pathname.includes("embed-player") || pathname.startsWith("/api/embed") || pathname.startsWith("/js/") || pathname.startsWith("/css/") || pathname.startsWith("/assets/")) {
    return next();
  }
  const isVerified = await verifySession(request);
  if (isVerified) {
    return next();
  }
  const loginUrl = new URL("/login", url.origin);
  return Response.redirect(loginUrl.toString(), 302);
}, "onRequest");

// ../.wrangler/tmp/pages-KHvRlU/functionsRoutes-0.8657912370931966.mjs
var routes = [
  {
    routePath: "/api/embed/:id",
    mountPath: "/api/embed",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/loadProject",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/login",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/logout",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/saveProject",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/player/:path*",
    mountPath: "/player",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "",
    middlewares: [onRequest2],
    modules: []
  }
];

// ../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-ryvzru/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-ryvzru/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.874563847359888.mjs.map
