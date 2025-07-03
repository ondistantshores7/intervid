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
    constructor(videoEl, projectData) {
        this.videoEl = videoEl;
        this.projectData = projectData;
        this.videoContainer = videoEl.parentElement;
        this.buttonsContainer = document.createElement('div');
        this.buttonsContainer.className = 'video-buttons-container';
        this.videoContainer.appendChild(this.buttonsContainer);
        
        // Initialize HLS if available (for Cloudflare Stream) - call after method definition
        if (typeof this.initHLS === 'function') {
            this.initHLS();
        } else {
            console.warn('initHLS method not found, skipping HLS initialization');
        }

        // Setup controls container
        this.controlsContainer = document.createElement('div');
        this.controlsContainer.className = 'video-controls-container';
        this.videoContainer.appendChild(this.controlsContainer);

        // Setup captions
        this.setupCaptions();

        this.buttonClickHandler = this.handleButtonClick.bind(this);
        this.buttonsContainer.addEventListener('click', this.buttonClickHandler);

        // Responsive font adjustment
        this.adjustAllButtonFonts = this.adjustAllButtonFonts.bind(this);
        window.addEventListener('resize', this.adjustAllButtonFonts);
        this.videoEl.addEventListener('loadedmetadata', this.adjustAllButtonFonts);
        // Initial adjustment
        setTimeout(this.adjustAllButtonFonts, 0);

        this.videoEndedHandler = this.handleVideoEnd.bind(this);

        this.setupHighlighter();
        this.initPlayer();
    }

    setupCaptions() {
        this.availableLanguages = this.getAvailableLanguages();
        this.captionsActive = false;
        this.currentLanguage = localStorage.getItem('preferredCaptionLanguage') || null;

        // Create captions button
        this.captionsButton = document.createElement('button');
        this.captionsButton.className = 'video-control-button captions-button';
        this.captionsButton.innerText = 'CC';
        this.captionsButton.title = 'Toggle Captions';
        this.captionsButton.setAttribute('aria-label', 'Toggle Captions');
        this.captionsButton.setAttribute('aria-haspopup', 'true');
        this.controlsContainer.appendChild(this.captionsButton);

        // Create captions menu
        this.captionsMenu = document.createElement('div');
        this.captionsMenu.className = 'captions-menu';
        this.captionsMenu.setAttribute('role', 'menu');
        this.captionsMenu.style.display = 'none';
        this.controlsContainer.appendChild(this.captionsMenu);

        // Disable or hide button if no captions available
        if (this.availableLanguages.length === 0) {
            this.captionsButton.style.display = 'none';
        } else {
            this.updateCaptionsMenu();
            this.captionsButton.addEventListener('click', () => this.toggleCaptionsMenu());
        }

        // Load captions if a preferred language is set
        if (this.currentLanguage && this.availableLanguages.includes(this.currentLanguage)) {
            this.loadCaptions(this.currentLanguage);
            this.captionsActive = true;
            this.captionsButton.classList.add('active');
        }
    }

    getAvailableLanguages() {
        // For now, simulate available languages based on projectData or video metadata
        // In a real implementation, this would come from Cloudflare API or video metadata
        const langs = [];
        if (this.projectData && this.projectData.video && this.projectData.video.subtitles) {
            if (this.projectData.video.subtitles.en) langs.push('en');
            if (this.projectData.video.subtitles.es) langs.push('es');
        }
        return langs;
    }

    updateCaptionsMenu() {
        this.captionsMenu.innerHTML = '';
        // Add 'Off' option
        const offItem = document.createElement('div');
        offItem.className = 'caption-item';
        offItem.setAttribute('role', 'menuitemradio');
        offItem.setAttribute('aria-checked', this.captionsActive ? 'false' : 'true');
        offItem.innerText = 'Off';
        offItem.addEventListener('click', () => {
            this.disableCaptions();
            this.toggleCaptionsMenu();
        });
        this.captionsMenu.appendChild(offItem);

        // Add language options
        this.availableLanguages.forEach(lang => {
            const item = document.createElement('div');
            item.className = 'caption-item';
            item.setAttribute('role', 'menuitemradio');
            item.setAttribute('aria-checked', this.captionsActive && this.currentLanguage === lang ? 'true' : 'false');
            item.innerText = lang === 'en' ? 'English' : 'Spanish';
            item.addEventListener('click', () => {
                this.loadCaptions(lang);
                this.toggleCaptionsMenu();
            });
            this.captionsMenu.appendChild(item);
        });
    }

    toggleCaptionsMenu() {
        const isExpanded = this.captionsMenu.style.display === 'block';
        this.captionsButton.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
        this.captionsMenu.style.display = isExpanded ? 'none' : 'block';
        this.updateCaptionsMenu();
    }

    loadCaptions(lang) {
        // Remove existing tracks
        const existingTracks = this.videoEl.querySelectorAll('track[kind="subtitles"]');
        existingTracks.forEach(track => {
            track.mode = 'disabled';
            track.remove();
        });

        this.captionsActive = true;
        this.currentLanguage = lang;
        this.captionsButton.classList.add('active');
        localStorage.setItem('preferredCaptionLanguage', lang);

        // Construct VTT URL (placeholder - adapt to actual Cloudflare Stream URL structure)
        // In a real implementation, this URL would be fetched from Cloudflare API or metadata
        const videoId = this.projectData.video ? this.projectData.video.id : (this.projectData.currentVideoId || '');
        let vttUrl = '';
        if (lang === 'en') {
            vttUrl = `https://videodelivery.net/${videoId}/subtitles/en.vtt`;
        } else if (lang === 'es') {
            vttUrl = `https://videodelivery.net/${videoId}/subtitles/es.vtt`;
        }

        if (vttUrl) {
            // Add new track
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.src = vttUrl;
            track.srclang = lang;
            track.label = lang === 'en' ? 'English' : 'Spanish';
            track.mode = 'showing';
            this.videoEl.appendChild(track);
        } else {
            console.error(`No VTT URL for language: ${lang}`);
        }
    }

    disableCaptions() {
        this.captionsActive = false;
        this.captionsButton.classList.remove('active');
        const tracks = this.videoEl.querySelectorAll('track[kind="subtitles"]');
        tracks.forEach(track => {
            track.mode = 'disabled';
            track.remove();
        });
        localStorage.removeItem('preferredCaptionLanguage');
        this.currentLanguage = null;
    }

    /* ---------------- Highlighter Setup ---------------- */
    setupHighlighter() {
        const container = this.videoContainer;
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
        console.log('Loading video for node:', nodeId);
        const node = this.projectData.videos.find(v => v.id === nodeId);
        if (!node) {
            console.error('Video node not found:', nodeId);
            return;
        }
        this.currentNode = node;
        this.loopCount = 0; // Reset loop count for new video

        // Clear existing buttons
        this.buttonsContainer.innerHTML = '';
        this.activeButtons.clear();
        this.animatedButtons.clear();

        // Set video source
        const videoUrl = node.hls_url || node.url;
        if (videoUrl) {
            if (this.hls) {
                console.log('Loading HLS stream:', videoUrl);
                this.hls.loadSource(videoUrl);
                this.hls.startLoad();
            } else {
                console.log('Loading direct video URL:', videoUrl);
                this.videoEl.src = videoUrl;
                this.videoEl.load();
            }
        } else {
            console.error('No video URL found for node:', nodeId);
        }

        // Add event listener for video end if not already added
        if (!this.videoEl.hasAttribute('data-end-listener')) {
            this.videoEl.addEventListener('ended', this.videoEndedHandler);
            this.videoEl.setAttribute('data-end-listener', 'true');
        }

        // Create buttons for this video
        if (node.buttons && node.buttons.length > 0) {
            node.buttons.forEach(btnData => {
                this.createButton(btnData);
            });
        }

        // Setup time update handler for button animations if not already added
        if (!this.timeUpdateHandler) {
            this.timeUpdateHandler = this.handleTimeUpdate.bind(this);
            this.videoEl.addEventListener('timeupdate', this.timeUpdateHandler);
        }
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

    createButton(btnData) {
        if (!btnData || !btnData.id) return null;
        console.log('Creating button:', btnData);
        const buttonEl = document.createElement('button');
        buttonEl.className = 'video-overlay-button';
        buttonEl.id = `btn-${btnData.id}`;
        buttonEl.dataset.nodeId = btnData.targetNodeId || '';
        buttonEl.dataset.url = btnData.url || '';
        buttonEl.dataset.action = btnData.action || 'next';
        buttonEl.innerText = btnData.text || 'Next';
        
        // Apply styles from btnData if available
        if (btnData.style) {
            if (btnData.style.position) {
                buttonEl.style.left = btnData.style.position.left ? `${btnData.style.position.left}px` : 'auto';
                buttonEl.style.top = btnData.style.position.top ? `${btnData.style.position.top}px` : 'auto';
                buttonEl.style.right = btnData.style.position.right ? `${btnData.style.position.right}px` : 'auto';
                buttonEl.style.bottom = btnData.style.position.bottom ? `${btnData.style.position.bottom}px` : 'auto';
            }
            if (btnData.style.size) {
                buttonEl.style.width = btnData.style.size.width ? `${btnData.style.size.width}px` : 'auto';
                buttonEl.style.height = btnData.style.size.height ? `${btnData.style.size.height}px` : 'auto';
            }
            if (btnData.style.color) {
                if (btnData.style.color.background) {
                    buttonEl.style.backgroundColor = btnData.style.color.background;
                }
                if (btnData.style.color.text) {
                    buttonEl.style.color = btnData.style.color.text;
                }
            }
            if (btnData.style.font) {
                buttonEl.style.fontSize = btnData.style.font.size ? `${btnData.style.font.size}px` : '16px';
            }
        }
        
        // Store original font px and adjust for current viewport
        if (!buttonEl.dataset.origFontPx) {
            const m = /([0-9.]+)px/.exec(buttonEl.style.fontSize || '');
            if (m) buttonEl.dataset.origFontPx = m[1];
        }
        this.adjustFontSize(buttonEl);

        this.buttonsContainer.appendChild(buttonEl);
        return buttonEl;
    }

    handleTimeUpdate() {
        if (!this.currentNode || !this.currentNode.buttons) return;
        const currentTime = this.videoEl.currentTime;
        this.currentNode.buttons.forEach(btnData => {
            if (!btnData || !btnData.time) return;
            const startTime = btnData.time.start || 0;
            const endTime = btnData.time.end || Infinity;
            const buttonEl = this.buttonsContainer.querySelector(`#btn-${btnData.id}`);
            if (!buttonEl) return;
            if (currentTime >= startTime && currentTime <= endTime) {
                if (!buttonEl.classList.contains('visible')) {
                    buttonEl.classList.add('visible');
                    this.activeButtons.set(btnData.id, buttonEl);
                    // Apply animation if specified and not yet animated
                    if (btnData.animation && !this.animatedButtons.has(btnData.id)) {
                        const animClass = `anim-${btnData.animation}`;
                        buttonEl.classList.add(animClass);
                        this.animatedButtons.add(btnData.id);
                    }
                }
            } else {
                if (buttonEl.classList.contains('visible')) {
                    buttonEl.classList.remove('visible');
                    this.activeButtons.delete(btnData.id);
                }
            }
        });
    }

    handleButtonClick(event) {
        const buttonEl = event.target.closest('.video-overlay-button');
        if (!buttonEl) return;
        const targetNodeId = buttonEl.dataset.nodeId || '';
        const url = buttonEl.dataset.url || '';
        const action = buttonEl.dataset.action || 'next';
        console.log(`Button clicked: target=${targetNodeId}, action=${action}, url=${url}`);
        if (action === 'next' && targetNodeId) {
            this.loadVideo(targetNodeId);
            this.videoEl.play().catch(err => console.error('Play failed:', err));
        } else if (action === 'url' && url) {
            window.open(url, '_blank');
        } else if (action === 'restart') {
            if (this.currentNode) {
                this.loadVideo(this.currentNode.id);
                this.videoEl.play().catch(err => console.error('Play failed:', err));
            }
        }
    }

    handleVideoEnd() {
        console.log('Video ended. Loop count:', this.loopCount);
        if (this.currentNode) {
            if (this.currentNode.loop && this.currentNode.loop.enabled && this.loopCount < (this.currentNode.loop.count || 1)) {
                console.log('Looping video.');
                this.loopCount++;
                this.videoEl.currentTime = 0;
                this.videoEl.play().catch(err => console.error('Play failed:', err));
            } else {
                const nextNodeId = this.findNextNodeId();
                if (nextNodeId) {
                    console.log('Moving to next node:', nextNodeId);
                    this.loadVideo(nextNodeId);
                    this.videoEl.play().catch(err => console.error('Play failed:', err));
                } else {
                    console.log('No next node found.');
                }
            }
        }
    }

    findNextNodeId() {
        if (!this.currentNode || !this.projectData.connections) return null;
        
        // Find connections where this node is the source
        const connections = this.projectData.connections.filter(
            conn => conn.sourceId === this.currentNode.id
        );
        
        if (connections.length > 0) {
            // Sort by order if available, or use first connection
            connections.sort((a, b) => (a.order || 0) - (b.order || 0));
            return connections[0].targetId || null;
        }
        return null;
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
        // Use viewport width as an additional scaling factor for mobile
        const viewportWidth = window.innerWidth;
        const baseViewport = 1440; // Reference desktop width
        const viewportScale = viewportWidth / baseViewport;
        const scale = (currentW / origW) * Math.min(1, viewportScale);
        const minRatio = 0.6; // Adjusted minimum to ensure visibility on mobile
        const newSize = Math.max(origPx * minRatio, origPx * scale);
        btn.style.fontSize = `${newSize}px`;
    }

    initPlayer() {
        // Initialize player logic here
        console.log('Initializing player with project data:', this.projectData);
        // Additional initialization can be added as needed
        // Load the starting video
        const startNodeId = this.projectData.startNodeId || (this.projectData.videos && this.projectData.videos.length > 0 ? this.projectData.videos[0].id : null);
        if (startNodeId) {
            this.loadVideo(startNodeId);
        } else {
            console.error('No start node or video found in project data');
        }
    }

    initHLS() {
        // Check for HLS.js support and initialize if available
        if (typeof Hls !== 'undefined' && Hls && Hls.isSupported && Hls.isSupported()) {
            this.hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
            });
            this.hls.attachMedia(this.videoEl);
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('HLS manifest parsed');
            });
            this.hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.error('Network error:', data);
                            this.hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.error('Media error:', data);
                            this.hls.recoverMediaError();
                            break;
                        default:
                            console.error('Unrecoverable HLS error:', data);
                            this.hls.destroy();
                            this.hls = null;
                            break;
                    }
                }
            });
        } else if (this.videoEl.canPlayType('application/vnd.apple.mpegurl')) {
            // For Safari and iOS devices
            console.log('Using native HLS playback');
        } else {
            console.warn('HLS not supported, falling back to regular playback');
        }
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
