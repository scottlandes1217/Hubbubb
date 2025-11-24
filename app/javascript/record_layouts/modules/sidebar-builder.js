// Sidebar Builder Module
// Handles building and populating the left sidebar

import { Utils } from './utils.js';

export class SidebarBuilder {
  constructor(builder) {
    this.builder = builder;
    this.editor = builder.editor;
  }

  setup() {
    this.buildLeftSidebar();
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
    backBtn.href = Utils.getReturnPath();
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
    clearBtn.onclick = () => this.builder.clearCanvas();
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
    this.addComponentItem(componentsList, 'Section', 'fas fa-columns', 'record-section');
    
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
      // Store in global variable as fallback (for cross-frame drags)
      window.rbDragPayload = { type: componentType };
    });
    
    item.addEventListener('dragend', () => {
      window.rbDragPayload = null;
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
          // Store in global variable as fallback (for cross-frame drags)
          window.rbDragPayload = { type: 'partial', partial: c.partial };
        });
        
        item.addEventListener('dragend', () => {
          window.rbDragPayload = null;
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
          // Store in global variable as fallback (for cross-frame drags)
          window.rbDragPayload = { 
            type: 'field', 
            api: f.api_name, 
            label: f.label, 
            ftype: f.type || 'text',
            options: f.options || []
          };
        });
        
        item.addEventListener('dragend', () => {
          window.rbDragPayload = null;
        });
        
        fieldsList.appendChild(item);
      });
      
    } catch (e) {
      console.error('[PF] Error populating sidebar:', e);
    }
  }
}

