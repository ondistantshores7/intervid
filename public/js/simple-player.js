/*
 * Simple Interactive Video Player
 * This is a standalone player that works in restricted environments like Kajabi
 */

(function() {
  console.log('Simple player init');

  // Setup after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayers);
  } else {
    initPlayers();
  }

  // Find and initialize all players
  function initPlayers() {
    console.log('Looking for players');
    const containers = document.querySelectorAll('[data-project]');
    console.log('Found ' + containers.length + ' containers');

    containers.forEach(container => {
      const projectId = container.getAttribute('data-project');
      console.log('Initializing player for ' + projectId);
      initPlayer(container, projectId);
    });
  }

  // Initialize a single player
  async function initPlayer(container, projectId) {
    try {
      console.log('Fetching project data');
      const url = `https://learn.threeminutetheory.com/api/embed/${projectId}`;
      console.log('URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const projectText = await response.text();
      console.log('Project data length:', projectText.length);
      console.log('First 100 chars:', projectText.substring(0, 100));
      
      // Try to parse the JSON
      const projectData = JSON.parse(projectText);
      console.log('Project parsed successfully');
      
      // Create the player UI
      renderPlayer(container, projectData);
      
    } catch (error) {
      console.error('Player initialization failed:', error);
      container.innerHTML = `
        <div style="padding: 20px; background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; border-radius: 4px;">
          <strong>Error loading video player:</strong> ${error.message}
        </div>
      `;
    }
  }

  // Render the player UI
  function renderPlayer(container, project) {
    console.log('Rendering player');
    
    // Find the start node
    let startNode = null;
    if (project.startNodeId) {
      startNode = project.videos.find(v => v.id === project.startNodeId);
    }
    if (!startNode && project.videos && project.videos.length > 0) {
      startNode = project.videos[0];
    }
    
    if (!startNode) {
      container.innerHTML = '<div style="padding: 20px;">No videos found in project</div>';
      return;
    }
    
    console.log('Starting with node:', startNode.id);
    
    // Set up the player HTML
    const playerDiv = document.createElement('div');
    playerDiv.style.width = '100%';
    playerDiv.style.height = '100%';
    playerDiv.style.position = 'relative';
    playerDiv.style.backgroundColor = '#000';
    
    // Create video element
    const video = document.createElement('video');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    video.style.display = 'block';
    video.controls = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('controls', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('x-webkit-airplay', 'allow');
    
    // Create button container
    const buttonOverlay = document.createElement('div');
    buttonOverlay.style.position = 'absolute';
    buttonOverlay.style.top = '0';
    buttonOverlay.style.left = '0';
    buttonOverlay.style.width = '100%';
    buttonOverlay.style.height = '100%';
    buttonOverlay.style.pointerEvents = 'none';
    
    // Add elements to the DOM
    playerDiv.appendChild(video);
    playerDiv.appendChild(buttonOverlay);
    container.innerHTML = '';
    container.appendChild(playerDiv);
    
    // Setup the video node manager
    const nodeManager = new NodeManager(video, buttonOverlay, project);
    nodeManager.loadNode(startNode.id);
  }
  
  // Helper to convert HLS URL to direct MP4 URL
  function convertToDirectUrl(hlsUrl) {
    // If it's a Cloudflare Stream URL, convert from HLS to direct MP4
    if (hlsUrl && hlsUrl.includes('cloudflarestream.com')) {
      // Extract the video ID from the URL
      const matches = hlsUrl.match(/\/([a-f0-9]+)\/manifest\/video\.m3u8/);
      if (matches && matches[1]) {
        const videoId = matches[1];
        return `https://customer-z8czzsai11lby5n7.cloudflarestream.com/${videoId}/downloads/default.mp4`;
      }
    }
    
    // Return original URL if we can't convert it
    return hlsUrl;
  }
  
  // Node Manager to handle video switching and buttons
  class NodeManager {
    constructor(videoElement, buttonContainer, projectData) {
      this.video = videoElement;
      this.buttonContainer = buttonContainer;
      this.project = projectData;
      this.currentNodeId = null;
      this.activeButtons = [];
      
      // Setup event listeners
      this.video.addEventListener('ended', () => this.handleVideoEnd());
    }
    
    loadNode(nodeId) {
      console.log('Loading node:', nodeId);
      const node = this.project.videos.find(v => v.id === nodeId);
      
      if (!node) {
        console.error('Node not found:', nodeId);
        return;
      }
      
      this.currentNodeId = nodeId;
      this.clearButtons();
      
      // Convert HLS URL to direct MP4 URL
      const directUrl = convertToDirectUrl(node.url);
      console.log('Using direct URL:', directUrl);
      
      // Load the video
      this.loadVideo(directUrl);
      
      // Set up the buttons when video is playing
      this.video.addEventListener('timeupdate', this.createButtonsHandler(node));
    }
    
    createButtonsHandler(node) {
      let buttonsCreated = false;
      
      return () => {
        // Only create buttons once per video
        if (buttonsCreated || !node.buttons || node.buttons.length === 0) {
          return;
        }
        
        if (this.video.currentTime > 1) {
          buttonsCreated = true;
          this.createButtons(node);
        }
      };
    }
    
    loadVideo(url) {
      console.log('Loading video URL:', url);
      this.video.src = url;
      this.video.load();
      
      // Create a play button overlay
      const playBtn = document.createElement('div');
      playBtn.innerHTML = '▶';
      playBtn.style.position = 'absolute';
      playBtn.style.top = '50%';
      playBtn.style.left = '50%';
      playBtn.style.transform = 'translate(-50%, -50%)';
      playBtn.style.fontSize = '60px';
      playBtn.style.color = 'white';
      playBtn.style.backgroundColor = 'rgba(0,0,0,0.5)';
      playBtn.style.width = '80px';
      playBtn.style.height = '80px';
      playBtn.style.borderRadius = '50%';
      playBtn.style.display = 'flex';
      playBtn.style.alignItems = 'center';
      playBtn.style.justifyContent = 'center';
      playBtn.style.cursor = 'pointer';
      playBtn.style.zIndex = '10';
      playBtn.style.pointerEvents = 'all';
      
      playBtn.onclick = () => {
        this.video.play().catch(e => console.error('Play failed:', e));
        playBtn.style.display = 'none';
      };
      
      this.buttonContainer.appendChild(playBtn);
      this.activeButtons.push(playBtn);
    }
    
    createButtons(node) {
      if (!node.buttons) return;
      
      node.buttons.forEach(button => {
        const btnElement = document.createElement('div');
        btnElement.className = 'interactive-button';
        btnElement.textContent = button.text || 'Choose';
        btnElement.style.position = 'absolute';
        btnElement.style.pointerEvents = 'all';
        btnElement.style.cursor = 'pointer';
        btnElement.style.padding = '10px 20px';
        btnElement.style.backgroundColor = button.color || '#2196F3';
        btnElement.style.color = '#fff';
        btnElement.style.borderRadius = '4px';
        btnElement.style.fontFamily = 'Arial, sans-serif';
        btnElement.style.fontSize = '16px';
        btnElement.style.top = button.y || '50%';
        btnElement.style.left = button.x || '50%';
        btnElement.style.transform = 'translate(-50%, -50%)';
        btnElement.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        
        btnElement.addEventListener('click', () => {
          if (button.targetNode) {
            this.loadNode(button.targetNode);
          }
        });
        
        this.buttonContainer.appendChild(btnElement);
        this.activeButtons.push(btnElement);
      });
    }
    
    handleVideoEnd() {
      console.log('Video ended');
      const currentNode = this.project.videos.find(v => v.id === this.currentNodeId);
      
      if (currentNode && currentNode.endAction) {
        if (currentNode.endAction.type === 'node' && currentNode.endAction.targetNode) {
          console.log('Auto-advancing to node:', currentNode.endAction.targetNode);
          this.loadNode(currentNode.endAction.targetNode);
        }
      }
    }
    
    clearButtons() {
      this.activeButtons.forEach(btn => {
        if (btn.parentNode) {
          btn.parentNode.removeChild(btn);
        }
      });
      this.activeButtons = [];
    }
  }
})();
