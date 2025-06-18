// Add this to your project's main JS or as a separate module
document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('export-project-btn');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', async () => {
    const proj = window.currentProject;
    if (!proj) {
      alert('No project loaded');
      return;
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
<script type="text/javascript" src="https://learn.threeminutetheory.com/player.js" async></script>
<div class="iv-player_responsive_padding" style="padding:56.25% 0 0 0;position:relative;" data-project="${projectData.id}">
    <div class="iv-player_responsive_wrapper" style="height:100%;left:0;position:absolute;top:0;width:100%;">
        <div class="iv-player_embed iv-player_async_loader" style="height:100%;position:relative;width:100%">
            <!-- Loading... -->
        </div>
    </div>
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
