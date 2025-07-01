// For local development, this key should match the one in wrangler.toml

// Utility to generate unique IDs with an optional prefix
function generateId(prefix = '') {
    return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
}

window.ADMIN_API_KEY = "dev-key-123";

document.addEventListener('DOMContentLoaded', () => {
    const signOutButtons = document.querySelectorAll('.sign-out-btn');

    const attachLogoutHandler = (btn) => {
        if(!btn) return;
        btn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    // On successful logout, redirect to the login page
                    window.location.href = '/login';
                } else {
                    console.error('Logout failed:', result.message);
                    alert('Logout failed. Please try again.');
                }
            } catch (error) {
                console.error('Error during logout:', error);
                alert('An error occurred during logout. Please try again.');
            }
        });
    };

    // Attach to all sign-out buttons (editor + dashboard)
    signOutButtons.forEach(attachLogoutHandler);

    let isInitialized = false;
    if (isInitialized) {
        console.warn('Initialization script called more than once. Aborting duplicate run.');
        return;
    }
    isInitialized = true;
    console.log('Interactive Video Editor script loading...');

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

    const getElement = (id) => {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`Critical Error: HTML element with ID '${id}' not found.`);
            return null;
        }
        return element;
    };

    const getOutAnimClass = (button) => {
        if (!button.animation || button.animation.type === 'none') return null;
        if (button.animation.type === 'slide') {
            const dir = button.animation.direction || 'left';
            return `anim-slide-out-${dir}`; // Match CSS
        }
        return 'anim-fade-out'; // Default fade-out class
    };

    const getButtonEffectiveDuration = (button, videoDuration) => {
        const buttonStartTime = button.time || 0;
    
        // Priority 1: Animate Out is enabled. Duration is the animate out delay.
        if (button.animateOut && button.animateOut.enabled) {
            return button.animateOut.delay || 5; // Use animateOut.delay, with a fallback to 5.
        }
    
        // Priority 2: An explicit duration is set by the user.
        let explicitUserDuration = null;
        const DEFAULT_PLACEHOLDER_DURATION = 5;
        if (button.hasOwnProperty('duration')) {
            if (typeof button.duration === 'number' && button.duration > 0) {
                explicitUserDuration = button.duration;
            } else if (typeof button.duration === 'string') {
                const parsed = parseFloat(button.duration);
                if (!isNaN(parsed) && parsed > 0) {
                    explicitUserDuration = parsed;
                }
            }
        }
        if (explicitUserDuration !== null && explicitUserDuration !== DEFAULT_PLACEHOLDER_DURATION) {
            return explicitUserDuration;
        }
    
        // Priority 3: Default behavior - extend to the end of the video.
        if (videoDuration && videoDuration > buttonStartTime) {
            return videoDuration - buttonStartTime;
        }
    
        // Fallback duration if all else fails (e.g., no video duration).
        return 0.1; 
    };

    const dashboardView = getElement('dashboard');
    const editorView = getElement('editor');
    const newProjectBtn = getElement('new-project-btn');
    const backToDashboardBtn = getElement('back-to-dashboard-btn');
    const projectTitleEditor = getElement('project-title-editor');
    const renameProjectBtn = getElement('rename-project-btn');
    const addVideoBtn = getElement('add-video-btn');
    const nodesContainer = getElement('nodes-container');
    const nodeEditorPanel = getElement('node-editor-panel');
    const closePanelBtn = getElement('close-panel-btn');
    const nodeNameInput = getElement('node-name-input');
    const nodeUrlInput = getElement('node-url-input');
    const nodeVideoPreview = getElement('node-video-preview');
    const nodeVideoButtonsOverlay = getElement('node-video-buttons-overlay');
    const timelineScrubber = getElement('timeline-scrubber');
    const timelinePlayhead = getElement('timeline-playhead');
    const timelineMarkers = getElement('timeline-markers');
    const buttonsList = getElement('buttons-list');
    const addButtonBtn = getElement('add-button-btn');
    const buttonEditorPanel = getElement('button-editor-panel');
    const buttonTextInput = getElement('button-text-input');
    const buttonTimeInput = getElement('button-time-input');
    const buttonLinkType = getElement('button-link-type');
    const nodeLinkContainer = getElement('node-link-container');
    const urlLinkContainer = getElement('url-link-container');
    const embedCodeContainer = getElement('embed-code-container');
    const buttonEmbedCode = getElement('button-embed-code');
    const buttonTargetNode = getElement('button-target-node');
    const buttonTargetUrl = getElement('button-target-url');
    const deleteButtonBtn = getElement('delete-button-btn');
    const duplicateButtonBtn = getElement('duplicate-button-btn');
