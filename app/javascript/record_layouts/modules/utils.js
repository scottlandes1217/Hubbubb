// Utility functions shared across modules

export class Utils {
  static getAssetPath(key) {
    const assetsScript = document.getElementById('builder-assets');
    if (assetsScript) {
      try {
        const assets = JSON.parse(assetsScript.textContent);
        return assets[key] || '';
      } catch (e) {
        return '';
      }
    }
    return '';
  }

  static sanitizeLayoutHtml(html) {
    if (!html) return '';
    
    const div = document.createElement('div');
    div.innerHTML = html;
    
    // Remove builder-specific attributes
    const elementsToClean = div.querySelectorAll('[data-gjs-type], [data-gjs-id]');
    elementsToClean.forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('data-gjs-')) {
          el.removeAttribute(attr.name);
        }
      });
    });
    
    return div.innerHTML;
  }

  static showSaveMessage(message, type) {
    // Remove any existing save messages
    const existing = document.querySelector('.record-builder-toast');
    if (existing) existing.remove();
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `record-builder-toast alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
      <div>${message}</div>
      <button type="button" class="btn-close" aria-label="Close"></button>
    `;
    
    // Add close button handler
    alertDiv.querySelector('.btn-close').addEventListener('click', () => {
      alertDiv.classList.remove('show');
      setTimeout(() => {
        if (alertDiv.parentNode) {
          alertDiv.parentNode.removeChild(alertDiv);
        }
      }, 250);
    });
    
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.classList.remove('show');
        setTimeout(() => {
          if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
          }
        }, 250); // Wait for fade animation
      }
    }, 5000);
  }

  static getOrganizationId() {
    const metadataScript = document.getElementById('record-layout-metadata');
    if (metadataScript) {
      try {
        const meta = JSON.parse(metadataScript.textContent);
        return meta.organization_id || '1';
      } catch (e) {
        return '1';
      }
    }
    return '1';
  }

  static getReturnPath() {
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('return_to');
    if (returnTo) {
      return returnTo;
    }
    
    const match = window.location.pathname.match(/\/organizations\/(\d+)/);
    return match ? `/organizations/${match[1]}` : '/';
  }
}


