(function() {
    // --- Embed Security: Domain Locking ---
            const allowedDomains = [
        'threeminutetheory.com',       // Your primary custom domain
        'learn.threeminutetheory.com', // Your learning subdomain
        'kajabi.com',                  // Base Kajabi domain
        'mykajabi.com',                // Common Kajabi site domain for courses
        'localhost',                   // For local development
        '127.0.0.1',                   // For local development
        // removed dynamic host
    ];

    try {
                const selfHost = window.location.hostname;
        let parentHost = '';
        try { parentHost = new URL(document.referrer || '').hostname; } catch (_) {}
        const isAllowedHost = (host) => allowedDomains.some(domain => host === domain || host.endsWith('.' + domain));
        const allowed = isAllowedHost(selfHost) || (parentHost && isAllowedHost(parentHost));
        // (replaced by new allowed logic above)

        if (!allowed) {
            console.error(`[Security] Embedding of this player is not allowed (selfHost=${selfHost}, parentHost=${parentHost}).`);
            // Stop player initialization and show an error message.
            document.addEventListener('DOMContentLoaded', () => {
                const containers = document.querySelectorAll('[data-project]');
                containers.forEach(container => {
                    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background-color:#000;color:#fff;font-family:sans-serif;">This content is not authorized to be displayed on this domain.</div>';
                });
            });
            // Halt further script execution in this file.
            throw new Error('Domain not allowed.');
        }
    } catch (e) {
        // This error typically happens in a cross-origin iframe context.
        // We will block it by default for security.
        console.error('[Security] Could not verify top-level domain. Blocking for security.', e.message);
        document.addEventListener('DOMContentLoaded', () => {
            const containers = document.querySelectorAll('[data-project]');
            containers.forEach(container => {
                container.innerHTML = '<div style="padding:20px;color:red;">This content cannot be embedded.</div>';
            });
        });
        throw new Error('Cross-origin embedding is not permitted.');
    }

    console.log('Interactive Video Player script loaded!');
})();

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
                <div class="preview-buttons-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; pointer-events:none;"></div>
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
    // Cache posters so multiple players using the same URL don't duplicate work
    static _posterCache = new Map();
    constructor(overlayElement, projectData, startNodeId) {
        this.overlay = overlayElement;
        // Guarantee relative positioning so overlay-child buttons anchor correctly (especially in preview modal)
        if (window.getComputedStyle(this.overlay).position === 'static') {
            this.overlay.style.position = 'relative';
        }
        this.project = projectData;
        this.videoEl = this.overlay.querySelector('#preview-video');
        if (this.videoEl) {
            // Kick off poster generation (non-blocking)
            this._setPosterFromFirstVideo().catch(err => console.warn('Poster generation failed', err));
        }
        this.buttonsContainer = this.overlay.querySelector('.preview-buttons-overlay');
        // Ensure any previously injected style hiding the native overflow menu is removed
        const prevHide = document.getElementById('ivs-hide-native-overflow-style');
        // Ensure any previously injected style hiding the native overflow menu is removed
        if (prevHide) prevHide.remove();


        // -------- Caption Switch + Menu UI --------
        // menu (three-dots) button
        this.menuBtn = document.createElement('button');
        this.menuBtn.textContent = '⋮';
        this.menuBtn.setAttribute('aria-label', 'Settings');
        Object.assign(this.menuBtn.style, {
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            zIndex: 31,
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            border: 'none',
            width: '28px',
            height: '28px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '18px',
            lineHeight: '24px',
            padding: '0'
        });
        this.overlay.appendChild(this.menuBtn);
        // Hide custom menu button (use native overflow menu instead)
        // Ensure three-dot menu is visible
        this.menuBtn.style.display = 'none';

        // Add arrow button for Video Select
        this.videoSelectArrow = document.createElement('button');
        this.videoSelectArrow.textContent = '←';
        this.videoSelectArrow.setAttribute('aria-label', 'Video Select');
        Object.assign(this.videoSelectArrow.style, {
            position: 'absolute',
            bottom: '52px',
            right: '108px', 
            zIndex: 31,
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            border: 'none',
            width: '28px',
            height: '28px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '18px',
            lineHeight: '24px',
            padding: '0'
        });
        this.overlay.appendChild(this.videoSelectArrow);
        this.videoSelectArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.videoSelectPanel.style.display === 'none') {
                this.videoSelectPanel.style.display = 'block';
                this.captionSwitch.style.display = 'none';
            } else {
                this.videoSelectPanel.style.display = 'none';
            }
        });

        // caption switch panel
        this.captionSwitch = document.createElement('div');
        this.captionSwitch.className = 'caption-switch';
        this.captionSwitch.innerHTML = `
            <button data-lang="off">CC Off</button>
            <button data-lang="en">English CC</button>
            <button data-lang="es">Español CC</button>`;
        Object.assign(this.captionSwitch.style, {
            position: 'absolute',
            bottom: '50px',
            right: '12px',
            zIndex: 30,
            background: 'rgba(0,0,0,0.8)',
            padding: '6px 8px',
            borderRadius: '4px',
            display: 'none'
        });
        Array.from(this.captionSwitch.querySelectorAll('button')).forEach(btn => {
            Object.assign(btn.style, {
                display: 'block',
                width: '100%',
                margin: '4px 0',
                background: '#fff',
                border: 'none',
                padding: '4px 6px',
                cursor: 'pointer',
                fontSize: '12px'
            });
        });

        // ----- Video Select panel -----
        this.videoSelectPanel = document.createElement('div');
        this.videoSelectPanel.className = 'video-select-panel';
        Object.assign(this.videoSelectPanel.style, {
            position: 'absolute',
            bottom: '50px',
            right: '12px',
            zIndex: 30,
            background: 'rgba(0,0,0,0.8)',
            padding: '6px 8px',
            borderRadius: '4px',
            display: 'none'
        });
        // Build video buttons dynamically
        const createJumpBtn =(label,nodeId)=>{
            const b=document.createElement('button');
            b.textContent=label;
            b.dataset.nodeId=nodeId;
            Object.assign(b.style,{display:'block',width:'100%',margin:'4px 0',background:'#fff',border:'none',padding:'4px 6px',cursor:'pointer',fontSize:'12px'});
            return b;
        };
        if(this.project?.videos?.length){
            const lessonNode=this.project.videos[0];
            this.videoSelectPanel.appendChild(createJumpBtn('Lesson Video',lessonNode.id));
            // Match nodes titled "Question #1" etc
            ['Question #1','Question #2','Question #3'].forEach(q=>{
                const n=this.project.videos.find(v=> (v.title||v.name||'').trim().toLowerCase()===q.toLowerCase());
                if(n) this.videoSelectPanel.appendChild(createJumpBtn(q,n.id));
            });
        }
        
        this.overlay.appendChild(this.videoSelectPanel);

        this.videoSelectPanel.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-node-id]');
            if (btn) {
                const nid = btn.dataset.nodeId;
                this.videoSelectPanel.style.display = 'none';
                this.loadVideo(nid);
            }
        });

        this.overlay.appendChild(this.captionSwitch);
        // poster will be hidden automatically once playback starts

        // toggle panel
        this.menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if(this.captionSwitch.style.display==='none' && this.videoSelectPanel.style.display==='none'){
                this.captionSwitch.style.display='block';
            }else{
                this.captionSwitch.style.display='none';
                this.videoSelectPanel.style.display='none';
            }
        });
        // hide when clicking outside
        this.overlay.addEventListener('click', (e) => {
            const clickedInPanels = this.captionSwitch.contains(e.target) || this.videoSelectPanel.contains(e.target) || e.target === this.menuBtn || e.target === this.videoSelectArrow || (this.canvas && this.canvas.contains(e.target)) || this.isHighlightMode;
            if (!clickedInPanels) {
                
                // hide any open panels
                this.captionSwitch.style.display = 'none';
                this.videoSelectPanel.style.display = 'none';
                // If click not on an overlay button, toggle video playback
                const hitButton = e.target.closest('.video-overlay-button');
                if (!hitButton && this.videoEl) {
                    if (this.videoEl.paused) this.videoEl.play();
                    else this.videoEl.pause();
                }
            }
        });
        // handle caption clicks
        this.captionSwitch.addEventListener('click', (e) => {
            const targetBtn = e.target.closest('button[data-lang]');
            // Using native overflow menu for captions; removed custom menu implementation.
        });
        // Listen to native textTracks changes (built-in captions menu)
        if (this.videoEl.textTracks && this.videoEl.textTracks.addEventListener) {
            this.videoEl.textTracks.addEventListener('change', () => this.handleNativeCaptionChange());
        }
        // Load caption preference from storage or default to English
        this.currentSubtitleLang = localStorage.getItem('ivs_caption_pref') || 'off';
        // --- Highlighter elements ---
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.isHighlightMode = false;
        this.hls = null;
        this.timeUpdateHandler = null;
        this.loopCount = 0; // Track number of loops for the current node
        this.persistentButtons = false; // when true, buttons stay visible across loops
        this.activeButtons = new Map(); // Track active buttons and their timeouts
        this.animatedButtons = new Set(); // Track which buttons have been animated in

        if (this.videoEl) {
            // Add thumbnail overlay <img>
            this.thumbnailImg = document.createElement('img');
            Object.assign(this.thumbnailImg.style, {
                position: 'absolute',
                inset: '0',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: '1',
                pointerEvents: 'none',
                background: '#000'
            });
            this.overlay.appendChild(this.thumbnailImg);
            // Add play button overlay
            this.playBtn = document.createElement('div');
            this.playBtn.innerHTML = '<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="rgba(0,0,0,0.5)"/><polygon points="26,20 26,44 46,32" fill="#fff"/></svg>';
            Object.assign(this.playBtn.style, {
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: '2',
                cursor: 'pointer',
                pointerEvents: 'auto',
                transition: 'transform 0.2s ease'
            });
            this.overlay.appendChild(this.playBtn);

            // Custom fullscreen toggle button
            this.fullscreenBtn = document.createElement('button');
            this.fullscreenBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="#fff"><path d="M3 3h8v2H5v6H3V3zm10 0h8v8h-2V5h-6V3zM3 13h2v6h6v2H3v-8zm16 0h2v8h-8v-2h6v-6z"/></svg>';
            Object.assign(this.fullscreenBtn.style, {
                position: 'absolute',
                bottom: '32px',
                right: '60px',
                zIndex: '3',
                background: 'rgba(0,0,0,0.6)',
                border: 'none',
                width: '28px',
                height: '28px',
                borderRadius: '4px',
                cursor: 'pointer',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: '0',            // hidden by default
                pointerEvents: 'none',   // ignore clicks while hidden
                transition: 'opacity 0.25s ease'
            });
            this.overlay.appendChild(this.fullscreenBtn);
            // Show logic vars
            let ctrlHideTimer;
            const showOverlayButtons = () => {
                this.fullscreenBtn.style.opacity = '1';
                this.videoSelectArrow.style.opacity = '1';
                this.fullscreenBtn.style.pointerEvents = 'auto';
                this.videoSelectArrow.style.pointerEvents = 'auto';
                clearTimeout(ctrlHideTimer);
                ctrlHideTimer = setTimeout(() => {
                    this.fullscreenBtn.style.opacity = '0';
                    this.fullscreenBtn.style.pointerEvents = 'none';
                    this.videoSelectArrow.style.opacity = '0';
                    this.videoSelectArrow.style.pointerEvents = 'none';
                }, 2000);
            };
            // Reveal button on user interaction
            this.overlay.addEventListener('mousemove', showOverlayButtons);
            this.overlay.addEventListener('touchstart', showOverlayButtons, { passive: true });
            this.overlay.addEventListener('mouseleave', () => {
                this.fullscreenBtn.style.opacity = '0';
                this.fullscreenBtn.style.pointerEvents = 'none';
                    this.videoSelectArrow.style.opacity = '0';
                    this.videoSelectArrow.style.pointerEvents = 'none';
            });
            // Also show when entering fullscreen (controls often fade in at entry)
            document.addEventListener('fullscreenchange', () => {
                if (document.fullscreenElement === this.overlay) {
                    showOverlayButtons();
                }
            });

            this.fullscreenBtn.addEventListener('click', (e) => {
                e.preventDefault();
                try {
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        this.overlay.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
                    }
                } catch (_) { /* ignored */ }
            });

            // Disable native fullscreen control on video to avoid confusion (not supported in all browsers)
            try {
                this.videoEl.setAttribute('controlsList', 'nofullscreen');
            } catch (_) {}

            this.playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.videoEl.paused) {
                    this.videoEl.play().catch(err => console.error('Play failed:', err));
                    this.playBtn.style.display = 'none';
                }
            });
            // Hover animation
            this.playBtn.addEventListener('mouseenter', () => {
                this.playBtn.style.transform = 'translate(-50%, -50%) scale(1.15)';
            });
            this.playBtn.addEventListener('mouseleave', () => {
                this.playBtn.style.transform = 'translate(-50%, -50%) scale(1)';
            });
            // Hide play button on playback
            this.videoEl.addEventListener('play', () => {
                this.playBtn.style.display = 'none';
            });
            // Generate poster / thumbnail
            this._setPosterFromFirstVideo().catch(err => console.warn('Poster generation failed', err));
            // Hide thumbnail once video actually plays
            this.videoEl.addEventListener('play', () => {
                if (this.thumbnailImg) this.thumbnailImg.style.display = 'none';
            });
        }
        if (!this.videoEl || !this.buttonsContainer) {
            console.error('Player elements not found in the overlay.');
            return;
        }

        this.buttonClickHandler = this.handleButtonClick.bind(this);
        this.buttonsContainer.addEventListener('click', this.buttonClickHandler);

        // Responsive font adjustment
        this.adjustAllButtonFonts = this.adjustAllButtonFonts.bind(this);
        window.addEventListener('resize', this.adjustAllButtonFonts);
        this.videoEl.addEventListener('loadedmetadata', () => {
            this.adjustAllButtonFonts();
            if (this.currentSubtitleLang) {
                this.setSubtitleLanguage(this.currentSubtitleLang);
            }
        });
        // Re-apply caption preference whenever new text tracks appear (e.g., HLS after manifest parses)
        if (this.videoEl.textTracks) {
            const applyPref = () => this.setSubtitleLanguage(this.currentSubtitleLang);
            if (typeof this.videoEl.textTracks.addEventListener === 'function') {
                this.videoEl.textTracks.addEventListener('addtrack', applyPref);
            } else {
                this.videoEl.textTracks.onaddtrack = applyPref;
            }
        }
        // Initial adjustment
        setTimeout(this.adjustAllButtonFonts, 0);

        this.videoEndedHandler = this.handleVideoEnd.bind(this);

        this.setupHighlighter();

        // ----- Fullscreen overlay support -----
        // Use double-click on the video to toggle fullscreen on the overlay container instead of the bare <video> tag
        if (this.videoEl) {
            this.videoEl.addEventListener('dblclick', () => {
                try {
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        this.overlay.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
                    }
                } catch (_) { /* ignored */ }
            });
        }
        // Inject CSS for fullscreen overlay once
        if (!document.getElementById('ivs-fullscreen-overlay-style')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'ivs-fullscreen-overlay-style';
            styleEl.textContent = `
                .ivs-fullscreen-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    z-index: 2147483647 !important;
                    pointer-events: auto;
                }
            `;
            document.head.appendChild(styleEl);
        }

        const fullscreenChangeHandler = () => {
            const fsEl = document.fullscreenElement;
            if (fsEl && fsEl === this.overlay) {
                // Overlay is now in fullscreen – ensure correct class
                this.overlay.classList.add('ivs-fullscreen-overlay');
                // Recalculate responsive button fonts after 2 frames for accurate sizes
                requestAnimationFrame(() => requestAnimationFrame(() => this.adjustAllButtonFonts()));
            } else {
                // Exited fullscreen or fullscreen on a different element
                this.overlay.classList.remove('ivs-fullscreen-overlay');
                requestAnimationFrame(() => requestAnimationFrame(() => this.adjustAllButtonFonts()));
            }
        };
        document.addEventListener('fullscreenchange', fullscreenChangeHandler);
        // Also support WebKit (Safari, iOS)
        document.addEventListener('webkitfullscreenchange', fullscreenChangeHandler);

        this.loadVideo(startNodeId, false);

        // Caption watchdog disabled due to conflicts
        // this.startCaptionPrefWatch();
    }

    /* ---------------- Highlighter Setup ---------------- */
    setupHighlighter() {
        const container = this.overlay.querySelector('#video-container');
        const buttonParent = this.overlay; // ensures consistent anchoring across modes
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
            this.highlighterBtn.className = 'highlighter-btn video-overlay-button';
            this.highlighterBtn.title = 'Highlighter Tool';
            this.highlighterBtn.textContent = '🖍️';
            Object.assign(this.highlighterBtn.style, {
                 top: 'auto',
                 left: 'auto',
                position: 'absolute',
                bottom: '60px',
                right: '5px',
                display: 'none',
                fontSize: 'clamp(18px, 5vw, 32px)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer'
            });
            buttonParent.appendChild(this.highlighterBtn);

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
            buttonParent.appendChild(this.colorPicker);

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
            this.clearHighlightsBtn.addEventListener('click', (e)=>{
                e.stopPropagation();
                // Clear drawings
                this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
                // Exit highlight mode and restore UI
                this.isHighlightMode = false;
                this.canvas.style.pointerEvents = 'none';
                this.colorPicker.style.display = 'none';
                this.clearHighlightsBtn.style.display = 'none';
                this.highlighterBtn.classList.remove('active');
            });
            buttonParent.appendChild(this.clearHighlightsBtn);

            this.colorPicker.addEventListener('input', (e)=>{
                this.currentColor = e.target.value;
                this.ctx.strokeStyle = this.currentColor;
            });

            const toggleHighlight = (e) => {
                e.stopPropagation();
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
                
            };
            this.highlighterBtn.addEventListener('click', toggleHighlight);

            /* ------------ Staff Overlay Button ------------- */
            if (!this.staffBtn) {
                this.staffBtn = document.createElement('button');
                this.staffBtn.className = 'staff-btn video-overlay-button';
                this.staffBtn.title = 'Music Staff Overlay';
                this.staffBtn.textContent = '🎼';
                Object.assign(this.staffBtn.style, {
                     top: 'auto',
                     left: 'auto',
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
                buttonParent.appendChild(this.staffBtn);

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
                buttonParent.appendChild(closeBtn);

                buttonParent.appendChild(this.staffOverlay);

                // Toggle overlay on button click
                this.staffBtn.addEventListener('click', (e)=>{
                    e.stopPropagation();
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

    loadVideo(nodeId, autoplay = true) {
        this.isLooping = false;
        // Determine if this node's end action is looping so buttons should persist
        const nodeObj = this.project.videos.find(n => n.id === nodeId) || this.currentNode;
        this.persistentButtons = (nodeObj?.endAction?.type === 'loop') ||
            (nodeObj?.endAction?.type === 'node' && (nodeObj?.endAction?.targetNode === nodeObj.id || nodeObj?.endAction?.target === nodeObj.id));
        console.log('[IVS DEBUG] persistentButtons', this.persistentButtons, 'for node', nodeId, 'endAction', nodeObj?.endAction);

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
        // Show or hide play button based on autoplay
        if (this.playBtn) {
            // Show only in first load when autoplay is false
            this.playBtn.style.display = autoplay ? 'none' : 'block';
        }
        this.buttonsContainer.innerHTML = '';

        if (this.hls) {
            this.hls.destroy();
        }

        if (Hls.isSupported() && node.url.includes('.m3u8')) {
            this.hls = new Hls();
            // Re-apply caption preference whenever HLS updates subtitle tracks
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => this.applyHlsSubtitlePref());
            this.hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => this.applyHlsSubtitlePref());
            this.hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, () => this.applyHlsSubtitlePref());
            this.hls.loadSource(node.url);
            this.hls.attachMedia(this.videoEl);
        } else {
            this.videoEl.src = node.url;
        }
        // Apply caption preference immediately (will retry internally)
        if (this.currentSubtitleLang) {
            this.setSubtitleLanguage(this.currentSubtitleLang);
        }

        if (this.timeUpdateHandler) {
            this.videoEl.removeEventListener('timeupdate', this.timeUpdateHandler);
        }

        this.timeUpdateHandler = this.updateButtons.bind(this);
        this.videoEl.addEventListener('timeupdate', this.timeUpdateHandler);

        // Start playback only if requested and browser allows
        if (autoplay) {
            this.videoEl.play().catch(err => {
                console.warn('Autoplay prevented', err);
            });
        }

        // Handle video ending
        if (this.videoEndedHandler) {
            this.videoEl.removeEventListener('ended', this.videoEndedHandler);
        }
        this.videoEl.addEventListener('ended', this.videoEndedHandler);

        
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
                                    const shouldAnimateOut = this.persistentButtons ? false : !!button.animateOut?.enabled;
            const defaultVisibleDuration = 5;
            const endTime = shouldAnimateOut ? showTime + (button.animateOut.delay || defaultVisibleDuration) : Number.POSITIVE_INFINITY;

            const buttonData = this.activeButtons.get(button.id);
            const hasAnimatedIn = this.animatedButtons.has(button.id);
            const isWithinShowTime = currentTime >= showTime && currentTime < endTime;

            // Only handle buttons that are within their show time or have an active animation
            if (!isWithinShowTime && !buttonEl) {
                return; // Skip buttons that are not active and not visible
            }

            // Handle button appearance
            if (this.persistentButtons) {
                // Always ensure button is visible once its show time has passed
                if (isWithinShowTime && !buttonEl && !hasAnimatedIn) {
                    const newBtn = this.createButton(button);
                    this.animatedButtons.add(button.id);
                    this.activeButtons.set(button.id, { buttonEl: newBtn, hasAnimatedOut: false });
                }
                return; // skip any animate-out logic when persistent
            }
            if (isWithinShowTime && !buttonEl && !hasAnimatedIn) {
                const newButtonEl = this.createButton(button);
                this.animatedButtons.add(button.id);
                
                // If animate out is enabled, set a timeout to animate it out
                if (shouldAnimateOut) {
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
                if (shouldAnimateOut) {
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
            left: (buttonData.position?.x ?? '50%'),
            top: (buttonData.position?.y ?? '50%'),
            pointerEvents: 'auto',
            boxSizing: 'border-box',
            ...buttonData.style // User-defined styles
        };

        if (buttonData.linkType === 'embed') {
            buttonEl.classList.add('embed-container');
            buttonEl.innerHTML = buttonData.embedCode || '';
            // For embeds, we don't want flex centering, we want the content to fill the space.
        } else {
            buttonEl.innerHTML = (buttonData.text || '').replace(/\n/g, '<br>');
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
                buttonEl.dataset.origFontPx = `${px}`;
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
        // Orig font px already stored above
        this.adjustFontSize(buttonEl);

        return buttonEl;
    }

    debugSubtitleState(label) {
        try {
            const tracks = Array.from(this.videoEl?.textTracks || []).map((t,i)=>({i,mode:t.mode,lang:t.language,label:t.label}));
            const hlsInfo = this.hls ? {
                subtitleDisplay: this.hls.subtitleDisplay,
                subtitleTrack: this.hls.subtitleTrack,
                tracks: (this.hls.subtitleTracks||[]).map((t,i)=>({i,lang:t.lang,name:t.name}))
            } : 'no-hls';
            console.log('[IVS DEBUG]', label, {pref:this.currentSubtitleLang, browserTracks:tracks, hls:hlsInfo});
        } catch(e){}
    }


    /* ---------------- Poster generation ---------------- */
    async _setPosterFromFirstVideo() {
        try {
            if (!this.project?.videos?.length) return;
            const url = this.project.videos[0].url;
            if (!url || !this.videoEl) return;

            let thumbUrl;
            const isStream = /(?:cloudflarestream\.com|videodelivery\.net)/i.test(url);
            if (isStream) {
                // Convert manifest URL (.m3u8 or manifest variant) to thumbnail endpoint
                thumbUrl = url
                    .replace(/\/manifest(?:\/[^\/]+)?\.m3u8.*/, '/thumbnails/thumbnail.jpg')
                    .replace(/\/manifest\.m3u8.*/, '/thumbnails/thumbnail.jpg')
                    .replace(/\/manifest\.mp4.*/, '/thumbnails/thumbnail.jpg');

                // High-resolution: scale to device pixel ratio, cap at 1920px
                const widthPx = Math.min((this.videoEl.clientWidth || 1280) * (window.devicePixelRatio || 1), 1920);
                thumbUrl += `?time=2s&width=${Math.round(widthPx)}`;
            } else {
                // Fallback: media fragment trick
                thumbUrl = url.includes('#') ? url : `${url}#t=2`;
            }

            this.videoEl.poster = thumbUrl;
            if (this.thumbnailImg) this.thumbnailImg.src = thumbUrl;
        } catch (e) {
            console.warn('poster err', e);
        }
    }

    /* ---------------- Captions ---------------- */

    handleNativeCaptionChange() {
        if (!this.videoEl || !this.videoEl.textTracks) return;
        const showing = Array.from(this.videoEl.textTracks).find(t => t.mode === 'showing');
        const detected = showing ? this._langFromLabels(showing.language, showing.label) : 'off';
        if (detected !== this.currentSubtitleLang) {
            this.currentSubtitleLang = detected;
            localStorage.setItem('ivs_caption_pref', detected);
            this.applyHlsSubtitlePref();
            this.debugSubtitleState('native menu picked');
        }
    }

    _langFromLabels(langStr = '', labelStr = '') {
        const lcLang = langStr.toLowerCase();
        const lcLabel = labelStr.toLowerCase();
        if (lcLang.startsWith('es') || lcLabel.includes('español') || lcLabel.includes('espanol') || lcLabel.includes('spanish')) return 'es';
        if (lcLang.startsWith('en') || lcLabel.includes('english') || lcLabel.includes('inglés') || lcLabel.includes('ingles')) return 'en';
        return 'off';
    }

    setSubtitleLanguage(langCode, retryLeft = 20) {
        // Persist preference
        this.currentSubtitleLang = langCode;
        localStorage.setItem('ivs_caption_pref', langCode);
        this.debugSubtitleState('before apply');
        if (!this.videoEl || !this.videoEl.textTracks) return;
        // If no tracks yet, retry later (HLS may still be parsing)
        if (this.videoEl.textTracks.length === 0) {
            if (retryLeft > 0) setTimeout(() => this.setSubtitleLanguage(langCode, retryLeft - 1), 400);
            return;
        }
        // Apply to browser tracks
        const langMatches = (trk, pref) => {
            if (!trk) return false;
            const lcPref = (pref || '').toLowerCase();
            const lcLang = (trk.language || '').toLowerCase();
            const lcLabel = (trk.label || '').toLowerCase();
            if (lcPref === 'en') {
                return lcLang.startsWith('en') || lcLang.startsWith('eng') || lcLabel.includes('english') || lcLabel.includes('inglés') || lcLabel.includes('ingles');
            } else if (lcPref === 'es') {
                return lcLang.startsWith('es') || lcLang.startsWith('spa') || lcLabel.includes('español') || lcLabel.includes('spanish') || lcLabel.includes('espanol');
            }
            return false;
        };
        for (const track of this.videoEl.textTracks) {
            if (!langCode || langCode === 'off') {
                this.hls.subtitleDisplay = false;
                this.hls.subtitleTrack = -1; // Disable captions
                track.mode = 'hidden';
            } else {
                const match = (track.language && track.language.toLowerCase().startsWith(langCode)) ||
                              (track.label && track.label.toLowerCase().includes(langCode));
                track.mode = match ? 'showing' : 'disabled';
            }
        }
        // Confirm application; if not yet effective, retry
        const applied = Array.from(this.videoEl.textTracks).some(t => {
            if (!langCode || langCode === 'off') return t.mode === 'disabled';
            const matches = (t.language && t.language.toLowerCase().startsWith(langCode)) ||
                            (t.label && t.label.toLowerCase().includes(langCode));
            return matches && t.mode === 'showing';
        });
        if (!applied && retryLeft > 0) {
            setTimeout(() => this.setSubtitleLanguage(langCode, retryLeft - 1), 400);
        }
        // Synchronize HLS subtitle track with preference as well
        this.debugSubtitleState('after browser apply');
        this.applyHlsSubtitlePref();
        this.debugSubtitleState('after hls apply');
    }

    startCaptionPrefWatch() {
        if (this.captionWatchTimer) clearInterval(this.captionWatchTimer);
        this.captionWatchTimer = setInterval(() => {
            if (!this.currentSubtitleLang) return;
            const pref = this.currentSubtitleLang;
            const langMatches = (trk, pref) => {
                if (!trk) return false;
                const lcPref = pref.toLowerCase();
                const lcLang = (trk.language || trk.lang || '').toLowerCase();
                const lcLabel = (trk.label || trk.name || '').toLowerCase();
                if (lcPref === 'off') return false;
                if (lcPref === 'en') {
                    return lcLang.startsWith('en') || lcLang.startsWith('eng') || lcLabel.includes('english');
                }
                if (lcPref === 'es') {
                    return lcLang.startsWith('es') || lcLang.startsWith('spa') || lcLabel.includes('español') || lcLabel.includes('spanish');
                }
                return false;
            };
            let matched = false;
            if (pref === 'off') {
                matched = Array.from(this.videoEl.textTracks || []).every(t => t.mode === 'disabled') && (!this.hls || this.hls.subtitleTrack === -1);
            } else {
                matched = Array.from(this.videoEl.textTracks || []).some(t => langMatches(t, pref) && t.mode === 'showing');
                if (!matched && this.hls && this.hls.subtitleTrack > -1) {
                    const sel = this.hls.subtitleTracks[this.hls.subtitleTrack];
                    matched = langMatches({lang: sel?.lang, name: sel?.name}, pref);
                }
            }
            if (!matched) {
                // Quick retry
                this.setSubtitleLanguage(pref, 3);
            }
        }, 1500);
    }

    applyHlsSubtitlePref() {
        if (!this.hls) return;
        const pref = this.currentSubtitleLang;
        if (!pref || pref === 'off') {
            this.hls.subtitleDisplay = false;
            this.hls.subtitleTrack = -1;
            return;
        }
        const langMatches = (trk, pref) => {
            if (!trk) return false;
            const lcPref = (pref || '').toLowerCase();
            const lcLang = (trk.lang || '').toLowerCase();
            const lcName = (trk.name || '').toLowerCase();
            if (lcPref === 'en') {
                return lcLang.startsWith('en') || lcLang.startsWith('eng') || lcName.includes('english') || lcName.includes('inglés') || lcName.includes('ingles');
            } else if (lcPref === 'es') {
                return lcLang.startsWith('es') || lcLang.startsWith('spa') || lcName.includes('español') || lcName.includes('spanish') || lcName.includes('espanol');
            }
            return false;
        };
        const tracks = this.hls.subtitleTracks || [];
        const idx = tracks.findIndex(t => langMatches({lang: t.lang, name: t.name}, pref));
        this.hls.subtitleDisplay = true;
        this.hls.subtitleTrack = idx !== -1 ? idx : -1;
    }

    handleButtonClick(e) {
        const target = e.target.closest('.video-overlay-button');
        if (!target) return;

        const buttonId = target.dataset.buttonId;
        const buttonData = this.currentNode.buttons.find(b => b.id === buttonId);
        // Detect caption-language toggle ONLY if the button text also contains caption keywords
        if (buttonData && buttonData.text) {
            const t = buttonData.text.toLowerCase();
            const hasCaptionKeyword = t.includes('caption') || t.includes('captions') || t.includes('subtit') || t.includes('cc');
            if (hasCaptionKeyword) {
                if (t.includes('español') || t.includes('espanol') || t.includes('spanish')) {
                    this.setSubtitleLanguage('es');
                } else if (t.includes('english') || t.includes('inglés') || t.includes('ingles')) {
                    this.setSubtitleLanguage('en');
                } else if (t.includes('off') || t.includes('no captions') || t.includes('sin subtítulos') || t.includes('sin subtitulos') || t.includes('none')) {
                    this.setSubtitleLanguage('off');
                }
            }
        }

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
        const endAction = this.currentNode.endAction;
        const isSelfLoop = endAction && endAction.type === 'node' && (endAction.targetNode === this.currentNode.id || endAction.target === this.currentNode.id);
        console.log('Video ended. Current node endAction:', endAction, 'isSelfLoop:', isSelfLoop);

        if (isSelfLoop) {
            this.loopCount++;
            console.log(`[SELF LOOP] Looping video (${this.loopCount}/3)`);
            if (this.loopCount < 3) {
                this.videoEl.currentTime = 0;
                this.videoEl.play().catch(e => console.error('Loop playback failed:', e));
                return;
            } else {
                this.loopCount = 0;
                const nextNodeId = this.findNextNodeId();
                if (nextNodeId) {
                    this.loadVideo(nextNodeId);
                }
                return;
            }
        }

        // ----- existing logic below -----
        // (self-loop handled above)
        if (!endAction || !endAction.type) {
            console.log('No end action defined or type is missing for node:', this.currentNode.id);
            return;
        }


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
                if (endAction.target) {
                    console.log(`End action: Play node ${endAction.target}`);
                    this.loadVideo(endAction.target);
                } else {
                    console.warn('End action type is "node", but no target specified.');
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

    adjustAllButtonFonts() {
        if (!this.buttonsContainer) return;
        this.buttonsContainer.querySelectorAll('.video-overlay-button').forEach(b => this.adjustFontSize(b));
    }

    adjustFontSize(btn) {
        if (!btn || btn.classList.contains('embed-container')) return;
        // Original font size in px
        const origPx = parseFloat(btn.dataset.origFontPx || window.getComputedStyle(btn).fontSize);
        if (!origPx) return;
        if (!btn.dataset.origFontPx) btn.dataset.origFontPx = origPx;
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
        const widthRatio = currentW / origW;
        const minRatio = 0.6; // minimum proportion of original size
        const scale = Math.max(minRatio, Math.min(1, widthRatio, viewportScale)); // never upscale above original
        let finalScale = scale;
        if (document.fullscreenElement === this.overlay) {
            // Slight up-scale in fullscreen to stay readable
            finalScale *= 0.92; // 8% smaller than original
        } else {
            // Down-scale in embedded view to fit buttons
            finalScale *= 0.8; // 20% smaller than original
        }
        const newSize = origPx * finalScale;
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
            // Always ensure correct stacking and interaction behaviour
            this.buttonsContainer.style.position = 'absolute';
            this.buttonsContainer.removeEventListener('click', this.buttonClickHandler);
            this.buttonsContainer.innerHTML = '';
        }
        console.log('Player destroyed.');
    }
}
