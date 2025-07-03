console.log('Interactive Video Player script loaded!');

// Auto-initialize player when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM ready, looking for player containers...');
    
    // Find all player containers
    const containers = document.querySelectorAll('[data-project]');
    console.log('Found ' + containers.length + ' player containers');
    
    containers.forEach(container => {
        const projectId = container.getAttribute('data-project');
        console.log('Initializing player for project: ' + projectId);
        
        // Initialize each player
        initPlayer(container, projectId);
    });
});

// Initialize player with container and project ID
async function initPlayer(container, projectId) {
    console.log('Fetching project data for: ' + projectId);
    try {
        // Fetch project data - use embed API endpoint which doesn't require auth
        const response = await fetch(`https://learn.threeminutetheory.com/api/embed/${projectId}`);
        if (!response.ok) {
            console.error(`Failed to load project data: ${response.status} ${response.statusText}`);
            throw new Error(`Failed to load project data: ${response.status}`);
        }
        const responseText = await response.text();
        console.log('Raw API response:', responseText);
        
        let projectData;
        try {
            projectData = JSON.parse(responseText);
            console.log('Project data loaded:', projectData);  
        } catch (e) {
            console.error('JSON parse error:', e);
            throw new Error('Invalid project data format');
        }
        
        // Create player HTML
        const playerHTML = `
            <div id="video-container" style="position:relative; width:100%; height:100%;">
                <video id="preview-video" style="width:100%; height:100%; object-fit:contain;"></video>
                <div class="preview-buttons-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%;"></div>
            </div>
        `;
        
        // Find the embed container
        const embedContainer = container.querySelector('.iv-player_embed');
        if (embedContainer) {
            console.log('Found embed container, inserting player HTML');
            embedContainer.innerHTML = playerHTML;
            
            // Initialize player
            const startNodeId = projectData.startNodeId || (projectData.videos && projectData.videos.length > 0 ? projectData.videos[0].id : null);
            console.log('Using start node:', startNodeId);
            new IVSPlayer(embedContainer, projectData, startNodeId);
        } else {
            console.error('Could not find embed container within:', container);
        }
    } catch (error) {
        console.error('Error initializing player:', error);
        container.innerHTML = `<div style="padding:20px;color:red;">Error loading interactive video: ${error.message}</div>`;
    }
}

const hexToRgba = (hex, opacity) => {
    let r = 0, g = 0, b = 0;
    if (hex.length == 4) { // #RGB format
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length == 7) { // #RRGGBB format
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
    }
    return `rgba(${r},${g},${b},${opacity})`;
};

class IVSPlayer {
    constructor(overlayElement, projectData, startNodeId) {
        this.overlay = overlayElement;
        this.project = projectData;
        this.videoEl = this.overlay.querySelector('#preview-video');
        this.buttonsContainer = this.overlay.querySelector('.preview-buttons-overlay');
        // --- Highlighter elements ---
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.isHighlightMode = false;
        this.hls = null;
        this.timeUpdateHandler = null;
        this.loopCount = 0; // Track number of loops for the current node
        this.activeButtons = new Map(); // Track active buttons and their timeouts
        this.animatedButtons = new Set(); // Track which buttons have been animated in

        if (!this.videoEl || !this.buttonsContainer) {
            console.error('Player elements not found in the overlay.');
            return;
        }

        this.buttonClickHandler = this.handleButtonClick.bind(this);
        this.buttonsContainer.addEventListener('click', this.buttonClickHandler);

        // Responsive overlay scaling
        this.updateOverlayScale = this.updateOverlayScale.bind(this);
        window.addEventListener('resize', this.updateOverlayScale);
        this.videoEl.addEventListener('loadedmetadata', this.updateOverlayScale);
        this.videoEndedHandler = this.handleVideoEnd.bind(this);

        this.setupHighlighter();
        this.loadVideo(startNodeId);
    }

