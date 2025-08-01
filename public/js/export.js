// Add this to your project's main JS or as a separate module
document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('export-project-btn');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', async () => {
    let proj = window.currentProject;
    if (!proj) {
      // Check if we're in editor view but currentProject isn't set
      const editorView = document.querySelector('#editor.active');
      if (editorView) {
        console.log('In editor view but no currentProject set, attempting to fetch current project data');
        // Retry mechanism to wait for currentProject to be set
        let retries = 0;
        const maxRetries = 5;
        const retryInterval = 500; // milliseconds
        while (retries < maxRetries && !window.currentProject) {
          await new Promise(resolve => setTimeout(resolve, retryInterval));
          proj = window.currentProject;
          retries++;
          console.log(`Retry ${retries}/${maxRetries} to access currentProject`);
        }
        if (!proj) {
          console.error('currentProject is not accessible or not set in main_v2.js after retries');
          alert('No project is currently loaded. Please ensure you have opened a project to edit before exporting. If the issue persists, try refreshing the page or re-opening the project.');
          return;
        }
      } else {
        alert('No project loaded. Please navigate to a project first by clicking Edit on a project from the dashboard.');
        return;
      }
    }

    const projectData = {
      id: proj.id || generateId('project-'),
      title: proj.name || 'Untitled Project',
      data: proj
    };

    try {
      const response = await fetch('/api/saveProject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
      });

      if (!response.ok) throw new Error('Failed to save project');
      
      // Show embed code
      const embedCode = `
<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;">
  <iframe src="https://learn.threeminutetheory.com/embed-player-full.html?project=${projectData.id}"
          style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
          allow="autoplay; fullscreen" allowfullscreen>
  </iframe>
</div>`;

      // Modal overlay
      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
      });

      const box = document.createElement('div');
      Object.assign(box.style, { background: '#fff', padding: '20px', borderRadius: '8px', maxWidth: '600px', width: '90%' });

      const title = document.createElement('h3');
      title.textContent = 'Embed Code';

      const textarea = document.createElement('textarea');
      textarea.style.cssText = 'width:100%;height:200px;margin:10px 0;';
      textarea.value = embedCode;

      const copyBtn = document.createElement('button');
      copyBtn.textContent = 'Copy to Clipboard';
      copyBtn.addEventListener('click', () => navigator.clipboard.writeText(textarea.value));

      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close';
      closeBtn.style.marginLeft = '10px';
      closeBtn.addEventListener('click', () => overlay.remove());

      box.append(title, textarea, copyBtn, closeBtn);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    }
  });
});
