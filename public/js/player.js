class IVSPlayer {
    constructor(overlayElement, projectData, startNodeId) {
        this.overlay = overlayElement;
        this.project = projectData;
        this.videoEl = this.overlay.querySelector('#preview-video');
        this.buttonsContainer = this.overlay.querySelector('.preview-buttons-overlay');
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
        this.videoEndedHandler = this.handleVideoEnd.bind(this);

        this.loadVideo(startNodeId);
    }

    loadVideo(nodeId) {
        // Clear any existing timeouts
        this.clearAllButtonTimeouts();
        this.activeButtons.clear();
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
            // Clean up buttons that are past their show time and have no active animations
            else if (!isWithinShowTime && buttonEl) {
                // For buttons with animateOut, removal handled after animation completes in animateOutButton()
                if (button.animateOut?.enabled && buttonData?.hasAnimatedOut) {
                    buttonEl.remove();
                    this.activeButtons.delete(button.id);
                }
                // If animateOut is not enabled, keep button persistent across loops
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
        buttonEl.textContent = buttonData.text;
        buttonEl.dataset.buttonId = buttonData.id;
        
        // Apply base styles
        const buttonStyle = {
            position: 'absolute',
            left: buttonData.position?.x || '50%',
            top: buttonData.position?.y || '50%',
            pointerEvents: 'auto',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...buttonData.style
        };
        
        // Apply the base styles
        Object.assign(buttonEl.style, buttonStyle);
        
        // Apply animation if specified
        if (buttonData.animation?.type !== 'none') {
            const animClass = buttonData.animation.type === 'slide' 
                ? `anim-slide-${buttonData.animation.direction || 'left'}` 
                : 'anim-fade-in';
                
            buttonEl.classList.add(animClass);
            buttonEl.style.animationDuration = `${buttonData.animation.duration || 1}s`;
            
            // Force reflow to ensure animation plays
            void buttonEl.offsetWidth;
        } else {
            // If no animation, just show the button
            buttonEl.style.opacity = '1';
        }
        
        this.buttonsContainer.appendChild(buttonEl);
        return buttonEl;
    }

    handleButtonClick(e) {
        const target = e.target.closest('.video-overlay-button');
        if (!target) return;

        const buttonId = target.dataset.buttonId;
        const buttonData = this.currentNode.buttons.find(b => b.id === buttonId);

        if (buttonData.linkType === 'url') {
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
