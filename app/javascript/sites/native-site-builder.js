// Native Site Builder
// Clean implementation without GrapesJS

import { Utils } from '../record_layouts/modules/utils.js';

export class NativeSiteBuilder {
  constructor() {
    this.pages = []; // Array of {id, name, components: []}
    this.currentPageId = null;
    this.metadata = null;
    this.canvas = null;
    this.pagesSidebar = null;
    this.blockPalette = null;
    this.isDragging = false;
    this.dragPayload = null;
    this.organizationId = null;
    this.siteId = null;
    this.saveUrl = null;
  }

  init() {
    console.log('[Native Site Builder] Initializing...');
    this.loadMetadata();
    this.setupCanvas();
    this.setupPagesSidebar();
    this.setupBlockPalette();
    this.setupDragAndDrop();
    this.loadExistingPages();
    console.log('[Native Site Builder] Initialization complete');
  }

  loadMetadata() {
    // Load organization ID from the page
    const match = window.location.pathname.match(/\/organizations\/(\d+)\/sites\/(\d+)/);
    if (match) {
      this.organizationId = match[1];
      this.siteId = match[2];
      this.saveUrl = `/organizations/${this.organizationId}/sites/${this.siteId}.json`;
    }

    // Load field metadata
    const fieldsScript = document.getElementById('org-fields-metadata');
    if (fieldsScript) {
      this.metadata = JSON.parse(fieldsScript.textContent);
    }
  }

  setupCanvas() {
    const canvasEl = document.getElementById('site-builder-canvas');
    if (!canvasEl) {
      console.error('[Native Site Builder] Canvas element #site-builder-canvas not found');
      return;
    }
    
    canvasEl.innerHTML = '';
    canvasEl.className = 'site-builder-canvas';
    canvasEl.style.cssText = 'background: #f8f9fa; padding: 20px; min-height: 400px; overflow-y: auto;';
    
    this.canvas = canvasEl;
    console.log('[Native Site Builder] Canvas setup complete');
  }

  setupPagesSidebar() {
    const sidebar = document.getElementById('site-builder-sidebar');
    if (!sidebar) return;
    
    this.pagesSidebar = sidebar;
    
    // Setup tab switching
    const tabButtons = sidebar.querySelectorAll('.sidebar-tab');
    tabButtons.forEach(btn => {
      btn.onclick = () => {
        const tabName = btn.dataset.tab;
        this.switchTab(tabName);
      };
    });
    
    // Add page button
    const addBtn = document.getElementById('add-site-page');
    if (addBtn) {
      addBtn.onclick = () => this.addPage();
    }
    
    // Render initial content
    this.renderPagesSidebar();
    this.buildBlockPalette();
  }

  switchTab(tabName) {
    console.log('[Native Site Builder] Switching to tab:', tabName);
    
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.sidebar-tab');
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Update tab content - hide all first, then show the active one
    const tabContents = document.querySelectorAll('.sidebar-tab-content');
    tabContents.forEach(content => {
      content.classList.remove('active');
    });
    
    // Show the selected tab
    const activeTab = document.getElementById(`${tabName}-tab`);
    if (activeTab) {
      activeTab.classList.add('active');
      console.log('[Native Site Builder] Activated tab:', activeTab.id);
    } else {
      console.error('[Native Site Builder] Tab not found:', `${tabName}-tab`);
    }
  }