    /* ---------------- Highlighter Setup ---------------- */
    setupHighlighter() {
        const container = this.overlay.querySelector('#video-container');
        if (!container || !this.videoEl) return;

        // Create canvas overlay only once
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'highlighter-canvas';
            Object.assign(this.canvas.style, {
                zIndex: 5,
                position: 'absolute',
                top: '0',
                left: '0',
                pointerEvents: 'none'
            });
            container.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            this.ctx.lineWidth = 6;
            this.currentColor = '#2196f3'; // bright blue
            this.ctx.strokeStyle = this.currentColor;
            
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';

            // Resize canvas to match video
            const resize = () => {
                const width = container.clientWidth || this.videoEl.clientWidth;
                const height = container.clientHeight || this.videoEl.clientHeight;
                const dpr = window.devicePixelRatio || 1;
                this.canvas.width = width * dpr;
                this.canvas.height = height * dpr;
                this.canvas.style.width = width + 'px';
                this.canvas.style.height = height + 'px';
                this.ctx.setTransform(1,0,0,1,0,0);
                this.ctx.scale(dpr, dpr);
            };
            resize();
            window.addEventListener('resize', resize);
            this.videoEl.addEventListener('loadedmetadata', resize);

            // Drawing events
            this.canvas.addEventListener('mousedown', (e) => {
                // ensure stroke style and width each new stroke
                this.ctx.strokeStyle = this.currentColor;
                this.ctx.lineWidth = 6;
                if (!this.isHighlightMode) return;
                this.isDrawing = true;
                // allow drawing but keep controls accessible after stroke ends
                this.canvas.style.pointerEvents = 'auto';
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.lastX = x;
                this.lastY = y;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
            });
            this.canvas.addEventListener('mousemove', (e) => {
                if (!this.isDrawing) return;
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const midX = (this.lastX + x) / 2;
                const midY = (this.lastY + y) / 2;
                this.ctx.quadraticCurveTo(this.lastX, this.lastY, midX, midY);
                this.ctx.stroke();
                this.lastX = x;
                this.lastY = y;
            });
            window.addEventListener('mouseup', () => {
                if (this.isDrawing) {
                    this.isDrawing = false;
                    this.canvas.style.pointerEvents = 'auto';
                }
            });
        }

