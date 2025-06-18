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
    
    // Create video element
    const video = document.createElement('video');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    video.controls = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    
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
  
  // Node Manager to handle video switching and buttons
  class NodeManager {
    constructor(videoElement, buttonContainer, projectData) {
      this.video = videoElement;
      this.buttonContainer = buttonContainer;
      this.project = projectData;
      this.currentNodeId = null;
      this.activeButtons = [];
      
      // Setup HLS.js if needed
      this.setupHls();
      
      // Setup event listeners
      this.video.addEventListener('ended', () => this.handleVideoEnd());
    }
    
    setupHls() {
      // Check if HLS is supported natively
      if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('Native HLS support');
        this.hls = null;
      } 
      // Otherwise use HLS.js if available
      else if (window.Hls && Hls.isSupported()) {
        console.log('Using HLS.js');
        this.hls = new Hls({
          enableWorker: false,
          lowLatencyMode: false
        });
      } 
      else {
        console.warn('HLS not supported');
        this.hls = null;
      }
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
      
      // Load the video
      this.loadVideo(node.url);
      
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
      
      if (this.hls) {
        this.hls.loadSource(url);
        this.hls.attachMedia(this.video);
        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
          this.video.play().catch(e => console.error('Autoplay prevented:', e));
        });
      } else {
        this.video.src = url;
        this.video.play().catch(e => console.error('Autoplay prevented:', e));
      }
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
