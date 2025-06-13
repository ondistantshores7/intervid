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
    const projectGrid = getElement('project-grid');
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

    let projects = [];
    let currentProject = null;
    let selectedNodeId = null;
    let selectedButtonId = null;
    let draggedButtonElement = null;
    let hlsInstance = null;

    const loadProjects = () => JSON.parse(localStorage.getItem('interactive-video-projects') || '[]');
    const saveProjects = () => localStorage.setItem('interactive-video-projects', JSON.stringify(projects));

    const renderProjects = () => {
        projectGrid.innerHTML = '';
        projects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.dataset.id = project.id;
            card.innerHTML = `<h3>${project.name}</h3><p>${project.videos.length} videos</p><div class="card-actions"><button class="edit-btn">Edit</button><button class="danger delete-btn">Delete</button></div>`;
            projectGrid.appendChild(card);
        });
    };

    const renderNodes = () => {
        if (!currentProject) return;
        nodesContainer.innerHTML = '';
        currentProject.videos.forEach(video => {
            const nodeEl = document.createElement('div');
            nodeEl.className = `video-node ${video.id === selectedNodeId ? 'selected' : ''}`;
            nodeEl.dataset.nodeId = video.id;
            nodeEl.style.left = video.x || '10px';
            nodeEl.style.top = video.y || '10px';
            nodeEl.innerHTML = `<h4>${video.name}</h4>`;
            nodesContainer.appendChild(nodeEl);
        });
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
        projectGrid.addEventListener('click', e => {
            const card = e.target.closest('.project-card');
            if (!card) return;
            const projectId = card.dataset.id;
            if (e.target.classList.contains('edit-btn')) navigateTo('editor', projectId);
            if (e.target.classList.contains('delete-btn')) {
                if (confirm('Delete this project?')) {
                    projects = projects.filter(p => p.id !== projectId);
                    saveProjects();
                    renderProjects();
                }
            }
        });
        backToDashboardBtn.addEventListener('click', () => navigateTo('dashboard'));
        addVideoBtn.addEventListener('click', () => {
            const name = prompt('Enter node name:');
            if (!name || !currentProject) return;
            const node = { id: `node-${Date.now()}`, name, url: '', buttons: [], x: '50px', y: '50px' };
            currentProject.videos.push(node);
            saveProjects();
            renderNodes();
            openNodeEditor(node.id);
        });
        nodesContainer.addEventListener('click', e => {
            const nodeEl = e.target.closest('.video-node');
            if (nodeEl) openNodeEditor(nodeEl.dataset.nodeId);
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
        const updateButtonFromEditor = () => {
            if (!selectedButtonId) return;
            const node = currentProject.videos.find(v => v.id === selectedNodeId);
            const button = node.buttons.find(b => b.id === selectedButtonId);
            if (!button) return;

            button.text = buttonTextInput.value;
            button.time = parseFloat(buttonTimeInput.value);
            button.linkType = buttonLinkType.value;
            button.target = button.linkType === 'url' ? buttonTargetUrl.value : buttonTargetNode.value;
            button.animation = { type: animationType.value, direction: animationDirection.value, duration: animationDuration.value };

            const containerRect = nodeVideoButtonsOverlay.getBoundingClientRect();
            if (containerRect.width > 0 && containerRect.height > 0) {
                const xPercent = (parseFloat(buttonPosXInput.value) / containerRect.width) * 100;
                const yPercent = (parseFloat(buttonPosYInput.value) / containerRect.height) * 100;
                const widthPercent = (parseFloat(buttonWidthInput.value) / containerRect.width) * 100;
                const heightPercent = (parseFloat(buttonHeightInput.value) / containerRect.height) * 100;

                button.position.x = `${xPercent.toFixed(2)}%`;
                button.position.y = `${yPercent.toFixed(2)}%`;
                if (!button.style) button.style = {};
                button.style.width = `${widthPercent.toFixed(2)}%`;
                button.style.height = `${heightPercent.toFixed(2)}%`;
            }
            saveProjects();
            renderButtons();
        };
        [buttonTextInput, buttonTimeInput, buttonLinkType, buttonTargetNode, buttonTargetUrl, buttonPosXInput, buttonPosYInput, buttonWidthInput, buttonHeightInput, animationType, animationDirection, animationDuration].forEach(el => el.addEventListener('change', updateButtonFromEditor));
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
            if (!currentProject || currentProject.videos.length === 0) return alert('Project is empty.');
            openPreview(currentProject.videos[0].id);
        });
        nodeVideoPreview.addEventListener('timeupdate', handlePlayheadUpdate);
    };

    const navigateTo = (view, projectId = null) => {
        dashboardView.classList.add('hidden');
        editorView.classList.add('hidden');
        if (view === 'editor') {
            currentProject = projects.find(p => p.id === projectId);
            if (!currentProject) return navigateTo('dashboard');
            projectTitleEditor.textContent = currentProject.name;
            editorView.classList.remove('hidden');
            renderNodes();
        } else {
            currentProject = null;
            dashboardView.classList.remove('hidden');
            renderProjects();
        }
    };

    const openNodeEditor = (nodeId) => {
        selectedNodeId = nodeId;
        const node = currentProject.videos.find(v => v.id === nodeId);
        if (!node) return;
        nodeNameInput.value = node.name;
        nodeUrlInput.value = node.url;
        loadVideo(nodeVideoPreview, node.url);
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
        if (!button) return closeButtonEditor();
        buttonEditorPanel.classList.remove('hidden');
        buttonTextInput.value = button.text;
        buttonTimeInput.value = button.time;
        buttonLinkType.value = button.linkType;
        const containerRect = nodeVideoButtonsOverlay.getBoundingClientRect();
        if (containerRect.width > 0 && containerRect.height > 0) {
            buttonPosXInput.value = (parseFloat(button.position.x) / 100 * containerRect.width).toFixed(0);
            buttonPosYInput.value = (parseFloat(button.position.y) / 100 * containerRect.height).toFixed(0);
            buttonWidthInput.value = (parseFloat(button.style.width) / 100 * containerRect.width).toFixed(0);
            buttonHeightInput.value = (parseFloat(button.style.height) / 100 * containerRect.height).toFixed(0);
        }
        buttonTargetNode.innerHTML = '<option value="">Select node...</option>';
        currentProject.videos.forEach(video => {
            if (video.id === selectedNodeId) return;
            const option = document.createElement('option');
            option.value = video.id;
            option.textContent = video.name;
            buttonTargetNode.appendChild(option);
        });
        if (button.linkType === 'url') {
            urlLinkContainer.style.display = 'block';
            nodeLinkContainer.style.display = 'none';
            buttonTargetUrl.value = button.target;
        } else {
            urlLinkContainer.style.display = 'none';
            nodeLinkContainer.style.display = 'block';
            buttonTargetNode.value = button.target;
        }
        animationType.value = button.animation.type;
        animationDirection.value = button.animation.direction;
        animationDuration.value = button.animation.duration;
        renderButtons();

        // jump playhead to button start
        if (!isNaN(button.time)) {
            nodeVideoPreview.currentTime = button.time;
            handlePlayheadUpdate();
        }
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
            const node = currentProject.videos.find(v => v.id === draggedNode.dataset.nodeId);
            if (node) {
                node.x = draggedNode.style.left;
                node.y = draggedNode.style.top;
                saveProjects();
            }
            draggedNode = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
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

    function init() {
        projects = loadProjects();
        renderProjects();
        setupEventListeners();
        setupNodeDragging();
        navigateTo('dashboard');
    }

    init();
});