        // Create toggle button only once
        if (!this.highlighterBtn) {
            this.highlighterBtn = document.createElement('button');
            this.highlighterBtn.className = 'highlighter-btn';
            this.highlighterBtn.title = 'Highlighter Tool';
            this.highlighterBtn.textContent = '🖍️';
            Object.assign(this.highlighterBtn.style, {
                position: 'absolute',
                bottom: '60px',
                right: '5px',
                display: 'none',
                fontSize: 'clamp(18px, 5vw, 32px)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer'
            });
            container.appendChild(this.highlighterBtn);

            // Color picker
            this.colorPicker = document.createElement('input');
            this.colorPicker.type = 'color';
            this.colorPicker.value = this.currentColor;
            Object.assign(this.colorPicker.style, {
                transform: 'translateY(-4px)',
                position: 'absolute',
                bottom: '100px',
                right: '5px',
                display: 'none',
                zIndex: 6
            });
            container.appendChild(this.colorPicker);

            // Clear button (appears in highlight mode)
            this.clearHighlightsBtn = document.createElement('button');
            this.clearHighlightsBtn.textContent = '🗑️';
            this.clearHighlightsBtn.title = 'Clear highlights';
            Object.assign(this.clearHighlightsBtn.style, {
                position: 'absolute',
                bottom: '140px',
                right: '5px',
                display: 'none',
                fontSize: 'clamp(18px, 5vw, 32px)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                zIndex: 6
            });
            this.clearHighlightsBtn.addEventListener('click', ()=>{
                // Clear drawings
                this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
                // Exit highlight mode and restore UI
                this.isHighlightMode = false;
                this.canvas.style.pointerEvents = 'none';
                this.colorPicker.style.display = 'none';
                this.clearHighlightsBtn.style.display = 'none';
                this.highlighterBtn.classList.remove('active');
                // Attempt to resume playback
                if(this.videoEl.paused){
                    this.videoEl.play().catch(()=>{});
                }
            });
            container.appendChild(this.clearHighlightsBtn);

            this.colorPicker.addEventListener('input', (e)=>{
                this.currentColor = e.target.value;
                this.ctx.strokeStyle = this.currentColor;
            });

            const toggleHighlight = () => {
                this.isHighlightMode = !this.isHighlightMode;
                if(this.isHighlightMode){
                    this.colorPicker.style.display = 'block';
                    this.clearHighlightsBtn.style.display = 'block';
                    this.videoEl.pause();
                    // no longer blocking video clicks
                }else{
                    this.colorPicker.style.display = 'none';
                    this.clearHighlightsBtn.style.display = 'none';
                    
                }
                this.highlighterBtn.classList.toggle('active', this.isHighlightMode);
                this.canvas.style.pointerEvents = this.isHighlightMode ? 'auto' : 'none';
                if(!this.isHighlightMode && this.videoEl.paused){
                    this.videoEl.play().catch(()=>{});
                }
            };
            this.highlighterBtn.addEventListener('click', toggleHighlight);

            /* ------------ Staff Overlay Button ------------- */
            if (!this.staffBtn) {
                this.staffBtn = document.createElement('button');
                this.staffBtn.className = 'staff-btn';
                this.staffBtn.title = 'Music Staff Overlay';
                this.staffBtn.textContent = '🎼';
                Object.assign(this.staffBtn.style, {
                    position: 'absolute',
                    bottom: '180px',
                    right: '5px',
                    fontSize: 'clamp(18px, 5vw, 32px)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    zIndex: 6
                });
                this.staffBtn.style.display = 'none';
                container.appendChild(this.staffBtn);

                // Create overlay (hidden initially)
                this.staffOverlay = document.createElement('div');
                Object.assign(this.staffOverlay.style, {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    display: 'none',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: 'rgba(0,0,0,0.4)',
                    zIndex: 4, // below canvas (5)
                });

                // Music staff image
                const staffImg = document.createElement('img');
                staffImg.src = 'https://raw.githubusercontent.com/ondistantshores7/intervid/main/public/images/music-staff.png';
                staffImg.alt = 'Music Staff';
                Object.assign(staffImg.style, {
                    maxWidth: '95%',
                    maxHeight: '90%',
                    pointerEvents: 'none'
                });
                this.staffOverlay.appendChild(staffImg);

                // Close button
                const closeBtn = document.createElement('button');
                closeBtn.textContent = '✕';
                Object.assign(closeBtn.style, {
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    fontSize: 'clamp(20px, 6vw, 36px)',
                    background: 'transparent',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    zIndex: 6
                });
                closeBtn.style.display = 'none';
                closeBtn.style.zIndex = '999';
                closeBtn.addEventListener('click', ()=>{
                    this.staffOverlay.style.display = 'none';
                    // Clear any highlights
                    if (this.ctx) {
                        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
                    }
                    // Disable highlight mode
                    this.isHighlightMode = false;
                    this.canvas.style.pointerEvents = 'none';
                    this.colorPicker.style.display = 'none';
                    this.clearHighlightsBtn.style.display = 'none';
                    this.highlighterBtn.classList.remove('active');
                    closeBtn.style.display = 'none';
                });
                container.appendChild(closeBtn);

                container.appendChild(this.staffOverlay);

                // Toggle overlay on button click
                this.staffBtn.addEventListener('click', ()=>{
                    const showing = this.staffOverlay.style.display === 'flex';
                    if (!showing) {
                        // Show overlay and enable highlight mode
                        this.staffOverlay.style.display = 'flex';
                        this.isHighlightMode = true;
                        this.canvas.style.pointerEvents = 'auto';
                        this.colorPicker.style.display = 'block';
                        this.clearHighlightsBtn.style.display = 'block';
                        this.highlighterBtn.classList.add('active');
                        closeBtn.style.display = 'block';
                        // Pause video for annotation convenience
                        this.videoEl.pause();
                    } else {
                        // Hide overlay via close logic above
                        closeBtn.click();
                    }
                });
            }
            /* ----------------------------------------------- */
        }

