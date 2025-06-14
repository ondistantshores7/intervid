document.addEventListener('DOMContentLoaded', () => {
    let isInitialized = false;
    if (isInitialized) {
        console.warn('Initialization script called more than once. Aborting duplicate run.');
        return;
    }
    isInitialized = true;
    console.log('Interactive Video Editor script loading...');

    const getElement = (id) => {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`Critical Error: HTML element with ID '${id}' not found.`);
            return null;
        }
        return element;
    };

    const dashboardView = getElement('dashboard');
    const editorView = getElement('editor');
    const newProjectBtn = getElement('new-project-btn');
    const backToDashboardBtn = getElement('back-to-dashboard-btn');
    const projectTitleEditor = getElement('project-title-editor');
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
    const buttonTargetNode = getElement('button-target-node');
    const buttonTargetUrl = getElement('button-target-url');
    const deleteButtonBtn = getElement('delete-button-btn');
    const duplicateButtonBtn = getElement('duplicate-button-btn');
    const buttonPosXInput = getElement('button-pos-x-input');
    const buttonPosYInput = getElement('button-pos-y-input');
    const buttonWidthInput = getElement('button-width-input');
    const buttonHeightInput = getElement('button-height-input');
    const animationType = getElement('animation-type');
    const animationDirection = getElement('animation-direction');
    const animationDuration = getElement('animation-duration');
    const previewProjectBtn = getElement('preview-project-btn');
    const exportProjectBtn = getElement('export-project-btn');
    const previewOverlay = getElement('preview-overlay');
    const closePreviewBtn = getElement('close-preview-btn');
    const projectSearchInput = getElement('project-search');
    const themeToggle = document.getElementById('theme-toggle');
    const connectionsSvg = document.getElementById('connections-svg');

    let projects = [];
    let currentProject = null;
    let selectedNodeId = null;
    let selectedButtonId = null;
    let draggedButtonElement = null;
    let hlsInstance = null;

    const loadProjects = () => {
        const loadedProjects = JSON.parse(localStorage.getItem('interactive-video-projects') || '[]');
        return loadedProjects.map(project => ({
            ...project,
            startNodeId: project.startNodeId || null, // Ensure startNodeId exists, default to null
            videos: project.videos || [], // Ensure videos array exists
            connections: project.connections || [] // Ensure connections array exists
        }));
    };
    const saveProjects = () => localStorage.setItem('interactive-video-projects', JSON.stringify(projects));

    const renderProjects = (filter='') => {
        const container = getElement('projects-list');
        if(!container) return;
        container.innerHTML='';
        const list = [...projects];
        list.sort((a,b)=>a.name.localeCompare(b.name));
        list.filter(p=>p.name.toLowerCase().includes(filter.toLowerCase())).forEach(project=>{
            const card=document.createElement('div');
            card.className='project-card';
            card.innerHTML=`<h3>${project.name}</h3><p>${project.videos.length} videos</p>`;
            const editBtn=document.createElement('button');editBtn.textContent='Edit';editBtn.onclick=()=>navigateTo('editor',project.id);
            const dupBtn=document.createElement('button');dupBtn.textContent='Duplicate';dupBtn.onclick=()=>{const copy=JSON.parse(JSON.stringify(project));copy.id=`proj-${Date.now()}`;copy.name=project.name+' copy';projects.push(copy);saveProjects();renderProjects(projectSearchInput.value);} ;
            const delBtn=document.createElement('button');delBtn.textContent='Delete';delBtn.className='danger';delBtn.onclick=()=>{if(confirm('Delete project?')){projects=projects.filter(p=>p.id!==project.id);saveProjects();renderProjects(projectSearchInput.value);} };
            card.append(editBtn,dupBtn,delBtn);
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
        node.buttons.forEach(button => {
            const buttonItem = document.createElement('div');
            buttonItem.className = `button-item ${button.id === selectedButtonId ? 'selected' : ''}`;
            buttonItem.textContent = `${button.text} (@${button.time.toFixed(2)}s)`;
            buttonItem.dataset.buttonId = button.id;
            buttonsList.appendChild(buttonItem);
            if (nodeVideoPreview.duration) {
                const marker = document.createElement('div');
                marker.className = 'timeline-marker';
                marker.style.left = `${(button.time / nodeVideoPreview.duration) * 100}%`;
                timelineMarkers.appendChild(marker);
            }
            const buttonPreview = document.createElement('button');
            buttonPreview.className = 'video-overlay-button';
            buttonPreview.textContent = button.text;
            buttonPreview.dataset.buttonId = button.id;
            const shouldShow = (nodeVideoPreview.currentTime >= button.time && nodeVideoPreview.currentTime < button.time + 5) || button.id===selectedButtonId;
            Object.assign(buttonPreview.style, button.style, { position: 'absolute', left: button.position.x, top: button.position.y, display: shouldShow?'block':'none' });
            if(shouldShow && button.animation && button.animation.type!=='none'){
                const animClass = button.animation.type==='slide'?`anim-slide-${button.animation.direction}`:`anim-${button.animation.type}`;
                buttonPreview.classList.add(animClass);
                buttonPreview.style.animationDuration = `${button.animation.duration}s`;
            }
            buttonPreview.addEventListener('mousedown', startButtonDrag);
            buttonPreview.addEventListener('touchstart', startButtonDrag, { passive: false });

            // Add resize handles
            ['tl','tr','bl','br'].forEach(pos => {
                const handle = document.createElement('div');
                handle.className = `resize-handle ${pos}`;
                handle.dataset.buttonId = button.id;
                handle.addEventListener('mousedown', startResize);
                handle.addEventListener('touchstart', startResize, { passive:false });
                buttonPreview.appendChild(handle);
            });

            nodeVideoButtonsOverlay.appendChild(buttonPreview);
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
                const shouldShow = (nodeVideoPreview.currentTime >= buttonData.time && nodeVideoPreview.currentTime < buttonData.time + 5) || buttonData.id===selectedButtonId;
                btn.style.display = shouldShow?'block':'none';
                if(buttonData && buttonData.animation){
                    btn.style.animationDuration = `${buttonData.animation.duration}s`;
                }
            }
        });
    };

    const setupEventListeners = () => {
        newProjectBtn.addEventListener('click', () => {
            const name = prompt('Enter project name:');
            if (!name) return;
            const project = { id: `proj-${Date.now()}`, name, videos: [], connections: [] };
            projects.push(project);
            saveProjects();
            renderProjects();
            navigateTo('editor', project.id);
        });
        backToDashboardBtn.addEventListener('click', () => { saveProjects(); navigateTo('dashboard');});
        addVideoBtn.addEventListener('click', () => {
            const name = prompt('Enter node name:');
            if (!name || !currentProject) return;
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
                node.name = e.target.value;
                saveProjects();
                renderNodes();
            }
        });
        nodeUrlInput.addEventListener('change', e => {
            const node = currentProject.videos.find(v => v.id === selectedNodeId);
            if (node) {
                node.url = e.target.value;
                loadVideo(nodeVideoPreview, node.url);
                saveProjects();
            }
        });
        addButtonBtn.addEventListener('click', () => {
            const node = currentProject.videos.find(v => v.id === selectedNodeId);
            if (!node) return;
            const newButton = { id: `btn-${Date.now()}`, text: 'New Button', time: nodeVideoPreview.currentTime, linkType: 'node', target: '', position: { x: '40%', y: '80%' }, style: { width: '15%', height: '10%', backgroundColor: '#007bff', color: 'white', fontSize: '16px', padding: '10px 20px', border: 'none', borderRadius: '5px' }, animation: { type:'none', direction:'left', duration:'1' } };
            if (!node.buttons) node.buttons = [];
            node.buttons.push(newButton);
            saveProjects();
            renderButtons();
            selectButton(newButton.id);
        });
        buttonsList.addEventListener('click', e => {
            const item = e.target.closest('.button-item');
            if (item) selectButton(item.dataset.buttonId);
        });
        const updateButtonFromEditor = (e) => {
            if (!selectedButtonId) return;
            const node = currentProject.videos.find(v => v.id === selectedNodeId);
            const button = node.buttons.find(b => b.id === selectedButtonId);
            if (!button) return;

            // Initialize objects if they don't exist
            if (!button.style) button.style = {};
            if (!button.position) button.position = { x: '40%', y: '80%' };
            if (!button.animation) button.animation = { type: 'none', direction: 'left', duration: '1' };
            if (!button.animateOut) button.animateOut = { enabled: false, delay: 5 };

            // Track if we need to update the button's dimensions/position
            const needsFullRender = e && (
                e.target === buttonPosXInput ||
                e.target === buttonPosYInput ||
                e.target === buttonWidthInput ||
                e.target === buttonHeightInput ||
                e.target === buttonTextInput ||
                e.target === buttonTimeInput
            );

            // Always update basic properties
            button.text = buttonTextInput.value || 'Button';
            button.time = parseFloat(buttonTimeInput.value) || 0;
            button.linkType = buttonLinkType.value || 'node';
            button.target = buttonLinkType.value === 'url' ? 
                (buttonTargetUrl.value || '') : 
                (buttonTargetNode.value || '');
            
            // Update animation properties
            if (!e || e.target === animationType || e.target === animationDirection || e.target === animationDuration) {
                button.animation = { 
                    type: animationType.value || 'none',
                    direction: animationDirection.value || 'left',
                    duration: animationDuration.value || '1'
                };
            }
            
            // Update animate out settings
            const animateOutCheckbox = document.getElementById('animate-out-checkbox');
            const animateOutDelay = document.getElementById('animate-out-delay');
            
            if (animateOutCheckbox) {
                button.animateOut = button.animateOut || {};
                button.animateOut.enabled = animateOutCheckbox.checked;
                
                if (animateOutDelay) {
                    button.animateOut.delay = parseFloat(animateOutDelay.value) || 5;
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
            const style = button.style;
            
            // Only update the style property that was changed
            if (!e || e.target === document.getElementById('button-color-input')) {
                style.color = document.getElementById('button-color-input').value || '#ffffff';
            }
            if (!e || e.target === document.getElementById('button-bgcolor-input')) {
                style.backgroundColor = document.getElementById('button-bgcolor-input').value || '#007bff';
            }
            if (!e || e.target === document.getElementById('button-font-family-input')) {
                style.fontFamily = document.getElementById('button-font-family-input').value || 'Arial, sans-serif';
            }
            if (!e || e.target === document.getElementById('button-font-size-input')) {
                const fontSize = parseInt(document.getElementById('button-font-size-input').value) || 16;
                style.fontSize = `${Math.max(8, Math.min(fontSize, 72))}px`;
            }
            if (!e || e.target === document.getElementById('button-padding-input')) {
                const padding = parseInt(document.getElementById('button-padding-input').value) || 10;
                style.padding = `${Math.max(0, Math.min(padding, 50))}px`;
            }
            if (!e || e.target === document.getElementById('button-border-radius-input')) {
                const borderRadius = parseInt(document.getElementById('button-border-radius-input').value) || 5;
                style.borderRadius = `${Math.max(0, Math.min(borderRadius, 50))}%`;
            }
            if (!e || e.target === document.getElementById('button-border-input')) {
                style.border = document.getElementById('button-border-input').value || 'none';
            }
            
            // Ensure display properties are set for proper rendering
            style.display = 'flex';
            style.alignItems = 'center';
            style.justifyContent = 'center';
            style.position = 'absolute';
            
            saveProjects();
            
            // Only update the specific button's style instead of re-rendering everything
            const buttonElement = document.querySelector(`.video-overlay-button[data-button-id="${selectedButtonId}"]`);
            if (buttonElement) {
                // Apply all current styles to the button element
                Object.assign(buttonElement.style, button.style);
                
                // Update animation classes if needed
                if (button.animation && button.animation.type !== 'none') {
                    const animClass = button.animation.type === 'slide' ? 
                        `anim-slide-${button.animation.direction}` : 
                        `anim-${button.animation.type}`;
                    
                    // Remove all animation classes first
                    buttonElement.className = 'video-overlay-button';
                    
                    // Add the current animation class
                    if (button.animation.type !== 'none') {
                        buttonElement.classList.add(animClass);
                        buttonElement.style.animationDuration = `${button.animation.duration}s`;
                    }
                }
            } else {
                // Fallback to full render if button element not found
                renderButtons();
            }
        };
        // Get all style-related inputs
        const styleInputs = [
            buttonTextInput, buttonTimeInput, buttonLinkType, buttonTargetNode, buttonTargetUrl,
            buttonPosXInput, buttonPosYInput, buttonWidthInput, buttonHeightInput,
            animationType, animationDirection, animationDuration,
            document.getElementById('button-color-input'),
            document.getElementById('button-bgcolor-input'),
            document.getElementById('button-font-family-input'),
            document.getElementById('button-font-size-input'),
            document.getElementById('button-padding-input'),
            document.getElementById('button-border-radius-input'),
            document.getElementById('button-border-input'),
            document.getElementById('animate-out-checkbox'),
            document.getElementById('animate-out-delay')
        ];
        
        // Add event listeners to all inputs
        styleInputs.forEach(el => {
            if (el) {
                el.addEventListener('change', updateButtonFromEditor);
                // For color inputs, also update on input for live preview
                if (el.type === 'color' || el.type === 'range') {
                    el.addEventListener('input', updateButtonFromEditor);
                }
            }
        });

        // Toggle animate out options
        const animateOutCheckbox = document.getElementById('animate-out-checkbox');
        const animateOutOptions = document.querySelector('.animate-out-options');
        
        if (animateOutCheckbox && animateOutOptions) {
            animateOutCheckbox.addEventListener('change', function() {
                if (this.checked) {
                    animateOutOptions.style.display = 'block';
                } else {
                    animateOutOptions.style.display = 'none';
                }
                updateButtonFromEditor();
            });
        }
        duplicateButtonBtn.addEventListener('click', () => {
            if (!selectedButtonId) return;
            const node = currentProject.videos.find(v => v.id === selectedNodeId);
            const originalButton = node.buttons.find(b => b.id === selectedButtonId);
            if (!originalButton) return;
            const newButton = JSON.parse(JSON.stringify(originalButton));
            newButton.id = `btn-${Date.now()}`;
            newButton.text = `${originalButton.text} (Copy)`;
            const originalX = parseFloat(originalButton.position.x) || 0;
            const originalY = parseFloat(originalButton.position.y) || 0;
            newButton.position.x = `${originalX + 2}%`;
            newButton.position.y = `${originalY + 2}%`;
            node.buttons.push(newButton);
            saveProjects();
            renderButtons();
            selectButton(newButton.id);
        });
        deleteButtonBtn.addEventListener('click', () => {
            if (!selectedButtonId) return;
            const node = currentProject.videos.find(v => v.id === selectedNodeId);
            if (node) {
                node.buttons = node.buttons.filter(b => b.id !== selectedButtonId);
                saveProjects();
                closeButtonEditor();
            }
        });
        previewProjectBtn.addEventListener('click', () => {
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

        nodeVideoPreview.addEventListener('timeupdate', handlePlayheadUpdate);
        projectSearchInput.addEventListener('input', e => renderProjects(e.target.value));

        themeToggle.addEventListener('change', () => {
            document.body.classList.toggle('dark-mode', themeToggle.checked);
            document.body.classList.toggle('light-mode', !themeToggle.checked);
        });

        // Start Node checkbox listener
        nodeIsStartNodeCheckbox.addEventListener('change', () => {
            if (!currentProject || !selectedNodeId) return;
            const node = currentProject.videos.find(v => v.id === selectedNodeId);
            if (!node) return;

            if (nodeIsStartNodeCheckbox.checked) {
                currentProject.startNodeId = selectedNodeId;
            } else {
                if (currentProject.startNodeId === selectedNodeId) {
                    currentProject.startNodeId = null;
                }
            }
            saveProjects();
            renderNodes(); // Re-render to reflect potential start node visual changes
        });
    };

    const navigateTo = (view, projectId = null) => {
        document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
        if (view === 'dashboard') {
            document.getElementById('dashboard').classList.add('active');
            currentProject = null;
            selectedNodeId = null; // Clear selected node when going to dashboard
            closeNodeEditor(); // Close editor panel if open
            closeButtonEditor(); // Close button editor if open
        } else if (view === 'editor') {
            document.getElementById('editor').classList.add('active');
            currentProject = projects.find(p => p.id === projectId);
            if (!currentProject) {
                console.error('Project not found:', projectId, 'Navigating to dashboard.');
                return navigateTo('dashboard');
            }
            projectTitleEditor.textContent = currentProject.name;
            renderNodes();
            renderConnections(); // Render connections for the current project
        } else {
            console.warn('Unknown view:', view, 'Navigating to dashboard.');
            navigateTo('dashboard');
        }
    };

    // ---- End Action UI elements ----
    const nodeEndActionSelect = document.getElementById('node-end-action');
    const nodeEndTargetNodeSelect = document.getElementById('node-end-target-node');
    const nodeEndTargetUrlInput = document.getElementById('node-end-target-url');
    const nodeIsStartNodeCheckbox = getElement('node-is-start-node'); // Added for Start Node checkbox

    const updateEndActionVisibility = () => {
        const val = nodeEndActionSelect.value;
        nodeEndTargetNodeSelect.style.display = val === 'node' ? 'block' : 'none';
        nodeEndTargetUrlInput.style.display = val === 'url' ? 'block' : 'none';
    };

    // populate node dropdown whenever nodes list changes
    const refreshTargetNodeDropdown = () => {
        nodeEndTargetNodeSelect.innerHTML = '';
        currentProject.videos.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = v.name;
            nodeEndTargetNodeSelect.appendChild(opt);
        });
    };

    // persist changes to selected node
    const persistEndAction = () => {
        const node = currentProject.videos.find(v => v.id === selectedNodeId);
        if (!node) return;
        node.endAction = {
            type: nodeEndActionSelect.value,
            targetNode: nodeEndTargetNodeSelect.value || '',
            targetUrl: nodeEndTargetUrlInput.value || ''
        };
        saveProjects();
    };

    nodeEndActionSelect.addEventListener('change', () => { updateEndActionVisibility(); persistEndAction(); });
    nodeEndTargetNodeSelect.addEventListener('change', persistEndAction);
    nodeEndTargetUrlInput.addEventListener('change', persistEndAction);

    const openNodeEditor = (nodeId) => {
        selectedNodeId = nodeId;
        const node = currentProject.videos.find(v => v.id === nodeId);
        if (!node) return;

        nodeNameInput.value = node.name;
        nodeUrlInput.value = node.url;
        loadVideo(nodeVideoPreview, node.url);

        // refresh end action dropdown and values
        refreshTargetNodeDropdown();
        const act = node.endAction || {type:'none', targetNode:'', targetUrl:''};
        nodeEndActionSelect.value = act.type;
        nodeEndTargetNodeSelect.value = act.targetNode;
        nodeEndTargetUrlInput.value = act.targetUrl;
        updateEndActionVisibility();

        // Set Start Node checkbox state
        if (currentProject) {
            nodeIsStartNodeCheckbox.checked = (currentProject.startNodeId === nodeId);
        } else {
            nodeIsStartNodeCheckbox.checked = false;
        }

        nodeEditorPanel.classList.remove('hidden');
        renderButtons();
        renderNodes(); // To update selection style
    };

    const closeNodeEditor = () => {
        nodeEditorPanel.classList.add('hidden');
        selectedNodeId = null;
        if (hlsInstance) hlsInstance.destroy();
        renderNodes();
    };

    const selectButton = (buttonId) => {
        selectedButtonId = buttonId;
        const node = currentProject.videos.find(v => v.id === selectedNodeId);
        const button = node.buttons.find(b => b.id === buttonId);
        if (!button) return;

        // Ensure button has style object
        if (!button.style) button.style = {};
        if (!button.animation) button.animation = { type: 'none', direction: 'left', duration: '1' };
        if (!button.animateOut) button.animateOut = { enabled: false, delay: 5 };

        // Update button editor inputs
        buttonTextInput.value = button.text || '';
        buttonTimeInput.value = button.time || 0;
        buttonLinkType.value = button.linkType || 'node';
        buttonTargetNode.value = button.target || '';
        buttonTargetUrl.value = button.target || '';
        
        // Update position and size inputs
        const containerRect = nodeVideoButtonsOverlay.getBoundingClientRect();
        if (containerRect.width > 0 && containerRect.height > 0) {
            const x = button.position ? parseFloat(button.position.x) || 40 : 40;
            const y = button.position ? parseFloat(button.position.y) || 80 : 80;
            const width = button.style.width ? parseFloat(button.style.width) : 20;
            const height = button.style.height ? parseFloat(button.style.height) : 10;
            
            buttonPosXInput.value = (x / 100 * containerRect.width).toFixed(1);
            buttonPosYInput.value = (y / 100 * containerRect.height).toFixed(1);
            buttonWidthInput.value = (width / 100 * containerRect.width).toFixed(1);
            buttonHeightInput.value = (height / 100 * containerRect.height).toFixed(1);
        }
        
        // Update style inputs
        document.getElementById('button-color-input').value = button.style.color || '#ffffff';
        document.getElementById('button-bgcolor-input').value = button.style.backgroundColor || '#007bff';
        document.getElementById('button-font-family-input').value = button.style.fontFamily || 'Arial, sans-serif';
        document.getElementById('button-font-size-input').value = button.style.fontSize ? 
            parseInt(button.style.fontSize) : 16;
        document.getElementById('button-padding-input').value = button.style.padding ? 
            parseInt(button.style.padding) : 10;
        document.getElementById('button-border-radius-input').value = button.style.borderRadius ? 
            parseInt(button.style.borderRadius) : 5;
        document.getElementById('button-border-input').value = button.style.border || 'none';
        
        // Update animation inputs
        animationType.value = button.animation.type || 'none';
        animationDirection.value = button.animation.direction || 'left';
        animationDuration.value = button.animation.duration || '1';
        
        // Update animate out inputs
        const animateOutCheckbox = document.getElementById('animate-out-checkbox');
        const animateOutDelay = document.getElementById('animate-out-delay');
        const animateOutOptions = document.querySelector('.animate-out-options');
        
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
        
        // Toggle direction group based on animation type
        document.getElementById('anim-direction-group').style.display = 
            (button.animation.type === 'slide') ? 'block' : 'none';
            
        // Show/hide URL input based on link type
        document.getElementById('node-link-container').style.display = 
            (buttonLinkType.value === 'node') ? 'block' : 'none';
        document.getElementById('url-link-container').style.display = 
            (buttonLinkType.value === 'url') ? 'block' : 'none';
            
        // Show the button editor panel
        document.getElementById('button-editor-panel').classList.remove('hidden');
        
        // Update the button preview
        renderButtons();
    };

    const closeButtonEditor = () => {
        buttonEditorPanel.classList.add('hidden');
        selectedButtonId = null;
        renderButtons();
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

    const finishConnectionDrag=(e)=>{
        if(!tempPath) return;
        const dstId=e.target.dataset.nodeTarget;
        const srcId=tempPath.dataset.src;
        if(srcId && dstId && srcId!==dstId){
            if(!currentProject.connections) currentProject.connections=[];
            currentProject.connections.push({from:srcId,to:dstId});

            // Update source node's endAction to play the connected node
            const sourceNode = currentProject.videos.find(v => v.id === srcId);
            if (sourceNode) {
                sourceNode.endAction = {
                    type: 'node',
                    targetNode: dstId,
                    targetUrl: '' 
                };

                // If this source node is currently being edited, update the panel
                if (selectedNodeId === srcId) {
                    nodeEndActionSelect.value = 'node';
                    refreshTargetNodeDropdown(); // Ensure dropdown is populated before setting value
                    nodeEndTargetNodeSelect.value = dstId;
                    updateEndActionVisibility();
                }
            }

            saveProjects();
            renderConnections();
        }
        if(tempPath){tempPath.remove(); tempPath=null;}
        // remove listeners to prevent null errors
        document.removeEventListener('mousemove',dragListeners.move);
        document.removeEventListener('mouseup',dragListeners.up);
        e.stopPropagation();
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
    };

    const openPreview = (startNodeId) => {
        previewOverlay.classList.remove('hidden');
        const player = new IVSPlayer(previewOverlay, currentProject, startNodeId);
        closePreviewBtn.onclick = () => {
            player.destroy();
            previewOverlay.classList.add('hidden');
        };
    };

    const loadVideo = (videoElement, url) => {
        if (hlsInstance) hlsInstance.destroy();
        if (!url) return videoElement.src = '';
        if (url.includes('.m3u8')) {
            if (Hls.isSupported()) {
                hlsInstance = new Hls();
                hlsInstance.loadSource(url);
                hlsInstance.attachMedia(videoElement);
            } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                videoElement.src = url;
            } else console.error('HLS not supported');
        } else {
            videoElement.src = url;
        }
    };

    const init = () => {
        projects = loadProjects(); // projects array is now initialized with startNodeId
        renderProjects();
        setupNodeDragging();
        setupEventListeners();

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

    init();
});