const alignCenterBtn = getElement('align-center-btn');
const spreadOutBtn = getElement('spread-out-btn');

    const buttonPosXInput = getElement('button-pos-x-input');
    const buttonPosYInput = getElement('button-pos-y-input');
    const buttonWidthInput = getElement('button-width-input');
    const buttonHeightInput = getElement('button-height-input');
    const animationType = getElement('animation-type');
    const animationDirection = getElement('animation-direction');
    const animationDuration = getElement('animation-duration');
    const previewProjectBtn = getElement('preview-project-btn');
    const exportProjectBtn = getElement('export-project-btn');
    const duplicateNodeBtn = getElement('duplicate-node-btn');
    const deleteNodeBtn = getElement('delete-node-btn');
    const undoMainBtn = getElement('undo-main-btn');
    const undoNodePanelBtn = getElement('undo-node-panel-btn');
    const previewOverlay = getElement('preview-overlay');
    const closePreviewBtn = getElement('close-preview-btn');
    const projectSearchInput = getElement('project-search');
    const projectSortSelect = getElement('project-sort');
    const themeToggle = document.getElementById('theme-toggle');
    const connectionsSvg = document.getElementById('connections-svg');
    const animateOutCheckbox = getElement('animate-out-checkbox');
    const animateOutOptions = document.querySelector('.animate-out-options');
    const nodeIsStartNodeCheckbox = getElement('node-is-start-node');

    // Button Shadow Controls
    const buttonShadowEnable = getElement('button-shadow-enable');
    const shadowOptionsContainer = document.querySelector('.shadow-options'); // Note: querySelector for class
    const buttonShadowColor = getElement('button-shadow-color');
    const buttonShadowOpacity = getElement('button-shadow-opacity');
    const buttonShadowHOffset = getElement('button-shadow-h-offset');
    const buttonShadowVOffset = getElement('button-shadow-v-offset');
    const buttonShadowBlur = getElement('button-shadow-blur');
    const buttonShadowSpread = getElement('button-shadow-spread');
    // Opacity slider for button transparency
    const buttonOpacitySlider = getElement('button-opacity-slider');
    const buttonOpacityValue = getElement('button-opacity-value');
    const buttonShadowOpacityValue = getElement('button-shadow-opacity-value');
    const buttonShadowHOffsetValue = getElement('button-shadow-h-offset-value');
    const buttonShadowVOffsetValue = getElement('button-shadow-v-offset-value');
    const buttonShadowBlurValue = getElement('button-shadow-blur-value');
    const buttonShadowSpreadValue = getElement('button-shadow-spread-value');

    const buttonCornerRadiusSlider = getElement('button-corner-radius-slider');
    const buttonCornerRadiusValue = getElement('button-corner-radius-value');

    let projects = [];
    var currentProject = null; // use var so it's attached to window for export.js
    let currentNode = null;
    let selectedNodeId = null;
    let selectedButtonId = null;
    let draggedButtonElement = null;
    let hlsInstance = null;

    let undoStack = [];
    const MAX_UNDO_STEPS = 20;

    const loadProjects = () => {
        const loadedProjects = JSON.parse(localStorage.getItem('interactive-video-projects') || '[]');
        return loadedProjects.map(project => ({
            ...project,
            startNodeId: project.startNodeId || null, // Ensure startNodeId exists, default to null
            videos: project.videos || [], // Ensure videos array exists
            connections: project.connections || [], // Ensure connections array exists
            lastEdited: project.lastEdited || Date.now() // Ensure lastEdited timestamp
        })).map(project => {
            // Ensure all buttons have a duration
            if (project.videos) {
                project.videos.forEach(video => {
                    if (video.buttons) {
                        video.buttons.forEach(button => {
                            if (!button.hasOwnProperty('duration') || typeof button.duration !== 'number' || button.duration <= 0) {
                                button.duration = 5; // Default duration in seconds
                            }
                        });
                    }
                });
            }
            return project;
        });
    };
    const saveProjects = () => {
        // Update lastEdited timestamp for current project if applicable
        if (currentProject) {
            currentProject.lastEdited = Date.now();
        }
        localStorage.setItem('interactive-video-projects', JSON.stringify(projects));
    };

    const renderProjects = (filter='') => {
        const sortBy = projectSortSelect ? projectSortSelect.value : 'name';
        const container = getElement('projects-list');
        if(!container) return;
        container.innerHTML='';
        const list = [...projects];
        list.sort((a,b)=>{
            if(sortBy==='edited'){
                return (b.lastEdited||0) - (a.lastEdited||0); // newest first
            }
            return (a.name||'').localeCompare(b.name||'');
        });
        list.filter(p=>p.name.toLowerCase().includes(filter.toLowerCase())).forEach(project=>{
            const card=document.createElement('div');
            card.className='project-card';
            card.innerHTML=`<h3>${project.name}</h3><p>${project.videos.length} videos</p><p class="project-date">Edited: ${project.lastEdited ? new Date(project.lastEdited).toLocaleDateString() : '—'}</p>`;
            const editBtn=document.createElement('button');editBtn.textContent='Edit';editBtn.onclick=()=>navigateTo('editor',project.id);
            const renameBtn=document.createElement('button');renameBtn.textContent='Rename';renameBtn.onclick=()=>{
                const newName=prompt('Enter new project name:',project.name);
                if(newName && newName.trim()){
                    project.name=newName.trim();
                    saveProjects();
                    renderProjects(projectSearchInput.value);
                }
            };
            const dupBtn=document.createElement('button');dupBtn.textContent='Duplicate';dupBtn.onclick=()=>{const copy=JSON.parse(JSON.stringify(project));copy.id=generateId('project-');copy.name=project.name+' copy';copy.lastEdited=Date.now();projects.push(copy);saveProjects();renderProjects(projectSearchInput.value);} ;
            const delBtn=document.createElement('button');delBtn.textContent='Delete';delBtn.className='danger';delBtn.onclick=()=>{if(confirm('Delete project?')){projects=projects.filter(p=>p.id!==project.id);saveProjects();renderProjects(projectSearchInput.value);} };
            card.append(editBtn, renameBtn, dupBtn, delBtn);
            container.appendChild(card);
        });
    };

    const renderNodes = () => {
        nodesContainer.innerHTML = '';
        if (!currentProject) return;
        currentProject.videos.forEach(node => {
            const nodeEl = document.createElement('div');
            nodeEl.className = 'video-node';
            nodeEl.dataset.id = node.id;
            nodeEl.style.left = node.x || '0px';
            nodeEl.style.top = node.y || '0px';
            nodeEl.dataset.nodeId = node.id;

            if (node.id === selectedNodeId) {
                nodeEl.classList.add('node-selected');
            }

            nodeEl.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent click from propagating to dashboard if nodes are ever nested

                // Deselect previously selected node
                if (selectedNodeId && selectedNodeId !== node.id) {
                    const previouslySelectedElement = document.querySelector(`.video-node[data-node-id='${selectedNodeId}']`);
                    if (previouslySelectedElement) {
                        previouslySelectedElement.classList.remove('node-selected');
                    }
                }

                // Toggle selection for the current node
                if (selectedNodeId === node.id) {
                    // Already selected, so deselect it
                    nodeEl.classList.remove('node-selected');
                    selectedNodeId = null;
                    // TODO: Disable Duplicate/Delete buttons
                    if(duplicateNodeBtn) duplicateNodeBtn.disabled = true;
                    if(deleteNodeBtn) deleteNodeBtn.disabled = true;
                } else {
                    // Not selected, so select it
                    nodeEl.classList.add('node-selected');
                    selectedNodeId = node.id;
                    // TODO: Enable Duplicate/Delete buttons
                    if(duplicateNodeBtn) duplicateNodeBtn.disabled = false;
                    if(deleteNodeBtn) deleteNodeBtn.disabled = false;
                }
                console.log('Selected node ID:', selectedNodeId);
            });

            nodeEl.innerHTML = `<h4>${node.name}</h4>`;
            // connectors
            const inputDot=document.createElement('div');inputDot.className='node-input';inputDot.dataset.nodeTarget=node.id;
            const outputDot=document.createElement('div');outputDot.className='node-output';outputDot.dataset.nodeSource=node.id;
            outputDot.addEventListener('mousedown',startConnectionDrag);
            inputDot.addEventListener('mouseup',finishConnectionDrag);
            nodeEl.append(inputDot,outputDot);
            nodesContainer.appendChild(nodeEl);
        });
        renderConnections();
    };

    const renderButtons = () => {
        if (!selectedNodeId) return;
        const node = currentProject.videos.find(v => v.id === selectedNodeId);
        buttonsList.innerHTML = '';
        timelineMarkers.innerHTML = '';
        nodeVideoButtonsOverlay.innerHTML = '';
        if (!node || !node.buttons) return;

        const videoEl = document.getElementById('node-video-preview');
        const naturalWidth = videoEl.videoWidth;
        const displayWidth = videoEl.clientWidth;
        let scaleFactor = 1;

        if (naturalWidth > 0 && displayWidth > 0 && displayWidth < naturalWidth) {
            scaleFactor = displayWidth / naturalWidth;
        }

        const TIMELINE_BAR_HEIGHT = 20; // pixels
        const TIMELINE_BAR_GAP = 2;    // pixels
        const lanes = []; // Stores the end time of the last button in each lane

        // Create a shallow copy for sorting to avoid modifying the original order if needed elsewhere
        const sortedButtons = [...node.buttons].sort((a, b) => (a.time || 0) - (b.time || 0));

        sortedButtons.forEach(button => {
            // --- Existing logic for buttonItem in buttonsList ---
            const buttonItem = document.createElement('div');
            buttonItem.className = `button-item ${button.id === selectedButtonId ? 'selected' : ''}`;
            buttonItem.textContent = `${button.text} (@${(button.time || 0).toFixed(2)}s)`;
            buttonItem.dataset.buttonId = button.id;
            buttonsList.appendChild(buttonItem);
            // --- End of buttonItem logic ---

            // --- Timeline Bar Logic (with stacking) ---
            if (nodeVideoPreview.duration && nodeVideoPreview.duration > 0) {
                const buttonStartTime = button.time || 0;
                let buttonDuration = getButtonEffectiveDuration(button, nodeVideoPreview.duration);
                if (buttonDuration <= 0) {
                    buttonDuration = 0.1; 
                }
                const buttonEndTime = buttonStartTime + buttonDuration;

                let assignedLane = -1;
                for (let i = 0; i < lanes.length; i++) {
                    if (buttonStartTime >= lanes[i]) { // If button starts after or at the end of the last button in this lane
                        lanes[i] = buttonEndTime; // This lane is now occupied until this button's end time
                        assignedLane = i;
                        break;
                    }
                }
                if (assignedLane === -1) { // No suitable lane found, add a new one
                    lanes.push(buttonEndTime);
                    assignedLane = lanes.length - 1;
                }

                const bar = document.createElement('div');
                bar.className = 'timeline-button-bar';
                
                const barLeftPercent = (buttonStartTime / nodeVideoPreview.duration) * 100;
                const barWidthPercent = (buttonDuration / nodeVideoPreview.duration) * 100;

                if (!isNaN(barLeftPercent) && !isNaN(barWidthPercent)) {
                    bar.style.left = `${barLeftPercent}%`;
                    bar.style.width = `${Math.min(barWidthPercent, 100 - barLeftPercent)}%`;
                    bar.style.top = `${assignedLane * (TIMELINE_BAR_HEIGHT + TIMELINE_BAR_GAP)}px`;
                    bar.style.height = `${TIMELINE_BAR_HEIGHT}px`;

                    const textSpan = document.createElement('span');
                    textSpan.textContent = button.text || 'Button';
                    bar.appendChild(textSpan);

                    bar.dataset.buttonId = button.id; // Store button ID
                    bar.addEventListener('click', (e) => {
                        console.log('Timeline bar clicked:', e.currentTarget);
                        const clickedButtonId = e.currentTarget.dataset.buttonId;
                        console.log('Button ID from timeline bar:', clickedButtonId);
                        if (clickedButtonId) {
                            selectButton(clickedButtonId);
                        }
                    });
                    
                    timelineMarkers.appendChild(bar);
                } else {
                    console.warn('Button time or duration resulted in NaN for timeline bar:', button);
                }
            }
            // --- End of Timeline Bar Logic ---

            // --- Button Preview on Video Overlay ---
            const buttonPreview = document.createElement('button');
            buttonPreview.className = 'video-overlay-button';
            buttonPreview.dataset.buttonId = button.id;

            // Apply all saved styles first, as a base
            const style = button.style || {};
            Object.assign(buttonPreview.style, style);

            // Set non-scalable base properties
            buttonPreview.style.position = 'absolute';
            buttonPreview.style.left = button.position?.x || '40%';
            buttonPreview.style.top = button.position?.y || '80%';
            buttonPreview.style.pointerEvents = 'auto';
            buttonPreview.style.boxSizing = 'border-box';

            // Font size and line-height: use raw values so Edit Node matches preview/export
            if (style.fontSize) {
                buttonPreview.style.fontSize = style.fontSize;
            }
            if (style.lineHeight) {
                buttonPreview.style.lineHeight = style.lineHeight;
            }
            if (style.borderRadius) {
                const borderRadiusPx = parseFloat(style.borderRadius);
                if (!isNaN(borderRadiusPx)) buttonPreview.style.borderRadius = (borderRadiusPx * scaleFactor) + 'px';
            }
            if (style.padding) {
                const paddingValues = style.padding.split(' ').map(p => parseFloat(p));
                if (paddingValues.every(p => !isNaN(p))) {
                    buttonPreview.style.padding = paddingValues.map(p => (p * scaleFactor) + 'px').join(' ');
                }
            }
             // Scale width and height ONLY if they are in 'px'
            if (style.width && style.width.endsWith('px')) {
                const widthPx = parseFloat(style.width);
                if (!isNaN(widthPx)) buttonPreview.style.width = (widthPx * scaleFactor) + 'px';
            } else {
                buttonPreview.style.width = style.width; // Keep %, etc. as is
            }
            if (style.height && style.height.endsWith('px')) {
                const heightPx = parseFloat(style.height);
                if (!isNaN(heightPx)) buttonPreview.style.height = (heightPx * scaleFactor) + 'px';
            } else {
                buttonPreview.style.height = style.height; // Keep %, etc. as is
            }

            // Set content
            if (button.linkType === 'embed') {
                buttonPreview.classList.add('embed-container');
                buttonPreview.innerHTML = button.embedCode || '';
            } else {
                buttonPreview.textContent = button.text;
            }

            // Apply SCALED shadow
            if (button.shadow && button.shadow.enabled) {
                const s = button.shadow;
                const shadowColor = hexToRgba(s.color || '#000000', parseFloat(s.opacity) || 0.5);
                const hOffset = (parseFloat(s.hOffset) || 0) * scaleFactor;
                const vOffset = (parseFloat(s.vOffset) || 0) * scaleFactor;
                const blur = (parseFloat(s.blur) || 5) * scaleFactor;
                const spread = (parseFloat(s.spread) || 0) * scaleFactor;
                buttonPreview.style.boxShadow = `${hOffset}px ${vOffset}px ${blur}px ${spread}px ${shadowColor}`;
            } else {
                buttonPreview.style.boxShadow = 'none';
            }

            // Determine visibility
            const buttonStartTimeForOverlay = button.time || 0;
            let buttonDurationForOverlay = getButtonEffectiveDuration(button, nodeVideoPreview.duration);
            if (buttonDurationForOverlay <= 0) buttonDurationForOverlay = 0.1;
            const shouldShow = (nodeVideoPreview.currentTime >= buttonStartTimeForOverlay && nodeVideoPreview.currentTime < buttonStartTimeForOverlay + buttonDurationForOverlay) || button.id === selectedButtonId;
            
            // Set display and centering for text buttons
            const displayValue = button.linkType === 'embed' ? 'block' : 'flex';
            buttonPreview.style.display = shouldShow ? displayValue : 'none';
            if (displayValue === 'flex') {
                 buttonPreview.style.alignItems = 'center';
                 buttonPreview.style.justifyContent = 'center';
            }

            // Apply animation
            if (shouldShow && button.animation && button.animation.type !== 'none') {
                const animClass = button.animation.type === 'slide' ? `anim-slide-${button.animation.direction}` : `anim-${button.animation.type}`;
                buttonPreview.classList.add(animClass);
                buttonPreview.style.animationDuration = `${button.animation.duration}s`;
            }

            // Add drag and resize handles
            buttonPreview.addEventListener('mousedown', startButtonDrag);
            buttonPreview.addEventListener('touchstart', startButtonDrag, { passive: false });

            ['tl','tr','bl','br'].forEach(pos => {
                const handle = document.createElement('div');
                handle.className = `resize-handle ${pos}`;
                handle.dataset.buttonId = button.id;
                handle.addEventListener('mousedown', startResize);
                handle.addEventListener('touchstart', startResize, { passive:false });
                buttonPreview.appendChild(handle);
            });
            
            nodeVideoButtonsOverlay.appendChild(buttonPreview);
            // --- End of buttonPreview logic ---
        });
    };

    const startButtonDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        draggedButtonElement = e.target;
        const containerRect = nodeVideoButtonsOverlay.getBoundingClientRect();
        const onDrag = (moveEvent) => {
            const isTouchEvent = moveEvent.type === 'touchmove';
            const currentX = isTouchEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const currentY = isTouchEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
            let x = currentX - containerRect.left - (draggedButtonElement.offsetWidth / 2);
            let y = currentY - containerRect.top - (draggedButtonElement.offsetHeight / 2);
            x = Math.max(0, Math.min(x, containerRect.width - draggedButtonElement.offsetWidth));
            y = Math.max(0, Math.min(y, containerRect.height - draggedButtonElement.offsetHeight));
            draggedButtonElement.style.left = `${x}px`;
            draggedButtonElement.style.top = `${y}px`;
        };
        const onStopDrag = () => {
            const buttonId = draggedButtonElement.dataset.buttonId;
            const node = currentProject.videos.find(v => v.id === selectedNodeId);
            const button = node.buttons.find(b => b.id === buttonId);
            if (button) {
                pushToUndoStack(); // Save state before updating button position
                const finalX = parseFloat(draggedButtonElement.style.left);
                const finalY = parseFloat(draggedButtonElement.style.top);

                const newXPercent = (finalX / containerRect.width) * 100;
                const newYPercent = (finalY / containerRect.height) * 100;

                button.position = { x: `${newXPercent.toFixed(2)}%`, y: `${newYPercent.toFixed(2)}%` };
                saveProjects();

                if (button.id === selectedButtonId) {
                    buttonPosXInput.value = finalX.toFixed(0);
                    buttonPosYInput.value = finalY.toFixed(0);
                }
            }
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', onStopDrag);
            document.removeEventListener('touchmove', onDrag);
            document.removeEventListener('touchend', onStopDrag);
        };
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onStopDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('touchend', onStopDrag);
    };

    const startResize = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const handle = e.target;
        const buttonEl = handle.parentElement;
        const buttonId = buttonEl.dataset.buttonId;
        const node = currentProject.videos.find(v => v.id === selectedNodeId);
        const button = node.buttons.find(b => b.id === buttonId);
        const containerRect = nodeVideoButtonsOverlay.getBoundingClientRect();
        const initialWidth = buttonEl.offsetWidth;
        const initialHeight = buttonEl.offsetHeight;
        const initialX = buttonEl.offsetLeft;
        const initialY = buttonEl.offsetTop;
        const startX = (e.touches ? e.touches[0].clientX : e.clientX);
        const startY = (e.touches ? e.touches[0].clientY : e.clientY);

        const onMove = (moveEvent) => {
            moveEvent.preventDefault();
            const currentX = (moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX);
            const currentY = (moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY);
            const dx = currentX - startX;
            const dy = currentY - startY;
            let newWidth = initialWidth;
            let newHeight = initialHeight;
            let newLeft = initialX;
            let newTop = initialY;
            if (handle.classList.contains('br')) {
                newWidth = initialWidth + dx;
                newHeight = initialHeight + dy;
            } else if (handle.classList.contains('bl')) {
                newWidth = initialWidth - dx;
                newHeight = initialHeight + dy;
                newLeft = initialX + dx;
            } else if (handle.classList.contains('tr')) {
                newWidth = initialWidth + dx;
                newHeight = initialHeight - dy;
                newTop = initialY + dy;
            } else if (handle.classList.contains('tl')) {
                newWidth = initialWidth - dx;
                newHeight = initialHeight - dy;
                newLeft = initialX + dx;
                newTop = initialY + dy;
            }
            // constrain minimum size
            newWidth = Math.max(20, newWidth);
            newHeight = Math.max(20, newHeight);
            buttonEl.style.width = `${newWidth}px`;
            buttonEl.style.height = `${newHeight}px`;
            buttonEl.style.left = `${newLeft}px`;
            buttonEl.style.top = `${newTop}px`;
            button.style.borderRadius = `${buttonBorderRadiusInput.value}px`;
        };

        const onEnd = () => {
            const finalWidth = buttonEl.offsetWidth;
            const finalHeight = buttonEl.offsetHeight;
            const finalLeft = buttonEl.offsetLeft;
            const finalTop = buttonEl.offsetTop;
            // convert to %
            const widthPct = (finalWidth / containerRect.width) * 100;
            const heightPct = (finalHeight / containerRect.height) * 100;
            const leftPct = (finalLeft / containerRect.width) * 100;
            const topPct = (finalTop / containerRect.height) * 100;
            pushToUndoStack(); // Save state before updating button size/position
            button.style.width = `${widthPct.toFixed(2)}%`;
            button.style.height = `${heightPct.toFixed(2)}%`;
            button.position.x = `${leftPct.toFixed(2)}%`;
            button.position.y = `${topPct.toFixed(2)}%`;
            saveProjects();
            renderButtons();
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive:false });
        document.addEventListener('touchend', onEnd);
    };

    const handlePlayheadUpdate = () => {
        if (!nodeVideoPreview.duration || !selectedNodeId) return;
        const progress = (nodeVideoPreview.currentTime / nodeVideoPreview.duration) * 100;
        timelinePlayhead.style.left = `${progress}%`;
        const node = currentProject.videos.find(v => v.id === selectedNodeId);
        if (!node || !node.buttons) return;
        nodeVideoButtonsOverlay.querySelectorAll('.video-overlay-button').forEach(btn => {
            const buttonData = node.buttons.find(b => b.id === btn.dataset.buttonId);
            if (buttonData) {
                const buttonStartTimeForOverlay = buttonData.time || 0;
                const animateOutEnabled = buttonData.animateOut?.enabled;
                const animateOutDelay = buttonData.animateOut?.delay || 5;
                const animDurationSec = parseFloat(buttonData.animation?.duration) || 1;

                let displayState = 'none';

                if (animateOutEnabled) {
                    if (nodeVideoPreview.currentTime >= buttonStartTimeForOverlay && nodeVideoPreview.currentTime < buttonStartTimeForOverlay + animateOutDelay) {
                        // within main show window
                        displayState = 'block';
                        btn.classList.remove('anim-fade-out', 'anim-slide-out-left', 'anim-slide-out-right', 'anim-slide-out-top', 'anim-slide-out-bottom');
                    } else if (nodeVideoPreview.currentTime >= buttonStartTimeForOverlay + animateOutDelay && nodeVideoPreview.currentTime < buttonStartTimeForOverlay + animateOutDelay + animDurationSec) {
                        // play out animation
                        const outClass = getOutAnimClass(buttonData);
                        if (outClass && !btn.classList.contains(outClass)) {
                            // remove any in-animation classes to avoid transform conflicts
                            btn.classList.remove('anim-slide-left','anim-slide-right','anim-slide-top','anim-slide-bottom','anim-fade','anim-fade-in');
                            btn.classList.add(outClass);
                            btn.style.animationDuration = `${animDurationSec}s`;
                            // force reflow
                            void btn.offsetWidth;
                        }
                        displayState = 'block';
                    } else {
                        displayState = 'none';
                    }
                } else {
                    // regular shouldShow logic
                    let buttonDurationForOverlay = getButtonEffectiveDuration(buttonData, nodeVideoPreview.duration);
                    if (buttonDurationForOverlay <= 0) buttonDurationForOverlay = 0.1;
                    const keepSelectedVisible = nodeVideoPreview.paused;
                    const shouldShow = (nodeVideoPreview.currentTime >= buttonStartTimeForOverlay && nodeVideoPreview.currentTime < (buttonStartTimeForOverlay + buttonDurationForOverlay)) || (keepSelectedVisible && buttonData.id === selectedButtonId);
                    displayState = shouldShow ? 'block' : 'none';
                }

                btn.style.display = displayState;

                if (buttonData.animation) {
                    btn.style.animationDuration = `${buttonData.animation.duration}s`;
                }
                let buttonDurationForOverlay = getButtonEffectiveDuration(buttonData, nodeVideoPreview.duration);
                if (buttonDurationForOverlay <= 0) { // Ensure positive duration
                    buttonDurationForOverlay = 0.1;
                }

                const shouldShow = (nodeVideoPreview.currentTime >= buttonStartTimeForOverlay && nodeVideoPreview.currentTime < (buttonStartTimeForOverlay + buttonDurationForOverlay)) || buttonData.id === selectedButtonId;
                btn.style.display = shouldShow ? 'block' : 'none';

                if (buttonData.animation) {
                    btn.style.animationDuration = `${buttonData.animation.duration}s`;
                }
            }
        });
    };

    // ---- Navigation ----
    const navigateTo = (view, projectId = null) => {
        document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
        if (view === 'dashboard') {
            if(dashboardView) dashboardView.classList.add('active');
            currentProject = null;
            selectedNodeId = null;
            if(duplicateNodeBtn) duplicateNodeBtn.disabled = true;
            if(deleteNodeBtn) deleteNodeBtn.disabled = true;
            closeNodeEditor(); // Ensure editor panels are closed
            closeButtonEditor();
        } else if (view === 'editor') {
            if(editorView) editorView.classList.add('active');
            currentProject = projects.find(p => p.id === projectId);
            window.currentProject = currentProject;
            if (!currentProject) {
                console.error('Project not found:', projectId, 'Navigating to dashboard.');
                return navigateTo('dashboard');
            }
            if(projectTitleEditor && currentProject) projectTitleEditor.textContent = currentProject.name;
            renderNodes();
            renderConnections();
        } else {
            console.warn('Unknown view:', view, 'Navigating to dashboard.');
            navigateTo('dashboard');
        }
    };

    const getYoutubeVideoId = (url) => {
        if (!url) return null;
        // Standard YouTube watch URLs, short Youtu.be URLs, and embed URLs
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    // ---- Video Loading ----
    let youtubeIframe = null; // Keep a reference to the iframe
    let currentNodeEditorURL = null;

    const loadVideo = (videoElement, url, options = {}) => {
        const { autoplay = true } = options;
        if (!videoElement) return;

        const container = videoElement.parentElement; // Assuming videoElement is inside node-video-preview-container
        if (!youtubeIframe && container) {
            youtubeIframe = document.createElement('iframe');
            youtubeIframe.setAttribute('id', 'youtube-embed-preview');
            youtubeIframe.setAttribute('width', '100%');
            youtubeIframe.setAttribute('height', '100%');
            youtubeIframe.setAttribute('frameborder', '0');
            youtubeIframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
            youtubeIframe.setAttribute('allowfullscreen', '');
            youtubeIframe.style.display = 'none'; // Initially hidden
            container.appendChild(youtubeIframe);
        }

        // Reset HLS instance if it exists
        if (hlsInstance) {
            hlsInstance.destroy();
            hlsInstance = null;
        }

        const youtubeVideoId = getYoutubeVideoId(url);

        if (youtubeVideoId && youtubeIframe) {
            videoElement.style.display = 'none'; // Hide original video element
            videoElement.src = ''; // Clear src to stop any previous video
            if (hlsInstance) { // Ensure HLS is detached if it was active
                hlsInstance.destroy();
                hlsInstance = null;
            }
            youtubeIframe.src = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=${autoplay ? 1 : 0}&modestbranding=1&rel=0`;
            youtubeIframe.style.display = 'block';
            // For YouTube, metadata and errors are handled by the iframe itself.
            // We might not get `onloadedmetadata` or `onerror` events on the original videoElement.
            // This means renderButtons() and handlePlayheadUpdate() might need adjustment if they strictly depend on these for YouTube.
            // For now, let's assume basic playback is the goal.
            renderButtons(); // Call this to clear/update buttons based on new video type
            handlePlayheadUpdate();
        } else if (url && Hls.isSupported() && url.includes('.m3u8')) {
            hlsInstance = new Hls();
            hlsInstance.loadSource(url);
            hlsInstance.attachMedia(videoElement);
            hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                if (autoplay) videoElement.play().catch(e => console.warn("Autoplay prevented:", e));
            });
        } else if (url && (videoElement.canPlayType('application/vnd.apple.mpegurl') || videoElement.canPlayType('video/mp4') || videoElement.canPlayType('video/webm') || videoElement.canPlayType('video/ogg'))) {
            if (youtubeIframe) youtubeIframe.style.display = 'none'; // Hide iframe
            if (youtubeIframe) youtubeIframe.src = ''; // Clear iframe src
            videoElement.style.display = 'block'; // Show original video element
            videoElement.src = url;
            if (autoplay) videoElement.play().catch(e => console.warn("Autoplay prevented:", e));
        } else if (url) {
            console.error('Unsupported video format or HLS.js not available for:', url);
            if (youtubeIframe) youtubeIframe.style.display = 'none';
            if (youtubeIframe) youtubeIframe.src = '';
            videoElement.style.display = 'block';
            videoElement.src = ''; // Clear src if unsupported
        } else {
            if (youtubeIframe) youtubeIframe.style.display = 'none';
            if (youtubeIframe) youtubeIframe.src = '';
            videoElement.style.display = 'block';
            videoElement.src = ''; // Clear src if no URL
        }

        // Only set these for non-YouTube videos, as YouTube iframe handles its own events
        if (!youtubeVideoId) {
            videoElement.onloadedmetadata = () => {

                renderButtons(); 
                handlePlayheadUpdate(); 
            };
            videoElement.onerror = (e) => {
                console.error('Error loading video:', e, 'URL:', url);
                currentNodeEditorURL = null; // Clear on error
            };
        }
        currentNodeEditorURL = url;

    };

    // ---- Node Editor ----
    const nodeEndActionSelect = getElement('node-end-action');
    const nodeEndTargetNodeSelect = getElement('node-end-target-node');
    const nodeEndTargetUrlInput = getElement('node-end-target-url');

    const updateEndActionVisibility = () => {
        if (!nodeEndActionSelect) return;
        const val = nodeEndActionSelect.value;
        if(nodeEndTargetNodeSelect) nodeEndTargetNodeSelect.style.display = val === 'node' ? 'block' : 'none';
        if(nodeEndTargetUrlInput) nodeEndTargetUrlInput.style.display = val === 'url' ? 'block' : 'none';
    };

    const refreshTargetNodeDropdown = () => {
        if (!nodeEndTargetNodeSelect || !currentProject || !currentProject.videos) return;
        nodeEndTargetNodeSelect.innerHTML = '';
        currentProject.videos.forEach(v => {
            if (v.id === selectedNodeId) return; 
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = v.name;
            nodeEndTargetNodeSelect.appendChild(opt);
        });
    };

    const openNodeEditor = (nodeId, options = {}) => {
        const { isUndoRedo = false, autoplay = false } = options;
        selectedNodeId = nodeId;
        const node = currentProject.videos.find(v => v.id === nodeId);
        if (!node) return;
        if(nodeNameInput) nodeNameInput.value = node.name;
        if(nodeUrlInput) nodeUrlInput.value = node.url || '';
        if (node.url !== currentNodeEditorURL) {
            loadVideo(nodeVideoPreview, node.url, { autoplay });
        }
        renderButtons(); 
        if(nodeEditorPanel) nodeEditorPanel.classList.remove('hidden');

        setTimeout(() => {
            const videoEl = document.getElementById('node-video-preview');
            if (videoEl) {
                console.log(`Edit Node Video Dimensions: ${videoEl.clientWidth}w x ${videoEl.clientHeight}h`);
            }
        }, 100);
        closeButtonEditor(); 

        if (nodeIsStartNodeCheckbox) {
            nodeIsStartNodeCheckbox.checked = currentProject.startNodeId === nodeId;
        }

        if (nodeEndActionSelect) {
            refreshTargetNodeDropdown(); 
            if (node.endAction) {
                nodeEndActionSelect.value = node.endAction.type || 'none';
                refreshTargetNodeDropdown();
                if (node.endAction.type === 'node') {
                    nodeEndTargetNodeSelect.value = node.endAction.target || '';
                } else {
                    nodeEndTargetNodeSelect.value = '';
                }

                if (node.endAction.type === 'url') {
                    nodeEndTargetUrlInput.value = node.endAction.target || '';
                } else {
                    nodeEndTargetUrlInput.value = '';
                }
            } else {
                nodeEndActionSelect.value = 'none';
                nodeEndTargetNodeSelect.value = '';
                nodeEndTargetUrlInput.value = '';
            }
            updateEndActionVisibility();
        }
    };

    const closeNodeEditor = () => {
        currentNodeEditorURL = null;
        if(nodeEditorPanel) nodeEditorPanel.classList.add('hidden');
        if (hlsInstance) {
            hlsInstance.destroy();
            hlsInstance = null;
        }
        if(nodeVideoPreview) nodeVideoPreview.src = ''; 
        selectedNodeId = null;
        if(duplicateNodeBtn) duplicateNodeBtn.disabled = true;
        if(deleteNodeBtn) deleteNodeBtn.disabled = true;
    };

    const setupEventListeners = () => {
        // Re-render buttons on window resize to adjust for scaling
        window.addEventListener('resize', renderButtons);

        newProjectBtn.addEventListener('click', () => {
            const name = prompt('Enter project name:');
            if (!name) return;
            const project = { id: generateId('project-'), name, videos: [], connections: [], lastEdited: Date.now() };
            project.lastEdited = Date.now();
            projects.push(project);
            saveProjects();
            renderProjects();
            navigateTo('editor', project.id);
        });
        backToDashboardBtn.addEventListener('click', () => { saveProjects(); navigateTo('dashboard');});
        addVideoBtn.addEventListener('click', () => {
            const name = prompt('Enter node name:');
            if (!name || !currentProject) return;
            pushToUndoStack(); // Save state before adding new node
            const node = { id: `node-${Date.now()}`, name, url: '', buttons: [], x: '50px', y: '50px' };
            currentProject.videos.push(node);
            saveProjects();
            renderNodes();
            openNodeEditor(node.id);
        });
        nodesContainer.addEventListener('dblclick', e => {
            const nodeEl = e.target.closest('.video-node');
            if (nodeEl) openNodeEditor(nodeEl.dataset.id);
        });
        closePanelBtn.addEventListener('click', closeNodeEditor);
        nodeNameInput.addEventListener('change', e => {
            const node = currentProject.videos.find(v => v.id === selectedNodeId);
            if (node) {
                pushToUndoStack(); // Save state before changing node name
                node.name = e.target.value;
                saveProjects();
                renderNodes();
            }
        });
        nodeUrlInput.addEventListener('change', e => {
            const node = currentProject.videos.find(v => v.id === selectedNodeId);
            if (node) {
                pushToUndoStack(); // Save state before changing node URL
                node.url = e.target.value;
                loadVideo(nodeVideoPreview, node.url);
                saveProjects();
            }
        });
        addButtonBtn.addEventListener('click', () => {
            const node = currentProject.videos.find(v => v.id === selectedNodeId);
            if (!node) return;
            pushToUndoStack(); // Save state before adding new button
            const newButton = { id: `btn-${Date.now()}`, text: 'New Button', time: nodeVideoPreview.currentTime, duration: 5, linkType: 'node', target: '', embedCode: '', position: { x: '40%', y: '80%' }, style: { width: '15%', height: '10%', backgroundColor: '#007bff', color: '#ffffff', fontSize: '16px', padding: '10px 20px', border: 'none', borderRadius: '5px' }, animation: { type:'none', direction:'left', duration:'1' }, shadow: {
                        enabled: false,
                        color: '#000000',
                        opacity: 0.5,
                        hOffset: 2, // px
                        vOffset: 2, // px
                        blur: 4,    // px
                        spread: 0   // px
                    } };
            if (!node.buttons) node.buttons = [];
            node.buttons.push(newButton);
            saveProjects();
            renderButtons();
            selectButton(newButton.id);
        });
        buttonsList.addEventListener('click', e => {
            const item = e.target.closest('.button-item');
            if (item) {
                const buttonId = item.dataset.buttonId;
                selectButton(buttonId);

                // Jump video to button's start time
                if (selectedNodeId && currentProject && nodeVideoPreview) {
                    const node = currentProject.videos.find(v => v.id === selectedNodeId);
                    if (node && node.buttons) {
                        const button = node.buttons.find(b => b.id === buttonId);
                        if (button && typeof button.time === 'number') {
                            if (nodeVideoPreview.readyState >= 1) { // HAVE_METADATA or more
                                nodeVideoPreview.currentTime = button.time;
                            } else {
                                // Wait for metadata to load if video is not ready
                                nodeVideoPreview.addEventListener('loadedmetadata', function onLoadedMetadata() {
                                    nodeVideoPreview.currentTime = button.time;
                                    // Listener will be removed automatically due to { once: true }
                                }, { once: true });
                            }
                        }
                    }
                }
            }
        });

        const styleInputs = [
            buttonTextInput, buttonTimeInput, buttonLinkType, buttonTargetNode, buttonTargetUrl, buttonEmbedCode,
            buttonPosXInput, buttonPosYInput, buttonWidthInput, buttonHeightInput,
            animationType, animationDirection, animationDuration,
            document.getElementById('button-color-input'),
            document.getElementById('button-bgcolor-input'),
            buttonOpacitySlider,
            document.getElementById('button-font-family-input'),
            document.getElementById('button-font-size-input'),
            document.getElementById('button-padding-input'),

            document.getElementById('button-border-input'),
            animateOutCheckbox,
            document.getElementById('animate-out-delay'),
            // Shadow Controls
            buttonShadowEnable,
            buttonShadowColor,
            buttonShadowOpacity,
            buttonShadowHOffset,
            buttonShadowVOffset,
            buttonShadowBlur,
            buttonShadowSpread
        ];

        styleInputs.forEach(el => {
            if (el) {
                el.addEventListener('change', updateButtonFromEditor);
                if (el.type === 'color' || el.type === 'range' || el.type === 'number') {
                    el.addEventListener('input', updateButtonFromEditor);
                }
            }
        });

        if (animateOutCheckbox && animateOutOptions) {
            animateOutCheckbox.addEventListener('change', function () {
                animateOutOptions.style.display = this.checked ? 'block' : 'none';
                updateButtonFromEditor();
            });
        }

        if (buttonShadowEnable && shadowOptionsContainer) {
            buttonShadowEnable.addEventListener('change', function () {
                shadowOptionsContainer.style.display = this.checked ? 'grid' : 'none'; // Use 'grid' as per CSS
                updateButtonFromEditor();
            });
        }

        // Event listeners for shadow sliders to update their value displays
        const slidersWithValueDisplays = [
            { slider: buttonOpacitySlider, valueDisplay: buttonOpacityValue },
            { slider: buttonShadowOpacity, valueDisplay: buttonShadowOpacityValue },
            { slider: buttonShadowHOffset, valueDisplay: buttonShadowHOffsetValue },
            { slider: buttonShadowVOffset, valueDisplay: buttonShadowVOffsetValue },
            { slider: buttonShadowBlur, valueDisplay: buttonShadowBlurValue },
            { slider: buttonShadowSpread, valueDisplay: buttonShadowSpreadValue },
        ];

        slidersWithValueDisplays.forEach(({ slider, valueDisplay }) => {
            if (slider && valueDisplay) {
                slider.addEventListener('input', () => {
                    valueDisplay.textContent = slider.value;
                    // updateButtonFromEditor is already called by the generic styleInputs listener
                });
            }
        });

        if (buttonCornerRadiusSlider && buttonCornerRadiusValue) {
            // Live preview while dragging the slider
            buttonCornerRadiusSlider.addEventListener('input', () => {
                if (!selectedButtonId) return;
                const radius = buttonCornerRadiusSlider.value;
                buttonCornerRadiusValue.textContent = `${radius}px`;
                const buttonElement = document.querySelector(`.video-overlay-button[data-button-id="${selectedButtonId}"]`);
                if (buttonElement) {
                    buttonElement.style.borderRadius = `${radius}px`;
                }
            });

            // Save the final value to the project data when the slider is released
            buttonCornerRadiusSlider.addEventListener('change', (e) => {
                if (!selectedButtonId) return;
                updateButtonFromEditor(e); // This handles saving the data and pushing to the undo stack
            });
        }

        if (buttonLinkType) {
            buttonLinkType.addEventListener('change', function () {
                const type = this.value;
                if (nodeLinkContainer) nodeLinkContainer.style.display = type === 'node' ? 'block' : 'none';
                if (urlLinkContainer) urlLinkContainer.style.display = type === 'url' ? 'block' : 'none';
                if (embedCodeContainer) embedCodeContainer.style.display = type === 'embed' ? 'block' : 'none';
                updateButtonFromEditor();
            });
        }

        if (deleteButtonBtn) deleteButtonBtn.addEventListener('click', () => {
            if (!selectedButtonId || !selectedNodeId || !currentProject) return;
            // Push to stack *before* confirm, but pop if cancelled
            pushToUndoStack();
            if (!confirm('Are you sure you want to delete this button? This action can be undone.')) {
                undoStack.pop(); // Remove the state pushed for this aborted action
                updateUndoButtons(); // Reflect that the stack might be empty now
                return;
            }
            const node = currentProject.videos.find(v => v.id === selectedNodeId);
            if (node) {
                node.buttons = node.buttons.filter(b => b.id !== selectedButtonId);
                saveProjects();
                closeButtonEditor();
                renderButtons();
            }
        });

        if (duplicateButtonBtn) {
            duplicateButtonBtn.addEventListener('click', duplicateSelectedButton);
        }
        if (alignCenterBtn) {
            alignCenterBtn.addEventListener('click', () => alignButtonsInWindow('horizontal'));
        }
        if (spreadOutBtn) {
            spreadOutBtn.addEventListener('click', () => alignButtonsInWindow('spread'));
        }

        if (renameProjectBtn) {
            renameProjectBtn.addEventListener('click', () => {
                if (!currentProject) return;
                const newName = prompt('Enter new project name:', currentProject.name);
                if (newName && newName.trim()) {
                    currentProject.name = newName.trim();
                    saveProjects();
                    projectTitleEditor.textContent = currentProject.name;
                    renderProjects(projectSearchInput.value);
                }
            });
        }

        if (previewProjectBtn) previewProjectBtn.addEventListener('click', () => {
            if (!currentProject || currentProject.videos.length === 0) {
                alert('Project is empty or no videos to preview.');
                return;
            }
            const effectiveStartNodeId = currentProject.startNodeId ||
                (currentProject.videos[0] ? currentProject.videos[0].id : null);
            if (effectiveStartNodeId) {
                openPreview(effectiveStartNodeId);
            } else {
                alert('No start node defined and no videos in project to preview.');
            }
        });

        if (nodeVideoPreview) nodeVideoPreview.addEventListener('timeupdate', handlePlayheadUpdate);
        if (projectSearchInput) projectSearchInput.addEventListener('input', e => renderProjects(e.target.value));
        if (projectSortSelect) projectSortSelect.addEventListener('change', ()=>renderProjects(projectSearchInput.value));

        if(duplicateNodeBtn) duplicateNodeBtn.addEventListener('click', duplicateSelectedNode);
        if(deleteNodeBtn) deleteNodeBtn.addEventListener('click', deleteSelectedNode);

        if(themeToggle) {
            themeToggle.addEventListener('change', () => {
                document.body.classList.toggle('dark-mode', themeToggle.checked);
                document.body.classList.toggle('light-mode', !themeToggle.checked);
            });
        }

        if (nodeIsStartNodeCheckbox) {
            nodeIsStartNodeCheckbox.addEventListener('change', () => {
                if (!currentProject || !selectedNodeId) return;
                const node = currentProject.videos.find(v => v.id === selectedNodeId);
                if (!node) return;
                pushToUndoStack(); // Save state before changing start node status

                if (nodeIsStartNodeCheckbox.checked) {
                    currentProject.startNodeId = selectedNodeId;
                } else {
                    if (currentProject.startNodeId === selectedNodeId) {
                        currentProject.startNodeId = null;
                    }
                }
                saveProjects();
                renderNodes();
            });
        }

        // Node End Action listeners
        const nodeEndActionSelect = getElement('node-end-action');
        const nodeEndTargetNodeSelect = getElement('node-end-target-node');
        const nodeEndTargetUrlInput = getElement('node-end-target-url');

        if (nodeEndActionSelect) {
            nodeEndActionSelect.addEventListener('change', function() {
                if (!selectedNodeId) return;
                const node = currentProject.videos.find(v => v.id === selectedNodeId);
                if (!node) return;
                pushToUndoStack();

                const newAction = { type: this.value };
                if (this.value === 'node' && nodeEndTargetNodeSelect.options.length > 0) {
                    newAction.target = nodeEndTargetNodeSelect.value; // Default to first option
                } else if (this.value === 'url') {
                    newAction.target = ''; // Default to empty URL
                } else {
                    newAction.target = null;
                }
                node.endAction = newAction;

                updateEndActionVisibility();
                saveProjects();
                renderConnections();
            });
        }
        if (nodeEndTargetNodeSelect) {
            nodeEndTargetNodeSelect.addEventListener('change', function() {
                if (!selectedNodeId) return;
                const node = currentProject.videos.find(v => v.id === selectedNodeId);
                if (!node || !node.endAction || node.endAction.type !== 'node') return;
                pushToUndoStack();
                node.endAction.target = this.value;
                saveProjects();
                renderConnections();
            });
        }
        if (nodeEndTargetUrlInput) {
            nodeEndTargetUrlInput.addEventListener('input', () => { // Use input for live update
                if (!selectedNodeId || !currentProject) return;
                const node = currentProject.videos.find(v => v.id === selectedNodeId);
                if (!node || !node.endAction || node.endAction.type !== 'url') return;
                pushToUndoStack(); // Save state before changing end action target URL
                node.endAction.target = nodeEndTargetUrlInput.value;
                saveProjects();
            });
        }
    };

    const updateButtonFromEditor = (e) => {
        if (!selectedButtonId) return;
        const node = currentProject.videos.find(v => v.id === selectedNodeId);
        if (!node) return; // Ensure node exists before proceeding
        const button = node.buttons.find(b => b.id === selectedButtonId);
        if (!button) return;
        pushToUndoStack(); // Save state before updating button from editor

        // Initialize objects if they don't exist
        if (!button.style) button.style = {};
        if (!button.position) button.position = { x: '40%', y: '80%' };
        if (!button.animation) button.animation = { type: 'none', direction: 'left', duration: '1' };
        if (!button.animateOut) button.animateOut = { enabled: false, delay: 5 };

        // Define style reference early so subsequent code can use it safely
        const style = button.style;

        // Track if we need to update the button's dimensions/position
        const fontSizeInputEl = document.getElementById('button-font-size-input');
        const paddingInputEl = document.getElementById('button-padding-input');

        const needsFullRender = e && (
            e.target === buttonPosXInput ||
            e.target === buttonPosYInput ||
            e.target === buttonWidthInput ||
            e.target === buttonHeightInput ||
            e.target === buttonTextInput ||
            e.target === buttonTimeInput ||
            e.target === fontSizeInputEl ||
            e.target === paddingInputEl
        );

        // Always update basic properties
        button.text = buttonTextInput.value || 'Button';
        button.time = parseFloat(buttonTimeInput.value) || 0;
        button.linkType = buttonLinkType.value || 'node';
        if (buttonLinkType.value === 'node') {
            button.target = buttonTargetNode.value || '';
            button.embedCode = ''; // Clear embed code if not embed type
        } else if (buttonLinkType.value === 'url') {
            button.target = buttonTargetUrl.value || '';
            button.embedCode = ''; // Clear embed code if not embed type
        } else if (buttonLinkType.value === 'embed') {
            button.embedCode = buttonEmbedCode.value || '';
            button.target = ''; // Clear target if embed type
        }

        // Update animation properties
        if (!e || e.target === animationType || e.target === animationDirection || e.target === animationDuration) {
            button.animation = {
                type: animationType.value || 'none',
                direction: animationDirection.value || 'left',
                duration: animationDuration.value || '1'
            };

            // Toggle animation direction visibility based on the new type
            const animDirectionGroup = document.getElementById('anim-direction-group');
            if (animDirectionGroup) {
                animDirectionGroup.style.display = (button.animation.type === 'slide') ? 'block' : 'none';
            }
        }

        // Update animate out settings
        const animateOutCheckbox = document.getElementById('animate-out-checkbox');
        const animateOutDelay = document.getElementById('animate-out-delay');

        if (button.animateOut) {
            button.animateOut = button.animateOut || {};
            button.animateOut.enabled = animateOutCheckbox.checked;

            if (animateOutDelay) {
                button.animateOut.delay = parseFloat(animateOutDelay.value) || 5;
            }
        } else {
            animateOutCheckbox.checked = false;
            animateOutDelay.value = 5;
            if (animateOutOptions) {
                animateOutOptions.style.display = 'none';
            }
        }

        // Update shadow properties
        if (!button.shadow) button.shadow = {}; // Ensure shadow object exists
        button.shadow.enabled = buttonShadowEnable ? buttonShadowEnable.checked : false;
        button.shadow.color = buttonShadowColor ? buttonShadowColor.value : '#000000';
        button.shadow.opacity = buttonShadowOpacity ? parseFloat(buttonShadowOpacity.value) : 0.5;
        button.shadow.hOffset = buttonShadowHOffset ? parseInt(buttonShadowHOffset.value) : 2;
        button.shadow.vOffset = buttonShadowVOffset ? parseInt(buttonShadowVOffset.value) : 2;
        button.shadow.blur = buttonShadowBlur ? parseInt(buttonShadowBlur.value) : 4;
        button.shadow.spread = buttonShadowSpread ? parseInt(buttonShadowSpread.value) : 0;
        // Update opacity
        if (buttonOpacitySlider) style.opacity = buttonOpacitySlider.value.toString();

        // Apply shadow style directly to the button element for live preview
        const buttonElementForShadow = document.querySelector(`.video-overlay-button[data-button-id="${selectedButtonId}"]`);
        if (buttonElementForShadow) {
            if (button.shadow.enabled) {
                const rgbaColor = hexToRgba(button.shadow.color, button.shadow.opacity);
                buttonElementForShadow.style.boxShadow = `${button.shadow.hOffset}px ${button.shadow.vOffset}px ${button.shadow.blur}px ${button.shadow.spread}px ${rgbaColor}`;
            } else {
                buttonElementForShadow.style.boxShadow = 'none';
            }
        }

        // Only update position and size if the related inputs were changed
        if (needsFullRender) {
            const containerRect = nodeVideoButtonsOverlay.getBoundingClientRect();
            if (containerRect.width > 0 && containerRect.height > 0) {
                const xPercent = (parseFloat(buttonPosXInput.value) / containerRect.width) * 100;
                const yPercent = (parseFloat(buttonPosYInput.value) / containerRect.height) * 100;
                const widthPercent = (parseFloat(buttonWidthInput.value) / containerRect.width) * 100;
                const heightPercent = (parseFloat(buttonHeightInput.value) / containerRect.height) * 100;

                button.position.x = `${Math.max(0, Math.min(xPercent, 100)).toFixed(2)}%`;
                button.position.y = `${Math.max(0, Math.min(yPercent, 100)).toFixed(2)}%`;
                button.style.width = `${Math.max(1, Math.min(widthPercent, 100)).toFixed(2)}%`;
                button.style.height = `${Math.max(1, Math.min(heightPercent, 100)).toFixed(2)}%`;
            }
        }

        // Update style properties without affecting dimensions
        

        // Only update the style property that was changed
        if (!e || e.target === document.getElementById('button-color-input')) {
            style.color = document.getElementById('button-color-input').value || '#ffffff';
        }
        if (!e || e.target === document.getElementById('button-bgcolor-input')) {
            style.backgroundColor = document.getElementById('button-bgcolor-input').value || '#007bff';
        }
        if (!e || e.target === document.getElementById('button-opacity-slider') || e.target === document.getElementById('button-bgcolor-input')) {
             const baseHex = document.getElementById('button-bgcolor-input').value || '#007bff';
             const alpha = parseFloat(buttonOpacitySlider.value);
             const rgba = hexToRgba(baseHex, alpha);
             style.backgroundColor = rgba;
         }
         if (!e || e.target === document.getElementById('button-font-family-input')) {
            style.fontFamily = document.getElementById('button-font-family-input').value || 'Arial, sans-serif';
        }
        if (!e || e.target === document.getElementById('button-font-size-input')) {
            const fontSize = parseInt(document.getElementById('button-font-size-input').value) || 16;
            style.fontSize = `${Math.max(8, Math.min(fontSize, 300))}px`;
        }
        if (!e || e.target === document.getElementById('button-padding-input')) {
            const padding = parseInt(document.getElementById('button-padding-input').value) || 10;
            style.padding = `${Math.max(0, Math.min(padding, 50))}px`;
        }
        if (!e || e.target === buttonCornerRadiusSlider) {
            const borderRadius = parseInt(buttonCornerRadiusSlider.value) || 0;
            style.borderRadius = `${Math.max(0, Math.min(borderRadius, 50))}px`;
        }
        if (!e || e.target === document.getElementById('button-border-input')) {
            style.border = document.getElementById('button-border-input').value || 'none';
        }

        // Ensure display properties are set for proper rendering
        style.display = 'flex';
        style.alignItems = 'center';
        style.justifyContent = 'center';
        style.position = 'absolute';

        // Persist changes before potentially re-rendering
        saveProjects();

        // If a full redraw is needed (fontSize, padding, position, etc.), do it now and return early
        if (needsFullRender) {
            renderButtons();
            return; // Avoid direct style assignment to prevent double-scaling
        }

        // Otherwise, apply style changes directly for snappier live preview.
        const buttonElement = document.querySelector(`.video-overlay-button[data-button-id="${selectedButtonId}"]`);
        if (!needsFullRender && buttonElement) {
            Object.assign(buttonElement.style, style);
            // Explicitly set properties that sometimes don't update via Object.assign due to type casting
            if (buttonOpacitySlider) buttonElement.style.opacity = buttonOpacitySlider.value;
            const ffInput = document.getElementById('button-font-family-input');
            if (ffInput) buttonElement.style.fontFamily = ffInput.value;
        }

        // Always re-render if a full redraw is needed (e.g., fontSize / padding changes)
        if (needsFullRender) {
            renderButtons();
        }
    };

    const selectButton = (buttonId) => {
        console.log('selectButton called with ID:', buttonId);
        if (!selectedNodeId) return;
        const node = currentProject.videos.find(v => v.id === selectedNodeId);
        buttonsList.innerHTML = '';
        timelineMarkers.innerHTML = '';
        nodeVideoButtonsOverlay.innerHTML = '';
        if (!node || !node.buttons) return;
        const button = node.buttons.find(b => b.id === buttonId);
        if (!button) return;
        selectedButtonId = buttonId;
        buttonEditorPanel.classList.remove('hidden');
        if (animateOutCheckbox && animateOutOptions) { // Ensure animate out options visibility is correct
             animateOutOptions.style.display = animateOutCheckbox.checked ? 'block' : 'none';
        }

        // Update button inputs
        buttonTextInput.value = button.text || 'Button';
        buttonTimeInput.value = button.time || 0;
        // Populate button target node dropdown
        if (buttonTargetNode && currentProject && currentProject.videos && selectedNodeId) {
            buttonTargetNode.innerHTML = ''; // Clear existing options
            currentProject.videos.forEach(videoNode => {
                // A button is part of selectedNodeId. It can link to any *other* node.
                if (videoNode.id !== selectedNodeId) { 
                    const option = document.createElement('option');
                    option.value = videoNode.id;
                    option.textContent = videoNode.name || `Node (${videoNode.id.substring(0,6)}...)`; // Fallback with shortened ID
                    buttonTargetNode.appendChild(option);
                }
            });
        }

        buttonLinkType.value = button.linkType || 'node'; // Set link type first

        // Then set values based on link type
        buttonTargetNode.value = button.linkType === 'node' ? (button.target || '') : '';
        buttonTargetUrl.value = button.linkType === 'url' ? (button.target || '') : '';
        if(buttonEmbedCode) buttonEmbedCode.value = button.linkType === 'embed' ? (button.embedCode || '') : '';

        // Then manage visibility
        if(nodeLinkContainer) nodeLinkContainer.style.display = button.linkType === 'node' ? 'block' : 'none';
        if(urlLinkContainer) urlLinkContainer.style.display = button.linkType === 'url' ? 'block' : 'none';
        if(embedCodeContainer) embedCodeContainer.style.display = button.linkType === 'embed' ? 'block' : 'none';

        const containerRect = nodeVideoButtonsOverlay.getBoundingClientRect();
        const x = button.position ? parseFloat(button.position.x) || 40 : 40;
        const y = button.position ? parseFloat(button.position.y) || 80 : 80;
        const width = button.style.width ? parseFloat(button.style.width) : 20;
        const height = button.style.height ? parseFloat(button.style.height) : 10;
        
        buttonPosXInput.value = (x / 100 * containerRect.width).toFixed(1);
        buttonPosYInput.value = (y / 100 * containerRect.height).toFixed(1);
        buttonWidthInput.value = (width / 100 * containerRect.width).toFixed(1);
        buttonHeightInput.value = (height / 100 * containerRect.height).toFixed(1);
        
        // Update style inputs
        document.getElementById('button-color-input').value = button.style.color || '#ffffff';
        document.getElementById('button-bgcolor-input').value = button.style.backgroundColor || '#007bff';
         if (buttonOpacitySlider && buttonOpacityValue) {
             buttonOpacitySlider.value = button.style.opacity !== undefined ? button.style.opacity : 1;
             buttonOpacityValue.textContent = buttonOpacitySlider.value;
         }
        document.getElementById('button-font-family-input').value = button.style.fontFamily || 'Arial, sans-serif';
        document.getElementById('button-font-size-input').value = button.style.fontSize ? 
            parseInt(button.style.fontSize) : 16;
        document.getElementById('button-padding-input').value = button.style.padding ? 
            parseInt(button.style.padding) : 10;
        const currentBorderRadius = button.style.borderRadius ? parseInt(button.style.borderRadius) : 5;
        if (buttonCornerRadiusSlider) buttonCornerRadiusSlider.value = currentBorderRadius;
        if (buttonCornerRadiusValue) buttonCornerRadiusValue.textContent = `${currentBorderRadius}px`;
        document.getElementById('button-border-input').value = button.style.border || 'none';
        
        // Update animation inputs
        animationType.value = button.animation.type || 'none';
        animationDirection.value = button.animation.direction || 'left';
        animationDuration.value = button.animation.duration || '1';
        
        // Update animate out inputs
        const animateOutDelay = document.getElementById('animate-out-delay');

        if (button.animateOut) {
            animateOutCheckbox.checked = button.animateOut.enabled || false;
            animateOutDelay.value = button.animateOut.delay || 5;
            if (animateOutOptions) {
                animateOutOptions.style.display = button.animateOut.enabled ? 'block' : 'none';
            }
        } else {
            animateOutCheckbox.checked = false;
            animateOutDelay.value = 5;
            if (animateOutOptions) {
                animateOutOptions.style.display = 'none';
            }
        }

        // Update shadow inputs
        const shadow = button.shadow || { enabled: false, color: '#000000', opacity: 0.5, hOffset: 2, vOffset: 2, blur: 4, spread: 0 };
        if (buttonShadowEnable) buttonShadowEnable.checked = shadow.enabled;
        if (buttonShadowColor) buttonShadowColor.value = shadow.color || '#000000';

        // Update shadow slider values and their display spans
        if (buttonShadowOpacity && buttonShadowOpacityValue) { 
            buttonShadowOpacity.value = shadow.opacity !== undefined ? shadow.opacity : 0.5;
            buttonShadowOpacityValue.textContent = buttonShadowOpacity.value;
        }
        if (buttonShadowHOffset && buttonShadowHOffsetValue) {
            buttonShadowHOffset.value = shadow.hOffset !== undefined ? shadow.hOffset : 2;
            buttonShadowHOffsetValue.textContent = buttonShadowHOffset.value;
        }
        if (buttonShadowVOffset && buttonShadowVOffsetValue) {
            buttonShadowVOffset.value = shadow.vOffset !== undefined ? shadow.vOffset : 2;
            buttonShadowVOffsetValue.textContent = buttonShadowVOffset.value;
        }
        if (buttonShadowBlur && buttonShadowBlurValue) {
            buttonShadowBlur.value = shadow.blur !== undefined ? shadow.blur : 4;
            buttonShadowBlurValue.textContent = buttonShadowBlur.value;
        }
        if (buttonShadowSpread && buttonShadowSpreadValue) {
            buttonShadowSpread.value = shadow.spread !== undefined ? shadow.spread : 0;
            buttonShadowSpreadValue.textContent = buttonShadowSpread.value;
        }

        if (shadowOptionsContainer) {
            shadowOptionsContainer.style.display = shadow.enabled ? 'grid' : 'none';
        }

        // Toggle direction group based on animation type
        document.getElementById('anim-direction-group').style.display = 
            (button.animation.type === 'slide') ? 'block' : 'none';
            
        // Show/hide URL input based on link type
        document.getElementById('node-link-container').style.display = 
            (buttonLinkType.value === 'node') ? 'block' : 'none';
        document.getElementById('url-link-container').style.display = 
            (buttonLinkType.value === 'url') ? 'block' : 'none';
            
        // Update the button preview
        renderButtons();
    };

    const closeButtonEditor = () => {
        buttonEditorPanel.classList.add('hidden');
        if (animateOutCheckbox && animateOutOptions) { // Ensure animate out options visibility is correct
             animateOutOptions.style.display = animateOutCheckbox.checked ? 'block' : 'none';
        }
        selectedButtonId = null;
        renderButtons();
    };

const duplicateSelectedButton = () => {
    if (!selectedNodeId || !selectedButtonId || !currentProject) {
        console.warn('No button or node selected for duplication.');
        return;
    }
    pushToUndoStack(); // Save state before button duplication

    const node = currentProject.videos.find(v => v.id === selectedNodeId);
    if (!node || !node.buttons) {
        console.error('Could not find the current node or its buttons array.');
        return;
    }

    const buttonToDuplicate = node.buttons.find(b => b.id === selectedButtonId);
    if (!buttonToDuplicate) {
        console.error('Could not find the selected button to duplicate.');
        return;
    }

    const newButton = JSON.parse(JSON.stringify(buttonToDuplicate));
    newButton.id = `button-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    newButton.text = `${buttonToDuplicate.text || 'Button'} (Copy)`;

    if (!newButton.position) newButton.position = { x: '40%', y: '80%' };
    if (!newButton.style) newButton.style = {};

    let currentX = parseFloat(newButton.position.x) || 0;
    let currentY = parseFloat(newButton.position.y) || 0;
    newButton.position.x = `${(currentX + 2)}%`;
    newButton.position.y = `${(currentY + 2)}%`;

    node.buttons.push(newButton);
    saveProjects();
    renderButtons(); 
    selectButton(newButton.id);
    
    const newButtonListItem = document.querySelector(`#buttons-list .button-item[data-button-id="${newButton.id}"]`);
    if (newButtonListItem) {
        newButtonListItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
};

    const setupNodeDragging = () => {
        let draggedNode = null, offsetX, offsetY;
        nodesContainer.addEventListener('mousedown', e => {
            const targetNode = e.target.closest('.video-node');
            if (!targetNode) return;
            e.preventDefault();
            draggedNode = targetNode;
            const rect = draggedNode.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        const onMouseMove = e => {
            if (!draggedNode) return;
            const parentRect = nodesContainer.getBoundingClientRect();
            let x = e.clientX - parentRect.left - offsetX;
            let y = e.clientY - parentRect.top - offsetY;
            draggedNode.style.left = `${Math.max(0, Math.min(x, parentRect.width - draggedNode.offsetWidth))}px`;
            draggedNode.style.top = `${Math.max(0, Math.min(y, parentRect.height - draggedNode.offsetHeight))}px`;
        };
        const onMouseUp = () => {
            if (!draggedNode) return;
            pushToUndoStack(); // Save state before updating node position
            const node = currentProject.videos.find(v => v.id === draggedNode.dataset.id);
            if (node) {
                node.x = draggedNode.style.left;
                node.y = draggedNode.style.top;
                saveProjects();
                renderConnections(); // Redraw lines after node moves
            }
            draggedNode = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    };

    let tempPath = null;
    let dragListeners={move:null,up:null};
    let connectionDragSrc=null;
const startConnectionDrag=(e)=>{
        e.stopPropagation();
        const srcId=e.target.dataset.nodeSource;
        const startRect=e.target.getBoundingClientRect();
        const svgRect=connectionsSvg.getBoundingClientRect();
        const startX=startRect.left+startRect.width/2 - svgRect.left;
        const startY=startRect.top+startRect.height/2 - svgRect.top;
        connectionDragSrc=srcId;
        tempPath=document.createElementNS('http://www.w3.org/2000/svg','path');
        tempPath.setAttribute('d',`M ${startX} ${startY} C ${startX+50} ${startY}, ${startX+50} ${startY}, ${startX+50} ${startY}`);
        tempPath.setAttribute('fill','none');
        tempPath.setAttribute('stroke','#03a9f4');
        tempPath.setAttribute('stroke-width','2');
        tempPath.dataset.src=srcId;
        connectionsSvg.appendChild(tempPath);
        const onMove=(ev)=>{
            if(!tempPath) return;
            const x=ev.clientX - svgRect.left;
            const y=ev.clientY - svgRect.top;
            const midX=(startX+x)/2;
            tempPath.setAttribute('d',`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${y}, ${x} ${y}`);
        };
        const onUp=(ev)=>{
            // determine drop target
            const dropEl=document.elementFromPoint(ev.clientX,ev.clientY);
            if(dropEl && dropEl.classList.contains('node-input')){
                const dstId=dropEl.dataset.nodeTarget;
                if(connectionDragSrc && dstId && connectionDragSrc!==dstId){
                    pushToUndoStack(); // Save state before adding/modifying connection
                    if(!currentProject.connections) currentProject.connections=[];
                    currentProject.connections.push({from:connectionDragSrc,to:dstId});
                    saveProjects();
                }
            }
            renderConnections();
            document.removeEventListener('mousemove',dragListeners.move);
            document.removeEventListener('mouseup',dragListeners.up);
            if(tempPath){tempPath.remove(); tempPath=null;}
            connectionDragSrc=null;
        };
        dragListeners={move:onMove,up:onUp};
        document.addEventListener('mousemove',onMove);
        document.addEventListener('mouseup',onUp);
    };

const finishConnectionDrag = (e) => {
    const dstNodeElement = e.target.closest('.video-node .node-input'); // Target must be an input dot

    // connectionDragSrc is set when drag starts from an output dot.
    // tempPath is the visual line.
    // If not dragging from an output, or no valid target, or no project, abort.
    if (!dstNodeElement || !connectionDragSrc || !currentProject) {
        if (tempPath) { // Clean up visual line if it exists
            tempPath.remove();
            tempPath = null;
        }
        // connectionDragSrc is typically cleared by startConnectionDrag's onUp handler.
        return;
    }

    const dstId = dstNodeElement.dataset.nodeTarget; // ID of the node this input dot belongs to

    // Proceed if we have a source, a destination, and they are different.
    if (dstId && connectionDragSrc !== dstId) {
        const alreadyExists = currentProject.connections.some(
            conn => conn.from === connectionDragSrc && conn.to === dstId
        );

        if (alreadyExists) {
            console.warn(`Connection from ${connectionDragSrc} to ${dstId} already exists.`);
        } else {
            pushToUndoStack(); // Save state before adding the new connection
            
            if (!currentProject.connections) {
                currentProject.connections = [];
            }
            currentProject.connections.push({ from: connectionDragSrc, to: dstId });

            const sourceNode = currentProject.videos.find(v => v.id === connectionDragSrc);
            if (sourceNode) {
                sourceNode.endAction = {
                    type: 'node',
                    targetNode: dstId,
                    targetUrl: '' // Clear targetUrl when linking to another node
                };

                if (selectedNodeId === connectionDragSrc) { // Update editor panel if source node is selected
                    nodeEndActionSelect.value = 'node';
                    refreshTargetNodeDropdown(); 
                    nodeEndTargetNodeSelect.value = dstId;
                    nodeEndTargetUrlInput.value = ''; // Clear URL input in panel
                    updateEndActionVisibility();
                }
            }
            saveProjects(); // Persist changes
        }
        renderConnections(); // Update visuals
    }

    // Final cleanup: tempPath (visual line) should be removed.
    // This is also done in startConnectionDrag's onUp, acting as a safeguard here.
    if (tempPath) {
        tempPath.remove();
        tempPath = null;
    }
    // connectionDragSrc is cleared by startConnectionDrag's onUp handler, so no need to clear here.
};
    const renderConnections=()=>{
        connectionsSvg.innerHTML='';
        if(!currentProject||!currentProject.connections) return;
        currentProject.connections.forEach((conn,i)=>{
            const fromEl=nodesContainer.querySelector(`.node-output[data-node-source="${conn.from}"]`);
            const toEl=nodesContainer.querySelector(`.node-input[data-node-target="${conn.to}"]`);
            if(!fromEl||!toEl) return;
            const svgRect=connectionsSvg.getBoundingClientRect();
            const fromRect=fromEl.getBoundingClientRect();
            const toRect=toEl.getBoundingClientRect();
            const x1=fromRect.left+fromRect.width/2 - svgRect.left;
            const y1=fromRect.top+fromRect.height/2 - svgRect.top;
            const x2=toRect.left+toRect.width/2 - svgRect.left;
            const y2=toRect.top+toRect.height/2 - svgRect.top;
            const midX=(x1+x2)/2;
            const path=document.createElementNS('http://www.w3.org/2000/svg','path');
            path.classList.add('connection');
            path.setAttribute('pointer-events','stroke');
            path.dataset.index=i;
            path.setAttribute('d',`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
            path.setAttribute('fill','none');
            path.setAttribute('stroke','#03a9f4');
            path.setAttribute('stroke-width','6');
            console.log('Attaching click listener to path:', path, 'for connection index:', i);
            path.addEventListener('click',(event)=>{ // Added event parameter
                console.log('Connection path clicked!', event); // Log the event object
                console.log('Clicked path data-index:', event.target.dataset.index);
                if(confirm('Delete this connection?')){
                    currentProject.connections.splice(i,1);
                    saveProjects();
                    renderConnections();
                }
            });
            connectionsSvg.appendChild(path);
        });

        // Draw 'On Video End' node-to-node connections
        if (currentProject.videos) {
            currentProject.videos.forEach(videoNode => {
                if (videoNode.endAction && videoNode.endAction.type === 'node' && videoNode.endAction.target) {
                    const fromNodeId = videoNode.id;
                    const toNodeId = videoNode.endAction.target;

                    // Ensure the target node still exists
                    const targetNodeExists = currentProject.videos.some(v => v.id === toNodeId);
                    if (!targetNodeExists) {
                        // console.warn(`Target node ${toNodeId} for end action of ${fromNodeId} not found. Skipping connection.`);
                        return; 
                    }

                    const fromEl = nodesContainer.querySelector(`.node-output[data-node-source="${fromNodeId}"]`);
                    if(!fromEl){console.log('No fromEl for end-action',fromNodeId);} 
                    const toEl = nodesContainer.querySelector(`.node-input[data-node-target="${toNodeId}"]`);
                    if(!toEl){console.log('No toEl for end-action',toNodeId);} 

                    if (!fromEl || !toEl) {
                        // console.warn(`Could not find connection points for ${fromNodeId} -> ${toNodeId}`);
                        return;
                    }

                    const svgRect = connectionsSvg.getBoundingClientRect();
                    const fromRect = fromEl.getBoundingClientRect();
                    const toRect = toEl.getBoundingClientRect();

                    const x1 = fromRect.left + fromRect.width / 2 - svgRect.left;
                    const y1 = fromRect.top + fromRect.height / 2 - svgRect.top;
                    const x2 = toRect.left + toRect.width / 2 - svgRect.left;
                    const y2 = toRect.top + toRect.height / 2 - svgRect.top;
                    const midX = (x1 + x2) / 2;

                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.classList.add('connection', 'end-action-connection');
                    path.setAttribute('pointer-events','stroke');
                    path.dataset.from = fromNodeId;
                    path.dataset.to = toNodeId;
                    path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
                    path.setAttribute('fill', 'none');
                    path.setAttribute('stroke', '#03a9f4');
                    path.setAttribute('stroke-width', '6'); 
                    // Solid line
                    path.setAttribute('pointer-events', 'none'); // These lines are not interactive for now
                    path.addEventListener('click', (e)=>{
                        const src = e.target.dataset.from;
                        if(confirm('Delete end-action link from this node?')){
                            const srcNode = currentProject.videos.find(v=>v.id===src);
                            if(srcNode && srcNode.endAction){
                                pushToUndoStack();
                                srcNode.endAction = { type: 'none', target: null };
                                saveProjects();
                                renderConnections();
                            }
                        }
                    });
                    connectionsSvg.appendChild(path);
                }
            });
        }
    };

    const openPreview = (startNodeId) => {
        previewOverlay.classList.remove('hidden');
        const player = new IVSPlayer(previewOverlay, currentProject, startNodeId);

        setTimeout(() => {
            const videoEl = document.getElementById('preview-video');
            if (videoEl) {
                console.log(`Preview Project Video Dimensions: ${videoEl.clientWidth}w x ${videoEl.clientHeight}h`);
            }
        }, 100);
        closePreviewBtn.onclick = () => {
            player.destroy();
            previewOverlay.classList.add('hidden');
        };
    };


    const init = () => {
        projects = loadProjects(); // projects array is now initialized with startNodeId
        renderProjects();
        setupNodeDragging();
        setupEventListeners();
        updateUndoButtons(); // Initialize button states

        // Attach event listeners for Undo buttons
        if (undoMainBtn) undoMainBtn.addEventListener('click', handleUndo);
        if (undoNodePanelBtn) undoNodePanelBtn.addEventListener('click', handleUndo);

        // Logic to potentially load a specific project if ID is in URL (example)
        const urlParams = new URLSearchParams(window.location.search);
        const projectIdFromUrl = urlParams.get('projectId');
        if (projectIdFromUrl) {
            const projectToLoad = projects.find(p => p.id === projectIdFromUrl);
            if (projectToLoad) {
                navigateTo('editor', projectIdFromUrl);
            } else {
                console.warn('Project ID from URL not found, navigating to dashboard.');
                navigateTo('dashboard');
            }
        } else {
            navigateTo('dashboard'); // Default to dashboard if no project ID in URL
        }
    };

    const deleteSelectedNode = () => {
        if (!selectedNodeId || !currentProject) return;
        
        const nodeName = currentProject.videos.find(v => v.id === selectedNodeId)?.name || 'the selected node';
        // Push to stack *before* confirm, but pop if cancelled
        pushToUndoStack(); 
        if (!confirm(`Are you sure you want to delete the node "${nodeName}"? This action can be undone.`)) {
            undoStack.pop(); // Remove the state pushed for this aborted action
            updateUndoButtons(); // Reflect that the stack might be empty now
            return;
        }

        const nodeToDeleteId = selectedNodeId;

        currentProject.videos = currentProject.videos.filter(video => video.id !== nodeToDeleteId);
        currentProject.connections = currentProject.connections.filter(conn => conn.source !== nodeToDeleteId && conn.target !== nodeToDeleteId);

        if (currentProject.startNodeId === nodeToDeleteId) {
            currentProject.startNodeId = currentProject.videos.length > 0 ? currentProject.videos[0].id : null;
            // If setting a new start node, ensure it's marked in its data
            if (currentProject.startNodeId) {
                const newStartNode = currentProject.videos.find(v => v.id === currentProject.startNodeId);
                if (newStartNode) newStartNode.isStartNode = true;
            }
        }
        
        // Update end actions of other nodes that might have pointed to the deleted node
        currentProject.videos.forEach(video => {
            if (video.endAction && video.endAction.type === 'node' && video.endAction.target === nodeToDeleteId) {
                video.endAction.target = null; // Or set to 'none' or a default
            }
        });

        if (nodeEditorPanel && !nodeEditorPanel.classList.contains('hidden') && selectedNodeId === nodeToDeleteId) {
            closeNodeEditor();
        } else {
            selectedNodeId = null; // Deselect
            if(duplicateNodeBtn) duplicateNodeBtn.disabled = true;
            if(deleteNodeBtn) deleteNodeBtn.disabled = true;
        }

        saveProjects();
        renderNodes();
        renderConnections();
        // updateUndoButtons(); // Not needed here as handleUndo does it.
    };

    const duplicateSelectedNode = () => {
        if (!selectedNodeId || !currentProject) return;
        const originalNode = currentProject.videos.find(video => video.id === selectedNodeId);
        if (!originalNode) {
            console.warn('Original node not found for duplication.');
            return;
        }
        pushToUndoStack(); // Save state before duplication

        const newNode = deepCopy(originalNode); // Use deepCopy for safety
        newNode.id = generateId('node-');
        newNode.name = `${originalNode.name} Copy`;
        
        const originalX = parseFloat(originalNode.x) || 0;
        const originalY = parseFloat(originalNode.y) || 0;
        newNode.x = `${originalX + 30}px`;
        newNode.y = `${originalY + 30}px`;
        
        if (newNode.buttons && Array.isArray(newNode.buttons)) {
            newNode.buttons = newNode.buttons.map(button => ({
                ...deepCopy(button),
                id: generateId('btn-')
            }));
        }

        // If the original node was the start node, the new one shouldn't be.
        newNode.isStartNode = false; 
        
        // Reset end action if it pointed to the original node itself (to avoid self-loop on duplicate)
        // This logic might need refinement if we want duplicates to point to same external URLs or other nodes.
        // For now, if it pointed to itself, the copy points to nothing.
        if (newNode.endAction && newNode.endAction.type === 'node' && newNode.endAction.target === originalNode.id) {
            newNode.endAction.target = null; 
        }

        currentProject.videos.push(newNode);
        saveProjects();

        selectedNodeId = newNode.id; // Select the new node
        renderNodes(); 
        openNodeEditor(newNode.id, true); // Open editor for new node, true to prevent undo push from openNodeEditor
        
        if(duplicateNodeBtn) duplicateNodeBtn.disabled = false;
        if(deleteNodeBtn) deleteNodeBtn.disabled = false;
        // updateUndoButtons(); // Not needed here
    };

    const deepCopy = (obj) => {
        if (typeof obj !== 'object' || obj === null) {
            return obj; // Primitives or null
        }
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        if (Array.isArray(obj)) {
            return obj.map(item => deepCopy(item));
        }
        const newObj = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                newObj[key] = deepCopy(obj[key]);
            }
        }
        return newObj;
    };

    // ---- Undo/Redo Logic ----
    const updateUndoButtons = () => {
        const canUndo = undoStack.length > 0;
        if (undoMainBtn) undoMainBtn.disabled = !canUndo;
        if (undoNodePanelBtn) undoNodePanelBtn.disabled = !canUndo;
    };

    const pushToUndoStack = () => {
        if (!currentProject) return;
        const projectStateCopy = deepCopy(currentProject);
        if (!projectStateCopy) return; // Failed to copy

        if (undoStack.length >= MAX_UNDO_STEPS) {
            undoStack.shift(); // Remove the oldest state
        }
        undoStack.push(projectStateCopy);
        updateUndoButtons();
    };

    const handleUndo = () => {
        if (undoStack.length === 0) return;

        const previousState = undoStack.pop();
        if (!previousState) return;

        currentProject = previousState; // Restore project state
        updateUndoButtons();
        saveProjects(); // Persist the undone state

        // Refresh UI
        renderNodes();
        renderConnections();
        projectTitleEditor.textContent = currentProject.name;

        if (nodeEditorPanel.classList.contains('hidden')) {
            selectedNodeId = null; // Ensure no node is considered selected if panel is hidden
        } else {
            // If node editor was open, check if the selected node still exists
            const previouslySelectedNode = currentProject.videos.find(v => v.id === selectedNodeId);
            if (previouslySelectedNode) {
                // Re-open or refresh node editor for the selected node
                // This might be complex if openNodeEditor itself pushes to undo stack
                // For now, just render its buttons if it's the same node
                openNodeEditor(selectedNodeId, { isUndoRedo: true, autoplay: false }); // Don't autoplay on undo
            } else {
                closeNodeEditor();
                selectedNodeId = null;
            }
        }
        
        // If button editor was open, check if selected button is still valid
        if (!buttonEditorPanel.classList.contains('hidden')) {
            if (selectedNodeId && selectedButtonId) {
                const node = currentProject.videos.find(v => v.id === selectedNodeId);
                const button = node ? node.buttons.find(b => b.id === selectedButtonId) : null;
                if (!button) {
                    closeButtonEditor();
                }
            } else {
                closeButtonEditor();
            }
        }
        // Ensure selection states for nodes and buttons are consistent
        duplicateNodeBtn.disabled = !selectedNodeId;
        deleteNodeBtn.disabled = !selectedNodeId;
        if (selectedNodeId) {
             const nodeStillExists = currentProject.videos.some(v => v.id === selectedNodeId);
             if (!nodeStillExists) {
                selectedNodeId = null;
                duplicateNodeBtn.disabled = true;
                deleteNodeBtn.disabled = true;
                closeNodeEditor();
             }
        } else {
            duplicateNodeBtn.disabled = true;
            deleteNodeBtn.disabled = true;
        }

        console.log('Project state restored via Undo. New currentProject:', deepCopy(currentProject));
        console.log('Undo stack size:', undoStack.length);
    };

    // Alignment helper
    function alignButtonsInWindow(mode) {
        if (!selectedNodeId || !selectedButtonId || !currentProject) return;
        const node = currentProject.videos.find(v => v.id === selectedNodeId);
        if (!node || !node.buttons) return;
        const selectedBtn = node.buttons.find(b => b.id === selectedButtonId);
        if (!selectedBtn) return;
        const windowStart = (selectedBtn.time || 0) - 2.5;
        const windowEnd   = (selectedBtn.time || 0) + 2.5;
        const buttonsInWindow = node.buttons.filter(b => {
            const t = b.time || 0;
            return t >= windowStart && t <= windowEnd;
        });
        if (buttonsInWindow.length === 0) return;

        pushToUndoStack();

        if (mode === 'horizontal') {
            // Align all buttons to share the same horizontal baseline (y-coordinate)
            const baselineY = parseFloat(selectedBtn.position?.y || '50');
            buttonsInWindow.forEach(btn => {
                if (!btn.position) btn.position = { x: '0%', y: '0%' };
                btn.position.y = baselineY.toFixed(2) + '%';
            });
        } else if (mode === 'spread') {
            // Evenly spread buttons across X (horizontal) while preserving their Y positions
            const sorted = buttonsInWindow.slice().sort((a, b) => {
                const xa = parseFloat(a.position?.x || '0');
                const xb = parseFloat(b.position?.x || '0');
                return xa - xb;
            });
            const n = sorted.length;
            if (n > 0) {
                // Collect widths and compute uniform gap so that gaps on edges and between buttons are equal
                const widths = sorted.map(btn => {
                    let w = 15;
                    if (btn.style && btn.style.width && btn.style.width.toString().includes('%')) {
                        w = parseFloat(btn.style.width);
                    }
                    return w;
                });
                const totalWidth = widths.reduce((sum, w) => sum + w, 0);
                let gap = (100 - totalWidth) / (n + 1);
                if (gap < 0) gap = 0; // Not enough space, fall back to 0 gap (still avoids overlap)

                let currentX = gap;
                for (let i = 0; i < n; i++) {
                    const btn = sorted[i];
                    const widthPct = widths[i];

                    if (!btn.position) btn.position = { x: '0%', y: '0%' };
                    btn.position.x = currentX.toFixed(2) + '%';

                    currentX += widthPct + gap;
                }
            }
        }

        saveProjects();
        renderButtons();
        selectButton(selectedButtonId);
    }

    init();
});