  renderPagesSidebar() {
    const list = document.getElementById('site-pages-list');
    if (!list) return;
    
    list.innerHTML = '';
    this.pages.forEach((page, idx) => {
      const li = document.createElement('li');
      li.style.cssText = 'margin-bottom: 8px; cursor: pointer; padding: 10px 12px; border-radius: 4px; display: flex; align-items: center; justify-content: space-between;';
      li.style.background = page.id === this.currentPageId ? '#007bff' : 'transparent';
      li.style.color = page.id === this.currentPageId ? '#fff' : '#bdc3c7';
      
      // Page name
      const nameSpan = document.createElement('span');
      nameSpan.textContent = page.name;
      nameSpan.style.marginRight = '8px';
      
      if (page._editing) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = page.name;
        input.style.cssText = 'width: 80px; margin-right: 8px; background: transparent; border: 1px solid #fff; color: #fff; padding: 2px 4px;';
        input.onblur = () => this.savePageName(page, input);
        input.onkeydown = (e) => {
          if (e.key === 'Enter') {
            this.savePageName(page, input);
          }
        };
        li.appendChild(input);
        input.focus();
      } else {
        li.appendChild(nameSpan);
        
        // Edit icon
        const editIcon = document.createElement('span');
        editIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M14.69 2.86a2.1 2.1 0 0 1 2.97 2.97l-1.13 1.13-2.97-2.97 1.13-1.13zm-2.12 2.12l2.97 2.97-8.49 8.49c-.18.18-.4.31-.65.36l-3.18.64a.5.5 0 0 1-.59-.59l.64-3.18c.05-.25.18-.47.36-.65l8.49-8.49z"/></svg>';
        editIcon.style.cssText = 'margin-left: 4px; cursor: pointer; display: inline-block; vertical-align: middle;';
        editIcon.onclick = (e) => {
          e.stopPropagation();
          page._editing = true;
          this.renderPagesSidebar();
        };
        li.appendChild(editIcon);
      }
      
      // Remove button (if more than one page)
      if (this.pages.length > 1) {
        const removeBtn = document.createElement('span');
        removeBtn.textContent = ' ×';
        removeBtn.style.cssText = 'color: #dc3545; margin-left: 8px; cursor: pointer;';
        removeBtn.onclick = (e) => {
          e.stopPropagation();
          if (confirm('Are you sure you want to delete this page?')) {
            this.removePage(page.id);
          }
        };
        li.appendChild(removeBtn);
      }
      
      // Click to switch page
      li.onclick = (e) => {
        if (!e.target.closest('input, svg, span[style*="color: #dc3545"]')) {
          this.showPage(page.id);
        }
      };
      
      list.appendChild(li);
    });
  }

  savePageName(page, input) {
    page.name = input.value.trim() || page.name;
    page._editing = false;
    this.renderPagesSidebar();
  }

  addPage() {
    const newId = `page-${Date.now()}`;
    const newName = `Page ${this.pages.length + 1}`;
    const newPage = {
      id: newId,
      name: newName,
      components: []
    };
    this.pages.push(newPage);
    this.showPage(newId);
    this.renderPagesSidebar();
  }

  removePage(pageId) {
    if (this.pages.length === 1) return;
    
    const idx = this.pages.findIndex(p => p.id === pageId);
    if (idx !== -1) {
      this.pages.splice(idx, 1);
      // Show previous or first page
      const nextPage = this.pages[idx - 1] || this.pages[0];
      this.showPage(nextPage.id);
      this.renderPagesSidebar();
    }
  }

  showPage(pageId) {
    this.currentPageId = pageId;
    this.renderPagesSidebar();
    this.renderCurrentPage();
  }

  renderCurrentPage() {
    if (!this.canvas) return;
    
    const page = this.pages.find(p => p.id === this.currentPageId);
    if (!page) return;
    
    this.canvas.innerHTML = '';
    
    if (page.components.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'text-center text-muted p-5';
      emptyMsg.innerHTML = `
        <i class="fas fa-mouse-pointer fa-3x mb-3" style="opacity: 0.3;"></i>
        <p>Drag blocks from the palette to start building</p>
      `;
      this.canvas.appendChild(emptyMsg);
      return;
    }
    
    page.components.forEach(component => {
      const element = this.renderComponent(component);
      if (element) {
        this.canvas.appendChild(element);
      }
    });
  }

  renderComponent(component) {
    const element = document.createElement('div');
    element.className = 'site-component';
    element.dataset.componentId = component.id;
    element.style.cssText = 'position: relative; margin-bottom: 10px;';
    
    // Make component draggable and editable
    element.draggable = true;
    element.onclick = (e) => {
      if (e.target.closest('.delete-btn')) return;
      // Could add edit functionality here
    };
    
    // Delete button
    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.style.cssText = 'position: absolute; top: 4px; right: 4px; background: rgba(220, 53, 69, 0.8); color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; font-size: 16px; line-height: 1;';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      this.deleteComponent(component.id);
    };
    element.appendChild(deleteBtn);
    
    // Render component content based on type
    const content = document.createElement('div');
    content.style.cssText = 'padding: 10px; border: 1px dashed #ccc; background: white;';
    
    switch (component.type) {
      case 'text':
        content.innerHTML = component.content || '<p>Text block</p>';
        break;
      case 'heading':
        const level = component.level || 1;
        content.innerHTML = `<h${level}>${component.content || 'Heading'}</h${level}>`;
        break;
      case 'image':
        content.innerHTML = `<img src="${component.src || ''}" alt="${component.alt || ''}" style="max-width: 100%; height: auto;" />`;
        break;
      case 'button':
        content.innerHTML = `<button class="btn btn-primary">${component.label || 'Button'}</button>`;
        break;
      case 'form-field':
        content.innerHTML = this.renderFormField(component);
        break;
      case 'container':
        content.innerHTML = '<div style="padding: 20px; border: 1px solid #ddd;">Container</div>';
        break;
      default:
        content.innerHTML = component.html || '<div>Component</div>';
    }
    
    element.appendChild(content);
    return element;
  }

  renderFormField(component) {
    const field = component.field;
    if (!field) return '<div>Form Field</div>';
    
    let html = `<label>${field.label}`;
    switch (field.type) {
      case 'text':
        html += `<input type="text" name="${field.name}" class="form-control" /></label>`;
        break;
      case 'number':
        html += `<input type="number" name="${field.name}" class="form-control" /></label>`;
        break;
      case 'picklist':
        const options = (field.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join('');
        html += `<select name="${field.name}" class="form-control">${options}</select></label>`;
        break;
      case 'multiselect':
        const multiOptions = (field.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join('');
        html += `<select name="${field.name}[]" class="form-control" multiple>${multiOptions}</select></label>`;
        break;
      case 'date':
        html += `<input type="date" name="${field.name}" class="form-control" /></label>`;
        break;
      case 'checkbox':
        html = `<label><input type="checkbox" name="${field.name}" /> ${field.label}</label>`;
        break;
      case 'textarea':
        html += `<textarea name="${field.name}" class="form-control"></textarea></label>`;
        break;
      default:
        html += `<input type="text" name="${field.name}" class="form-control" /></label>`;
    }
    return html;
  }

  setupBlockPalette() {
    // Block palette is now inside the components tab
    // Just build it - no need to create or position it
    this.buildBlockPalette();
  }

  buildBlockPalette() {
    const paletteContent = document.getElementById('block-palette-content');
    if (!paletteContent) return;
    
    paletteContent.innerHTML = '';
    
    // Basic blocks category
    const basicCategory = document.createElement('div');
    basicCategory.className = 'block-category';
    const basicTitle = document.createElement('div');
    basicTitle.className = 'block-category-title';
    basicTitle.textContent = 'Basic';
    basicCategory.appendChild(basicTitle);
    
    this.addBlockItem(basicCategory, 'Text', 'fas fa-font', { type: 'text', content: '<p>Text block</p>' });
    this.addBlockItem(basicCategory, 'Heading', 'fas fa-heading', { type: 'heading', level: 1, content: 'Heading' });
    this.addBlockItem(basicCategory, 'Image', 'fas fa-image', { type: 'image', src: '', alt: '' });
    this.addBlockItem(basicCategory, 'Button', 'fas fa-hand-pointer', { type: 'button', label: 'Button' });
    this.addBlockItem(basicCategory, 'Container', 'fas fa-square', { type: 'container' });
    
    paletteContent.appendChild(basicCategory);
    
    // Form fields from metadata
    if (this.metadata) {
      Object.entries(this.metadata).forEach(([category, fields]) => {
        if (Array.isArray(fields) && fields.length > 0) {
          const categoryDiv = document.createElement('div');
          categoryDiv.className = 'block-category';
          const categoryTitle = document.createElement('div');
          categoryTitle.className = 'block-category-title';
          categoryTitle.textContent = category.replace('_fields', ' Fields').replace(/\b\w/g, l => l.toUpperCase());
          categoryDiv.appendChild(categoryTitle);
          
          fields.forEach(field => {
            const icon = this.getFieldIcon(field.type);
            this.addBlockItem(categoryDiv, field.label, icon, { type: 'form-field', field: field });
          });
          
          paletteContent.appendChild(categoryDiv);
        }
      });
    }
  }

  getFieldIcon(type) {
    const icons = {
      text: 'fas fa-font',
      number: 'fas fa-hashtag',
      picklist: 'fas fa-list',
      multiselect: 'fas fa-tasks',
      date: 'fas fa-calendar',
      checkbox: 'fas fa-check-square',
      textarea: 'fas fa-align-left'
    };
    return icons[type] || 'fas fa-question';
  }

  addBlockItem(container, label, icon, blockData) {
    const item = document.createElement('div');
    item.className = 'block-item';
    item.draggable = true;
    item.dataset.blockType = blockData.type;
    item.innerHTML = `<i class="${icon}"></i><span>${label}</span>`;
    
    item.ondragstart = (e) => {
      e.dataTransfer.effectAllowed = 'copy';
      this.dragPayload = blockData;
      this.isDragging = true;
    };
    
    item.ondragend = () => {
      this.isDragging = false;
      this.dragPayload = null;
    };
    
    container.appendChild(item);
  }

  setupDragAndDrop() {
    if (!this.canvas) return;
    
    this.canvas.ondragover = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      this.canvas.classList.add('dragover');
    };
    
    this.canvas.ondragleave = () => {
      this.canvas.classList.remove('dragover');
    };
    
    this.canvas.ondrop = (e) => {
      e.preventDefault();
      this.canvas.classList.remove('dragover');
      
      if (this.dragPayload) {
        this.addComponent(this.dragPayload);
      }
    };
  }

  addComponent(blockData) {
    const page = this.pages.find(p => p.id === this.currentPageId);
    if (!page) return;
    
    const component = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: blockData.type,
      ...blockData
    };
    
    page.components.push(component);
    this.renderCurrentPage();
  }

  deleteComponent(componentId) {
    const page = this.pages.find(p => p.id === this.currentPageId);
    if (!page) return;
    
    const idx = page.components.findIndex(c => c.id === componentId);
    if (idx !== -1) {
      page.components.splice(idx, 1);
      this.renderCurrentPage();
    }
  }

  loadExistingPages() {
    // Check if there's saved page data in the HTML
    const pagesDataScript = document.getElementById('saved-pages-data');
    if (pagesDataScript) {
      try {
        const savedPages = JSON.parse(pagesDataScript.textContent);
        if (savedPages && savedPages.length > 0) {
          this.pages = savedPages.map(page => ({
            id: page.id,
            name: page.name,
            components: this.parseHTMLToComponents(page.html || '')
          }));
          this.showPage(this.pages[0].id);
          return;
        }
      } catch (e) {
        console.error('[Native Site Builder] Error loading saved pages:', e);
      }
    }
    
    // Default: create first page
    if (this.pages.length === 0) {
      this.addPage();
    } else {
      this.showPage(this.pages[0].id);
    }
  }

  parseHTMLToComponents(html) {
    if (!html || !html.trim()) return [];
    
    // Simple parser - in a real implementation, you'd want more robust parsing
    const div = document.createElement('div');
    div.innerHTML = html;
    
    const components = [];
    Array.from(div.children).forEach((child, idx) => {
      const component = {
        id: `comp_${Date.now()}_${idx}`,
        type: 'html',
        html: child.outerHTML
      };
      components.push(component);
    });
    
    return components;
  }

  save() {
    if (!this.saveUrl) {
      console.error('[Native Site Builder] No save URL configured');
      return;
    }
    
    const pagesData = this.pages.map(page => ({
      id: page.id,
      name: page.name,
      html: this.serializePage(page)
    }));
    
    const css = this.serializeCSS();
    const js = this.serializeJS();
    
    fetch(this.saveUrl, {
      method: 'PATCH',
      headers: {
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        site: {
          site_data: {
            pages_json: pagesData,
            css: css,
            js: js
          }
        }
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        Utils.showSaveMessage('Site saved successfully!', 'success');
      } else {
        Utils.showSaveMessage('Error saving site: ' + (data.errors || 'Unknown error'), 'danger');
      }
    })
    .catch(error => {
      console.error('[Native Site Builder] Error saving:', error);
      Utils.showSaveMessage('Error saving site', 'danger');
    });
  }

  serializePage(page) {
    if (!page.components || page.components.length === 0) return '';
    
    return page.components.map(comp => {
      switch (comp.type) {
        case 'text':
          return comp.content || '<p>Text block</p>';
        case 'heading':
          const level = comp.level || 1;
          return `<h${level}>${comp.content || 'Heading'}</h${level}>`;
        case 'image':
          return `<img src="${comp.src || ''}" alt="${comp.alt || ''}" style="max-width: 100%; height: auto;" />`;
        case 'button':
          return `<button class="btn btn-primary">${comp.label || 'Button'}</button>`;
        case 'form-field':
          return this.serializeFormField(comp);
        case 'container':
          return '<div style="padding: 20px; border: 1px solid #ddd;">Container</div>';
        default:
          return comp.html || '<div>Component</div>';
      }
    }).join('\n');
  }

  serializeFormField(component) {
    const field = component.field;
    if (!field) return '';
    
    let html = `<label>${field.label}`;
    switch (field.type) {
      case 'text':
        html += `<input type="text" name="${field.name}" class="form-control" /></label>`;
        break;
      case 'number':
        html += `<input type="number" name="${field.name}" class="form-control" /></label>`;
        break;
      case 'picklist':
        const options = (field.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join('');
        html += `<select name="${field.name}" class="form-control">${options}</select></label>`;
        break;
      case 'multiselect':
        const multiOptions = (field.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join('');
        html += `<select name="${field.name}[]" class="form-control" multiple>${multiOptions}</select></label>`;
        break;
      case 'date':
        html += `<input type="date" name="${field.name}" class="form-control" /></label>`;
        break;
      case 'checkbox':
        html = `<label><input type="checkbox" name="${field.name}" /> ${field.label}</label>`;
        break;
      case 'textarea':
        html += `<textarea name="${field.name}" class="form-control"></textarea></label>`;
        break;
      default:
        html += `<input type="text" name="${field.name}" class="form-control" /></label>`;
    }
    return html;
  }

  serializeCSS() {
    // Return any custom CSS - for now, empty
    return '';
  }

  serializeJS() {
    // Return any custom JS - for now, empty
    return '';
  }
}

// Initialize on page load
let siteBuilderInstance = null;

export function initNativeSiteBuilder() {
  // Only initialize on the builder page
  if (!window.location.pathname.includes('/sites/') || !window.location.pathname.includes('/builder')) {
    return;
  }
  
  // Destroy existing instance if any
  if (siteBuilderInstance) {
    siteBuilderInstance = null;
  }
  
  const canvas = document.getElementById('site-builder-canvas');
  if (!canvas) {
    console.warn('[Native Site Builder] Canvas element #site-builder-canvas not found');
    return;
  }
  
  siteBuilderInstance = new NativeSiteBuilder();
  siteBuilderInstance.init();
  window.siteBuilderInstance = siteBuilderInstance;
  
  console.log('[Native Site Builder] Initialized');
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNativeSiteBuilder);
} else {
  initNativeSiteBuilder();
}

// Re-initialize on Turbo navigation
document.addEventListener('turbo:load', () => {
  setTimeout(initNativeSiteBuilder, 100);
});

document.addEventListener('turbo:before-cache', () => {
  if (siteBuilderInstance) {
    siteBuilderInstance = null;
    window.siteBuilderInstance = null;
  }
});

