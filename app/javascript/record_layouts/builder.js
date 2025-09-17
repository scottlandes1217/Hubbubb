// Record Layout Builder - Clean and Minimal
console.log('[PF] Builder JavaScript file loaded successfully');

export class RecordLayoutBuilder {
  constructor() {
    this.editor = null;
    this.init();
  }

  init() {
    this.waitFor(() => !!window.grapesjs && document.getElementById('gjs'), () => {
      this.createEditor();
    });
  }

  waitFor(conditionFn, cb, { attempts = 20, interval = 100 } = {}) {
    if (conditionFn()) return cb();
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      if (conditionFn()) {
        clearInterval(t);
        cb();
      } else if (tries >= attempts) {
        clearInterval(t);
      }
    }, interval);
  }

  createEditor() {
    console.log('[PF] Creating GrapesJS editor...');
    
    try {
      this.editor = grapesjs.init({
        container: '#gjs',
        height: '100%',
        width: 'auto',
        storageManager: false,
        plugins: [],
        blockManager: { appendTo: null },
        styleManager: { appendTo: null },
        traitManager: { appendTo: null },
        selectorManager: { appendTo: null },
        canvas: {
          styles: [
            'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
            'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
            this.getAssetPath('application_css'),
            this.getAssetPath('record_builder_css')
          ]
        }
      });

      console.log('[PF] Editor created successfully');
      this.setupEditor();
    } catch (error) {
      console.error('[PF] Error creating editor:', error);
    }
  }

  setupEditor() {
    console.log('[PF] Setting up editor...');
    
    try {
      this.addSaveCommand();
      this.setupComponentTypes();
      this.setupTabsComponent();
      this.loadInitialContent();
      this.buildLeftSidebar();
      this.setupCanvasDragAndDrop();
      
      console.log('[PF] Editor setup completed');
    } catch (error) {
      console.error('[PF] Error in setupEditor:', error);
    }
  }

  addSaveCommand() {
    this.editor.Commands.add('save-record-layout', {
      run: (editor, sender, options) => {
        const html = editor.getHtml();
        const css = editor.getCss();
        const sanitizedHtml = this.sanitizeLayoutHtml(html);
        this.saveLayoutToDatabase(sanitizedHtml, css);
      }
    });
  }

  saveLayoutToDatabase(html, css) {
    try {
      const metadataScript = document.getElementById('record-layout-metadata');
      if (!metadataScript) return;
      
      const meta = JSON.parse(metadataScript.textContent);
      const layoutId = meta.layout_id;
      
      if (!layoutId) return;
      
      const formData = new FormData();
      formData.append('record_layout[layout_html]', html);
      formData.append('record_layout[layout_css]', css);
      
      fetch(`/organizations/${this.getOrganizationId()}/record_layout`, {
        method: 'PATCH',
        body: formData,
        headers: {
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'Accept': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          this.showSaveMessage('Layout saved successfully!', 'success');
        } else {
          this.showSaveMessage('Save failed: ' + (data.errors || 'Unknown error'), 'error');
        }
      })
      .catch(error => {
        this.showSaveMessage('Save failed: Network error', 'error');
      });
    } catch (error) {
      this.showSaveMessage('Save failed: ' + error.message, 'error');
    }
  }

  setupComponentTypes() {
    // Record Field Component
    this.editor.DomComponents.addType('record-field', {
      model: {
        defaults: {
          tagName: 'div',
          attributes: { class: 'record-field-placeholder pf-interactive border rounded p-2 mb-2 bg-white' },
          draggable: true,
          droppable: false,
          components: [
            { tagName: 'span', attributes: { class: 'rb-del', title: 'Delete' }, content: '×' },
            { type: 'text', content: '' }
          ]
        }
      },
      view: {
        events: { 'click .rb-del': 'onDelete' },
        onDelete(e) { e.preventDefault(); this.model.remove(); }
      }
    });

    // Record Partial Component
    this.editor.DomComponents.addType('record-partial', {
      model: {
        defaults: {
          tagName: 'div',
          attributes: { class: 'record-partial-placeholder pf-interactive border rounded p-2 mb-2 bg-light' },
          draggable: true,
          droppable: false,
          components: [
            { tagName: 'span', attributes: { class: 'rb-del', title: 'Delete' }, content: '×' },
            { type: 'text', content: '' }
          ]
        }
      },
      view: {
        events: { 'click .rb-del': 'onDelete' },
        onDelete(e) { e.preventDefault(); this.model.remove(); }
      }
    });

    // Add blocks
    this.editor.BlockManager.add('rp-field', { label: 'Field', category: 'Fields', content: { type: 'record-field' } });
    this.editor.BlockManager.add('rp-partial', { label: 'Partial', category: 'Content', content: { type: 'record-partial' } });
  }

  setupTabsComponent() {
    if (window.TabsComponent && window.TabsComponent.defineTabsComponent) {
      window.TabsComponent.defineTabsComponent(this.editor);
    }
  }

  loadInitialContent() {
    console.log('[PF] Loading initial content...');
    
    const metadataScript = document.getElementById('record-layout-metadata');
    if (!metadataScript) {
      console.error('[PF] No metadata script found');
      return;
    }
    
    try {
      const meta = JSON.parse(metadataScript.textContent);
      const initialHtml = meta.layout_html || '';
      const initialCss = meta.layout_css || '';
      
      console.log('[PF] Metadata keys:', Object.keys(meta));
      console.log('[PF] Initial HTML length:', initialHtml.length);
      console.log('[PF] Initial CSS length:', initialCss.length);
      console.log('[PF] Layout ID:', meta.layout_id);
      
      if (initialHtml) {
        console.log('[PF] Setting initial HTML components...');
        this.editor.setComponents(initialHtml);
      }
      
      if (initialCss) {
        console.log('[PF] Setting initial CSS...');
        this.editor.setStyle(initialCss);
      }
      
      console.log('[PF] Initial content loading completed');
      
      // Test if canvas is working by adding a simple test component
      setTimeout(() => {
        console.log('[PF] Testing canvas after content load...');
        
        try {
          const wrapper = this.editor.DomComponents.getWrapper();
          if (wrapper) {
            const components = wrapper.components();
            console.log('[PF] Wrapper has', components.length, 'components');
            
            if (components.length > 0) {
              console.log('[PF] First component type:', components.at(0).get('type'));
              console.log('[PF] First component HTML:', components.at(0).toHTML());
            }
          }
          
          // Try to add a simple test component
          const testComp = this.editor.DomComponents.addComponent({
            type: 'text',
            content: 'TEST: Canvas is working!'
          });
          
          console.log('[PF] Test component added:', testComp);
          
          // Remove test component
          testComp.remove();
          
        } catch (error) {
          console.error('[PF] Error testing canvas:', error);
        }
      }, 500);
      
    } catch (error) {
      console.error('[PF] Error loading initial content:', error);
    }
  }

  buildLeftSidebar() {
    const sidebar = document.getElementById('record-leftbar');
    if (!sidebar) return;
    
    // Clear existing content
    sidebar.innerHTML = '';
    
    // Build header with title and buttons
    const header = document.createElement('div');
    header.className = 'p-2 border-bottom';
    
    // Title row
    const titleRow = document.createElement('div');
    titleRow.className = 'fw-semibold text-muted builder-title';
    titleRow.textContent = 'Record Page Builder';
    header.appendChild(titleRow);
    
    // Icon buttons row
    const btnRow = document.createElement('div');
    btnRow.className = 'd-flex align-items-center mt-1 gap-2 builder-btn-row';
    
    // Back button
    const backBtn = document.createElement('a');
    backBtn.className = 'btn btn-lg btn-link text-secondary p-0';
    backBtn.href = this.getReturnPath();
    backBtn.title = 'Back';
    backBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
    btnRow.appendChild(backBtn);
    
    // Undo button
    const undoBtn = document.createElement('button');
    undoBtn.className = 'btn btn-lg btn-link text-secondary p-0';
    undoBtn.title = 'Undo';
    undoBtn.innerHTML = '<i class="fas fa-undo"></i>';
    undoBtn.onclick = () => this.editor.runCommand('core:undo');
    btnRow.appendChild(undoBtn);
    
    // Redo button
    const redoBtn = document.createElement('button');
    redoBtn.className = 'btn btn-lg btn-link text-secondary p-0';
    redoBtn.title = 'Redo';
    redoBtn.innerHTML = '<i class="fas fa-redo"></i>';
    redoBtn.onclick = () => this.editor.runCommand('core:redo');
    btnRow.appendChild(redoBtn);
    
    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-lg btn-link text-warning p-0';
    clearBtn.title = 'Clear Canvas';
    clearBtn.innerHTML = '<i class="fas fa-trash"></i>';
    clearBtn.onclick = () => this.clearCanvas();
    btnRow.appendChild(clearBtn);
    
    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.id = 'record-layout-save-btn';
    saveBtn.className = 'btn btn-lg btn-link text-primary p-0';
    saveBtn.title = 'Save';
    saveBtn.innerHTML = '<i class="fas fa-save"></i>';
    saveBtn.onclick = () => this.editor.runCommand('save-record-layout');
    btnRow.appendChild(saveBtn);
    
    header.appendChild(btnRow);
    sidebar.appendChild(header);
    
    // Build lists container
    const listContainer = document.createElement('div');
    listContainer.className = 'p-2';
    
    // Components section
    const componentsTitle = document.createElement('div');
    componentsTitle.className = 'text-muted small mt-2 mb-1';
    componentsTitle.textContent = 'Components';
    listContainer.appendChild(componentsTitle);
    
    const componentsList = document.createElement('div');
    componentsList.id = 'leftbar-components';
    listContainer.appendChild(componentsList);
    
    // Add built-in components
    this.addComponentItem(componentsList, 'Tabs', 'fas fa-folder', 'record-tabs');
    
    // Fields section
    const fieldsTitle = document.createElement('div');
    fieldsTitle.className = 'text-muted small mt-3 mb-1';
    fieldsTitle.textContent = 'Fields';
    listContainer.appendChild(fieldsTitle);
    
    const fieldsList = document.createElement('div');
    fieldsList.id = 'leftbar-fields';
    listContainer.appendChild(fieldsList);
    
    sidebar.appendChild(listContainer);
    
    // Populate with metadata
    this.populateSidebarLists(componentsList, fieldsList);
  }

  addComponentItem(container, label, iconClass, componentType) {
    const item = document.createElement('div');
    item.className = 'leftbar-item d-flex align-items-center gap-2 p-2 rounded mb-1';
    item.innerHTML = `<i class="${iconClass} text-muted"></i><span>${label}</span>`;
    item.draggable = true;
    
    item.addEventListener('dragstart', e => {
      e.dataTransfer.setData('component-type', componentType);
      e.dataTransfer.effectAllowed = 'copy';
    });
    
    item.addEventListener('click', () => {
      try {
        const root = this.editor.DomComponents.getWrapper();
        const comp = this.editor.DomComponents.addComponent({ type: componentType });
        comp.addAttributes({ 'data-comp-id': `c_${Date.now()}_${Math.random().toString(36).slice(2,8)}` });
      } catch(e) {
        console.error('[PF] Error adding component:', e);
      }
    });
    
    container.appendChild(item);
  }

  populateSidebarLists(componentsList, fieldsList) {
    try {
      const metadataScript = document.getElementById('record-layout-metadata');
      if (!metadataScript) return;
      
      const meta = JSON.parse(metadataScript.textContent);
      
      // Add components
      (meta.components || []).forEach(c => {
        const item = document.createElement('div');
        item.className = 'leftbar-item d-flex align-items-center gap-2 p-2 rounded mb-1';
        item.innerHTML = `<i class="fas fa-puzzle-piece text-muted"></i><span>${c.label}</span>`;
        item.draggable = true;
        
        item.addEventListener('dragstart', e => {
          e.dataTransfer.setData('component-type', 'partial');
          e.dataTransfer.setData('partial-name', c.partial);
          e.dataTransfer.effectAllowed = 'copy';
        });
        
        componentsList.appendChild(item);
      });
      
      // Add fields
      (meta.fields || []).forEach(f => {
        const item = document.createElement('div');
        item.className = 'leftbar-item d-flex align-items-center gap-2 p-2 rounded mb-1';
        item.innerHTML = `<i class="fas fa-tag text-muted"></i><span>${f.label}</span>`;
        item.draggable = true;
        
        item.addEventListener('dragstart', e => {
          e.dataTransfer.setData('component-type', 'field');
          e.dataTransfer.setData('field-api-name', f.api_name);
          e.dataTransfer.setData('field-label', f.label);
          e.dataTransfer.setData('field-type', f.type || 'text');
          e.dataTransfer.effectAllowed = 'copy';
        });
        
        fieldsList.appendChild(item);
      });
      
    } catch (e) {
      console.error('[PF] Error populating sidebar:', e);
    }
  }

  setupCanvasDragAndDrop() {
    const sidebar = document.getElementById('record-leftbar');
    if (!sidebar) return;
    
    sidebar.addEventListener('dragstart', (e) => {
      const item = e.target;
      const fieldName = item.getAttribute('data-field');
      const componentType = item.getAttribute('data-component');
      
      if (fieldName) {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'field', name: fieldName }));
      } else if (componentType) {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'component', name: componentType }));
      }
    });
    
    this.editor.on('component:dropped', (component, target) => {
      const dataTransfer = this.editor.getDragData();
      if (dataTransfer && dataTransfer.dataTransfer) {
        const data = JSON.parse(dataTransfer.dataTransfer.getData('text/plain'));
        
        if (data.type === 'field') {
          this.addFieldComponent(data.name, target);
        } else if (data.type === 'component') {
          this.addPartialComponent(data.name, target);
        }
      }
    });
  }

  addFieldComponent(fieldName, target) {
    const component = this.editor.DomComponents.addComponent({
      type: 'record-field',
      attributes: { 'data-field': fieldName }
    });
    
    if (target && target.components) {
      target.components().add(component);
    }
  }

  addPartialComponent(partialName, target) {
    const component = this.editor.DomComponents.addComponent({
      type: 'record-partial',
      attributes: { 'data-partial': partialName }
    });
    
    if (target && target.components) {
      target.components().add(component);
    }
  }

  sanitizeLayoutHtml(html) {
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

  getAssetPath(key) {
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

  getOrganizationId() {
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

  getReturnPath() {
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('return_to');
    if (returnTo) {
      return returnTo;
    }
    
    const match = window.location.pathname.match(/\/organizations\/(\d+)/);
    return match ? `/organizations/${match[1]}` : '/';
  }

  clearCanvas() {
    if (confirm('Are you sure you want to clear the entire canvas? This action cannot be undone.')) {
      try {
        const root = this.editor.DomComponents.getWrapper();
        const allComponents = root.components().models || [];
        allComponents.forEach(comp => {
          try { comp.remove(); } catch(_) {}
        });
      } catch (e) { 
        console.warn('[PF] clear-canvas error', e); 
      }
    }
    return false;
  }

  showSaveMessage(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.parentNode.removeChild(alertDiv);
      }
    }, 5000);
  }
}

// Initialize the builder
let builderInitialized = false;

function initRecordPageBuilder() {
  if (builderInitialized) return;
  builderInitialized = true;
  
  new RecordLayoutBuilder();
}

// Event listeners
document.addEventListener('DOMContentLoaded', initRecordPageBuilder);
document.addEventListener('turbo:load', initRecordPageBuilder);
