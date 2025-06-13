class IVSPlayer {
    constructor(overlayElement, projectData, startNodeId) {
        this.overlay = overlayElement;
        this.project = projectData;
        this.videoEl = this.overlay.querySelector('#preview-video');
        this.buttonsContainer = this.overlay.querySelector('.preview-buttons-overlay');
        this.hls = null;
        this.timeUpdateHandler = null;

        if (!this.videoEl || !this.buttonsContainer) {
            console.error('Player elements not found in the overlay.');
            return;
        }

        this.buttonClickHandler = this.handleButtonClick.bind(this);
        this.buttonsContainer.addEventListener('click', this.buttonClickHandler);

        this.loadVideo(startNodeId);
    }

    loadVideo(nodeId) {
        const node = this.project.videos.find(v => v.id === nodeId);
        if (!node) {
            console.error('Node not found:', nodeId);
            return;
        }
        this.currentNode = node;
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
        this.videoEl.play().catch(e => console.error('Preview playback failed:', e));
    }

    updateButtons() {
        const currentTime = this.videoEl.currentTime;
        this.currentNode.buttons.forEach(button => {
            const buttonEl = this.buttonsContainer.querySelector(`[data-button-id='${button.id}']`);
            const showTime = button.time;
            const endTime = showTime + 5; // Show for 5 seconds

            if (currentTime >= showTime && currentTime < endTime) {
                if (!buttonEl) {
                    this.createButton(button);
                }
            } else {
                if (buttonEl) {
                    buttonEl.remove();
                }
            }
        });
    }

    createButton(buttonData) {
        const buttonEl = document.createElement('button');
        buttonEl.className = 'video-overlay-button';
        buttonEl.textContent = buttonData.text;
        buttonEl.dataset.buttonId = buttonData.id;
        Object.assign(buttonEl.style, buttonData.style, {
            position: 'absolute',
            left: buttonData.position.x,
            top: buttonData.position.y
        });
        if(buttonData.animation && buttonData.animation.type!=='none'){
            const animClass = buttonData.animation.type==='slide'?`anim-slide-${buttonData.animation.direction}`:`anim-${buttonData.animation.type}`;
            buttonEl.classList.add(animClass);
            buttonEl.style.animationDuration = `${buttonData.animation.duration}s`;
        }
        this.buttonsContainer.appendChild(buttonEl);
    }

    handleButtonClick(e) {
        const target = e.target.closest('.video-overlay-button');
        if (!target) return;

        const buttonId = target.dataset.buttonId;
        const buttonData = this.currentNode.buttons.find(b => b.id === buttonId);

        if (buttonData.linkType === 'url') {
            window.open(buttonData.target, '_blank');
        } else {
            this.loadVideo(buttonData.target);
        }
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
        }
        if (this.buttonsContainer) {
            this.buttonsContainer.removeEventListener('click', this.buttonClickHandler);
            this.buttonsContainer.innerHTML = '';
        }
        console.log('Player destroyed.');
    }
}
