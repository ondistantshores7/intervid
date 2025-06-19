// This is a direct route function that serves the player without middleware
export async function onRequest({ request, params, env }) {
  const projectId = new URL(request.url).searchParams.get('project');
  
  // Build a complete standalone player HTML that doesn't depend on any other assets
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
            <video id="video-player" playsinline controls></video>
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
    <script src="https://cdn.jsdelivr.net/npm/hls.js@1.4.0/dist/hls.min.js"></script>
    
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
            
            loadVideo(nodeId) {
                // Clear existing buttons
                this.clearButtons();
                
                if (this.timeUpdateHandler) {
                    this.videoEl.removeEventListener('timeupdate', this.timeUpdateHandler);
                    this.timeUpdateHandler = null;
                }
                
                // Find the video node by ID
                const videoNode = this.project.videos.find(video => video.id === nodeId);
                if (!videoNode) {
                    console.error('Video node not found:', nodeId);
                    return;
                }
                
                // Set current node
                this.currentNodeId = nodeId;
                
                // Handle video source
                if (videoNode.hlsUrl) {
                    if (this.hls) {
                        this.hls.destroy();
                    }
                    
                    if (Hls.isSupported()) {
                        this.hls = new Hls();
                        this.hls.loadSource(videoNode.hlsUrl);
                        this.hls.attachMedia(this.videoEl);
                        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                            this.videoEl.play();
                        });
                    } else if (this.videoEl.canPlayType('application/vnd.apple.mpegurl')) {
                        this.videoEl.src = videoNode.hlsUrl;
                        this.videoEl.addEventListener('loadedmetadata', () => {
                            this.videoEl.play();
                        });
                    }
                } else if (videoNode.url) {
                    this.videoEl.src = videoNode.url;
                    this.videoEl.play();
                } else {
                    console.error('No valid video URL found for node:', nodeId);
                    return;
                }
                
                // Set up time update listener for buttons
                this.timeUpdateHandler = () => {
                    const currentTime = this.videoEl.currentTime;
                    
                    if (videoNode.buttons && videoNode.buttons.length > 0) {
                        videoNode.buttons.forEach(button => {
                            const shouldBeActive = currentTime >= button.timestamp;
                            const isCurrentlyActive = this.activeButtons.has(button.id);
                            
                            if (shouldBeActive && !isCurrentlyActive) {
                                this.createButton(button, videoNode.id);
                            } else if (!shouldBeActive && isCurrentlyActive) {
                                this.removeButton(button.id);
                            }
                        });
                    }
                };
                
                this.videoEl.addEventListener('timeupdate', this.timeUpdateHandler);
                
                // Clear canvas when loading a new video
                this.clearCanvas();
                
                console.log('Loaded video node:', videoNode.id);
            }
            
            createButton(buttonData) {
                const buttonEl = document.createElement('button');
                buttonEl.className = 'interactive-button';
                buttonEl.textContent = buttonData.text || 'Click';
                buttonEl.dataset.targetNodeId = buttonData.targetNodeId;
                
                // Position the button
                buttonEl.style.top = \`\${buttonData.position.y}%\`;
                buttonEl.style.left = \`\${buttonData.position.x}%\`;
                
                // Add click handler
                buttonEl.addEventListener('click', () => {
                    if (buttonData.targetNodeId) {
                        this.loadVideo(buttonData.targetNodeId);
                    }
                });
                
                // Add to DOM
                this.buttonsContainer.appendChild(buttonEl);
                
                // Track active button
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
    </script>
</body>
</html>`;

  // Return the HTML content directly as a Response
  return new Response(htmlContent, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