        // Show/hide button based on play state
        this.videoEl.addEventListener('pause', () => {
            if(this.staffBtn) this.staffBtn.style.display = 'block';
            this.highlighterBtn.style.display = 'block';
        });
        this.videoEl.addEventListener('play', () => {
            if(this.colorPicker) this.colorPicker.style.display = 'none';
            if(this.clearHighlightsBtn) this.clearHighlightsBtn.style.display = 'none';
            this.highlighterBtn.style.display = 'none';
            if(this.staffBtn) this.staffBtn.style.display = 'none';
            this.isHighlightMode = false;
            this.canvas.style.pointerEvents = 'none';
            this.highlighterBtn.classList.remove('active');
        });
    }

    /* Removed click block so controls work */
    /*
        e.stopImmediatePropagation();
        e.preventDefault();
*/

    /* --------------------------------------------------- */

    loadVideo(nodeId) {
        // Clear any existing timeouts
        this.clearAllButtonTimeouts();
        this.activeButtons.clear();
        // Hide staff overlay (if visible) and clear highlights when changing videos
        if (this.staffOverlay) {
            this.staffOverlay.style.display = 'none';
        }
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        }
        this.isHighlightMode = false;
        if (this.canvas) this.canvas.style.pointerEvents = 'none';
        if (this.colorPicker) this.colorPicker.style.display = 'none';
        if (this.clearHighlightsBtn) this.clearHighlightsBtn.style.display = 'none';
        if (this.highlighterBtn) this.highlighterBtn.classList.remove('active');

        this.animatedButtons.clear(); // Reset animated buttons for new video
        
        const node = this.project.videos.find(v => v.id === nodeId);
        if (!node) {
            console.error('Node not found:', nodeId);
            return;
        }
        this.currentNode = node;
        this.loopCount = 0; // Reset loop counter when loading a new node
        this.buttonsContainer.innerHTML = '';

        if (this.hls) {
            this.hls.destroy();
        }

        if (Hls.isSupported() && node.url.includes('.m3u8')) {
            this.hls = new Hls();
            this.hls.loadSource(node.url);
            this.hls.attachMedia(this.videoEl);
        } else {
            this.videoEl.src = node.url;
        }

        if (this.timeUpdateHandler) {
            this.videoEl.removeEventListener('timeupdate', this.timeUpdateHandler);
        }

        this.timeUpdateHandler = this.updateButtons.bind(this);
        this.videoEl.addEventListener('timeupdate', this.timeUpdateHandler);

        // Handle video ending
        if (this.videoEndedHandler) {
            this.videoEl.removeEventListener('ended', this.videoEndedHandler);
        }
        this.videoEl.addEventListener('ended', this.videoEndedHandler);

        this.videoEl.play().catch(e => console.error('Preview playback failed:', e));
    }
    
    clearAllButtonTimeouts() {
        // Clear any pending timeouts for button animations
        this.activeButtons.forEach(({ timeoutId }) => {
            if (timeoutId) clearTimeout(timeoutId);
        });
        this.activeButtons.clear();
    }

    updateButtons() {
        const currentTime = this.videoEl.currentTime;
        this.currentNode.buttons.forEach(button => {
            const buttonEl = this.buttonsContainer.querySelector(`[data-button-id='${button.id}']`);
            const showTime = button.time;
            const animateEnabled = button.animateOut?.enabled;
            const defaultVisibleDuration = 5;
            const endTime = animateEnabled ? showTime + (button.animateOut.delay || defaultVisibleDuration) : Number.POSITIVE_INFINITY;

            const buttonData = this.activeButtons.get(button.id);
            const hasAnimatedIn = this.animatedButtons.has(button.id);
            const isWithinShowTime = currentTime >= showTime && currentTime < endTime;

            // Only handle buttons that are within their show time or have an active animation
            if (!isWithinShowTime && !buttonEl) {
                return; // Skip buttons that are not active and not visible
            }

            // Handle button appearance
            if (isWithinShowTime && !buttonEl && !hasAnimatedIn) {
                const newButtonEl = this.createButton(button);
                this.animatedButtons.add(button.id);
                
                // If animate out is enabled, set a timeout to animate it out
                if (button.animateOut?.enabled) {
                    const delayMs = (button.animateOut.delay || 5) * 1000;
                    const timeoutId = setTimeout(() => {
                        this.animateOutButton(button.id);
                    }, delayMs);
                    
                    // Store the timeout ID and button element
                    this.activeButtons.set(button.id, { 
                        buttonEl: newButtonEl, 
                        timeoutId,
                        hasAnimatedOut: false
                    });
                } else {
                    // For buttons without animate out, just track them
                    this.activeButtons.set(button.id, {
                        buttonEl: newButtonEl,
                        hasAnimatedOut: false
                    });
                }
            }
            // Clean up buttons that are past their show time
            else if (!isWithinShowTime && buttonEl) {
                if (button.animateOut?.enabled) {
                    // Do not remove here; animateOutButton will handle removal after the out animation completes
                    return;
                }
                // If animateOut is not enabled, you may choose to remove or keep persistent.
                // Current behavior: keep persistent across loops, so we do nothing here.
            }
        });
    }
    
    animateOutButton(buttonId) {
        const buttonEl = this.buttonsContainer.querySelector(`[data-button-id='${buttonId}']`);
        if (!buttonEl) return;
        
        const buttonData = this.activeButtons.get(buttonId);
        if (!buttonData || buttonData.hasAnimatedOut) return;

        // Mark that this button has animated out
        buttonData.hasAnimatedOut = true;
        
        const nodeButtonData = this.currentNode.buttons.find(b => b.id === buttonId);
        if (!nodeButtonData) return;
        
        // Remove any existing animation classes
        const animationClasses = [
            'anim-fade-in', 'anim-slide-left', 'anim-slide-right', 
            'anim-slide-top', 'anim-slide-bottom', 'anim-fade-out',
            'anim-slide-out-left', 'anim-slide-out-right',
            'anim-slide-out-top', 'anim-slide-out-bottom'
        ];
        buttonEl.classList.remove(...animationClasses);
        
        // Add the corresponding out animation based on the button's animation type
        let outAnimClass = 'anim-fade-out'; // Default to fade out
        
        if (nodeButtonData.animation?.type === 'slide' && nodeButtonData.animation.direction) {
            outAnimClass = `anim-slide-out-${nodeButtonData.animation.direction}`;
        }
        
        // Apply the out animation
        buttonEl.classList.add(outAnimClass);
        
        // Set up cleanup after animation completes
        const duration = (parseFloat(nodeButtonData.animation?.duration) || 1) * 1000;
        
        // Store the end time to prevent re-animation
        const endTime = (nodeButtonData.time || 0) + (nodeButtonData.animateOut?.delay || 5);
        this.animatedButtons.add(buttonId);
        
        // Remove the button after animation completes
        setTimeout(() => {
            if (buttonEl.parentNode) {
                buttonEl.remove();
            }
            this.activeButtons.delete(buttonId);
        }, duration);
    }

    createButton(buttonData) {
        // Remove any existing button with the same ID
        const existingButton = this.buttonsContainer.querySelector(`[data-button-id='${buttonData.id}']`);
        if (existingButton) {
            existingButton.remove();
        }
        
        const buttonEl = document.createElement('button');
        buttonEl.className = 'video-overlay-button';
        // Ensure gentle hover scale animation even if external CSS not loaded
        buttonEl.style.transition = 'transform 0.3s cubic-bezier(0.25,0.8,0.25,1)';
        // Hover pulse handled by CSS
        buttonEl.dataset.buttonId = buttonData.id;

        // Apply base styles
        const buttonStyle = {
            position: 'absolute',
            left: buttonData.position?.x || '50%',
            top: buttonData.position?.y || '50%',
            pointerEvents: 'auto',
            boxSizing: 'border-box',
            ...buttonData.style // User-defined styles
        };

        if (buttonData.linkType === 'embed') {
            buttonEl.classList.add('embed-container');
            buttonEl.innerHTML = buttonData.embedCode || '';
            // For embeds, we don't want flex centering, we want the content to fill the space.
        } else {
            buttonEl.textContent = buttonData.text;
            // For text buttons, apply flex for centering
            Object.assign(buttonStyle, {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            });
        }
        
        // Apply the base styles
        // Ensure font and opacity are explicitly applied
        if (buttonStyle.fontFamily) buttonEl.style.fontFamily = buttonStyle.fontFamily;
        if (buttonStyle.fontSize) {
            // If fontSize specified in px, convert to responsive clamp
            const match = /^([0-9.]+)px$/.exec(buttonStyle.fontSize);
            if (match) {
                const px = parseFloat(match[1]);
                const minPx = Math.max(10, Math.round(px * 0.6));
                // Use viewport width scaling: 1vw roughly equals 1% of viewport width
                // Coefficient 2vw provides nice scaling; tweak based on original size
                buttonEl.style.fontSize = `clamp(${minPx}px, 2vw, ${px}px)`;
                buttonEl.dataset.origFontSize = `${px}`;
            } else {
                buttonEl.style.fontSize = buttonStyle.fontSize;
            }
            // lineHeight will follow font-size automatically
        }
        if (buttonStyle.opacity !== undefined) buttonEl.style.opacity = buttonStyle.opacity;
        Object.assign(buttonEl.style, buttonStyle);

        // Apply shadow style
        if (buttonData.shadow && buttonData.shadow.enabled) {
            const shadow = buttonData.shadow;
            const rgbaColor = hexToRgba(shadow.color || '#000000', shadow.opacity !== undefined ? shadow.opacity : 0.5);
            buttonEl.style.boxShadow = `${shadow.hOffset || 2}px ${shadow.vOffset || 2}px ${shadow.blur || 4}px ${shadow.spread || 0}px ${rgbaColor}`;
        } else {
            buttonEl.style.boxShadow = 'none';
        }
        
        // Apply animation if specified
        if (buttonData.animation?.type !== 'none') {
            const animClass = buttonData.animation.type === 'slide' 
                ? `anim-slide-${buttonData.animation.direction || 'left'}` 
                : 'anim-fade-in';
                
            buttonEl.classList.add(animClass);
            buttonEl.style.animationDuration = `${buttonData.animation.duration || 1}s`;
            // Remove entrance animation class after it finishes so it doesn't replay on hover/unhover cycles
            buttonEl.addEventListener('animationend', () => {
                buttonEl.classList.remove(animClass);
            }, { once: true });
            
            // Force reflow to ensure animation plays
            void buttonEl.offsetWidth;
        } else {
            // If no animation, just show the button
            buttonEl.style.opacity = '1';
        }
        
        this.buttonsContainer.appendChild(buttonEl);
        // Store original font px and adjust for current viewport
        if (!buttonEl.dataset.origFontPx) {
            const m = /([0-9.]+)px/.exec(buttonEl.style.fontSize || '');
            if (m) buttonEl.dataset.origFontPx = m[1];
        }
        this.adjustFontSize(buttonEl);

        return buttonEl;
    }

    handleButtonClick(e) {
        const target = e.target.closest('.video-overlay-button');
        if (!target) return;

        const buttonId = target.dataset.buttonId;
        const buttonData = this.currentNode.buttons.find(b => b.id === buttonId);

        if (buttonData.linkType === 'embed') {
            // For embed types, do nothing; the embedded content handles interaction.
            return;
        } else if (buttonData.linkType === 'url') {
            let url = buttonData.target.trim();
            // Ensure the URL has a protocol (default to https:// if missing)
            if (url && !/^https?:\/\//i.test(url)) {
                url = 'https://' + url;
            }
            window.open(url, '_blank');
        } else {
            this.loadVideo(buttonData.target);
        }
    }

    handleVideoEnd() {
        console.log('Video ended. Current node endAction:', this.currentNode.endAction);
        const endAction = this.currentNode.endAction;

        if (!endAction || !endAction.type) {
            console.log('No end action defined or type is missing for node:', this.currentNode.id);
            return; 
        }

        switch (endAction.type) {
            case 'loop':
                this.loopCount++;
                console.log(`Looping video (${this.loopCount}/3)`);
                if (this.loopCount < 3) {
                    // If we haven't reached 3 loops, play again
                    this.videoEl.currentTime = 0;
                    this.videoEl.play().catch(e => console.error('Loop playback failed:', e));
                } else {
                    // After 3 loops, reset counter and continue to next action if any
                    this.loopCount = 0;
                    // If there's a next node, play it
                    const nextNodeId = this.findNextNodeId();
                    if (nextNodeId) {
                        this.loadVideo(nextNodeId);
                    }
                }
                break;
            case 'node':
                if (endAction.targetNode) {
                    console.log(`End action: Play node ${endAction.targetNode}`);
                    this.loadVideo(endAction.targetNode);
                } else {
                    console.warn('End action type is "node", but no targetNode specified.');
                }
                break;
            case 'url':
                if (endAction.targetUrl) {
                    console.log(`End action: Open URL ${endAction.targetUrl}`);
                    window.open(endAction.targetUrl, '_blank');
                } else {
                    console.warn('End action type is "url", but no targetUrl specified.');
                }
                break;
            case 'repeat':
                console.log('End action: Repeat video.');
                this.videoEl.currentTime = 0;
                this.videoEl.play().catch(e => console.error('Repeat playback failed:', e));
                break;
            case 'none':
            default:
                console.log('End action: Do nothing.');
                break;
        }
    }

    // Find the next node in the flow (for after loop completes)
    findNextNodeId() {
        if (!this.currentNode || !this.project.connections) return null;
        
        // Find connections where this node is the source
        const connections = this.project.connections.filter(
            conn => conn.sourceId === this.currentNode.id
        );
        
        if (connections.length > 0) {
            // Just take the first connection for simplicity
            return connections[0].targetId;
        }
        
        return null;
    }

    /* ---------------- Overlay scaling ---------------- */
    updateOverlayScale() {
        if (!this.videoEl || !this.buttonsContainer) return;
        // Record the video's natural dimensions once
        if (!this._naturalW || !this._naturalH) {
            this._naturalW = this.videoEl.videoWidth || this.videoEl.clientWidth;
            this._naturalH = this.videoEl.videoHeight || this.videoEl.clientHeight;
            this.buttonsContainer.style.width = `${this._naturalW}px`;
            this.buttonsContainer.style.height = `${this._naturalH}px`;
        }
        if (!this._naturalW) return;
        const scale = this.videoEl.clientWidth / this._naturalW;
        this.buttonsContainer.style.transformOrigin = 'top left';
        this.buttonsContainer.style.transform = `scale(${scale})`;
    }

    adjustAllButtonFonts() {
        if (!this.buttonsContainer) return;
        this.buttonsContainer.querySelectorAll('.video-overlay-button').forEach(b => this.adjustFontSize(b));
    }

    adjustFontSize(btn) {
        if (!btn || btn.classList.contains('embed-container')) return;
        // Original font size in px
        const origPx = parseFloat(btn.dataset.origFontPx || window.getComputedStyle(btn).fontSize);
        if (!origPx) return;
        // Capture original button width once
        if (!btn.dataset.origButtonW) {
            btn.dataset.origButtonW = btn.offsetWidth || 1;
        }
        const origW = parseFloat(btn.dataset.origButtonW) || 1;
        const currentW = btn.offsetWidth || origW;
        const scale = currentW / origW;
        const minRatio = 0.75; // Prevent text from becoming too small
        const newSize = Math.max(origPx * minRatio, origPx * scale);
        btn.style.fontSize = `${newSize}px`;
    }

    /* ---- legacy helpers kept for safety but unused ---- */
    destroy() {
        if (this.hls) {
            this.hls.destroy();
        }
        if (this.videoEl) {
            this.videoEl.pause();
            this.videoEl.src = '';
            if (this.timeUpdateHandler) {
                this.videoEl.removeEventListener('timeupdate', this.timeUpdateHandler);
            }
            if (this.videoEndedHandler) { // Remove ended listener
                this.videoEl.removeEventListener('ended', this.videoEndedHandler);
            }
        }
        if (this.buttonsContainer) {
            this.buttonsContainer.removeEventListener('click', this.buttonClickHandler);
            this.buttonsContainer.innerHTML = '';
        }
        console.log('Player destroyed.');
    }
}
