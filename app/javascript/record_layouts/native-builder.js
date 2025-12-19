// Native Record Layout Builder
// Clean implementation without GrapesJS

import { Utils } from './modules/utils.js';

export class NativeRecordBuilder {
  constructor() {
    this.components = []; // Root component tree
    this.metadata = null;
    this.canvas = null;
    this.sidebar = null;
    this.isDragging = false;
    this.dragPayload = null;
  }

  init() {
    console.log('[Native Builder] Initializing...');
    this.loadMetadata();
    this.setupCanvas();
    this.setupSidebar();
    this.setupDragAndDrop();
    this.setupModals();
    this.loadExistingLayout();
    console.log('[Native Builder] Initialization complete');
  }

  setupModals() {
    // Initialize modal handlers if available
    try {
      // Import modal handlers dynamically
      import('./modules/modal-handlers.js').then(module => {
        const ModalHandlers = module.ModalHandlers;
        this.modalHandlers = new ModalHandlers(this);
        this.modalHandlers.setup();
        console.log('[Native Builder] Modal handlers initialized');
      }).catch(err => {
        console.warn('[Native Builder] Could not load modal handlers:', err);
      });
    } catch (err) {
      console.warn('[Native Builder] Error setting up modals:', err);
    }
  }

  loadMetadata() {
    const script = document.getElementById('record-layout-metadata');
    if (script) {
      this.metadata = JSON.parse(script.textContent);
    }
  }

  setupCanvas() {
    const canvasEl = document.getElementById('record-builder-canvas');
    if (!canvasEl) {
      console.error('[Native Builder] Canvas element #record-builder-canvas not found');
      return;
    }
    
    // Clear loading message and set up canvas
    canvasEl.innerHTML = '';
    canvasEl.className = 'record-builder-canvas';
    
    // Add basic styling if not already present
    if (!canvasEl.style.backgroundColor) {
      canvasEl.style.backgroundColor = '#f8f9fa';
      canvasEl.style.padding = '20px';
      canvasEl.style.minHeight = '400px';
      canvasEl.style.overflowY = 'auto';
    }
    
    // Add empty state message
    if (this.components.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'text-center text-muted p-5';
      emptyMsg.style.padding = '40px';
      emptyMsg.innerHTML = `
        <i class="fas fa-mouse-pointer fa-3x mb-3" style="opacity: 0.3;"></i>
        <p>Drag components from the sidebar to start building</p>
      `;
      canvasEl.appendChild(emptyMsg);
    }
    
    this.canvas = canvasEl;
    console.log('[Native Builder] Canvas setup complete');
  }

  setupSidebar() {
    const sidebar = document.getElementById('record-leftbar');
    if (!sidebar) return;
    
    this.sidebar = sidebar;
    this.buildSidebar();
  }

  buildSidebar() {
    this.sidebar.innerHTML = '';
    
    // Header
    const header = document.createElement('div');
    header.className = 'p-3 border-bottom';
    
    const title = document.createElement('div');
    title.className = 'builder-title mb-2';
    title.textContent = 'Record Builder';
    header.appendChild(title);
    
    const btnRow = document.createElement('div');
    btnRow.className = 'd-flex gap-2 align-items-center justify-content-end';
    btnRow.style.cssText = 'padding: 8px 0;';
    
    // Back button
    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-sm btn-outline-secondary';
    backBtn.innerHTML = '<i class="fas fa-arrow-left me-1"></i> Back';
    backBtn.onclick = () => {
      // Get return path from URL params or construct from metadata
      const urlParams = new URLSearchParams(window.location.search);
      const returnTo = urlParams.get('return_to');
      if (returnTo) {
        window.location.href = returnTo;
      } else {
        // Construct default path based on table type
        const orgId = this.metadata?.organization_id;
        if (orgId) {
          if (this.metadata?.table_type === 'Pet') {
            // Go to pets index
            window.location.href = `/organizations/${orgId}/pets`;
          } else {
            // Default to organization page
            window.location.href = `/organizations/${orgId}`;
          }
        } else {
          window.history.back();
        }
      }
    };
    btnRow.appendChild(backBtn);
    
    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-sm btn-outline-danger';
    clearBtn.innerHTML = '<i class="fas fa-trash me-1"></i> Clear';
    clearBtn.onclick = () => {
      if (confirm('Are you sure you want to clear all components? This cannot be undone.')) {
        this.clear();
      }
    };
    btnRow.appendChild(clearBtn);
    
    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-sm btn-primary';
    saveBtn.innerHTML = '<i class="fas fa-save me-1"></i> Save';
    saveBtn.onclick = () => this.save();
    btnRow.appendChild(saveBtn);
    
    header.appendChild(btnRow);
    this.sidebar.appendChild(header);
    
    // Components section
    const listContainer = document.createElement('div');
    listContainer.className = 'p-2';
    
    const componentsTitle = document.createElement('div');
    componentsTitle.className = 'text-muted small mt-2 mb-1';
    componentsTitle.textContent = 'Components';
    listContainer.appendChild(componentsTitle);
    
    const componentsList = document.createElement('div');
    componentsList.id = 'leftbar-components';
    this.addComponentItem(componentsList, 'Tabs', 'fas fa-folder', 'tabs');
    this.addComponentItem(componentsList, 'Section', 'fas fa-columns', 'section');
    listContainer.appendChild(componentsList);
    
    // Partials section (if available)
    if (this.metadata && this.metadata.components && this.metadata.components.length > 0) {
      const partialsTitle = document.createElement('div');
      partialsTitle.className = 'text-muted small mt-3 mb-1';
      partialsTitle.textContent = 'Partials';
      listContainer.appendChild(partialsTitle);
      
      const partialsList = document.createElement('div');
      partialsList.id = 'leftbar-partials';
      
      this.metadata.components.forEach(comp => {
        if (comp.partial) {
          this.addPartialItem(partialsList, comp);
        }
      });
      
      listContainer.appendChild(partialsList);
    }
    
    // Fields section
    const fieldsTitle = document.createElement('div');
    fieldsTitle.className = 'text-muted small mt-3 mb-1';
    fieldsTitle.textContent = 'Fields';
    listContainer.appendChild(fieldsTitle);
    
    const fieldsList = document.createElement('div');
    fieldsList.id = 'leftbar-fields';
    
    if (this.metadata && this.metadata.fields) {
      this.metadata.fields.forEach(field => {
        this.addFieldItem(fieldsList, field);
      });
    }
    
    listContainer.appendChild(fieldsList);
    this.sidebar.appendChild(listContainer);
  }

  addComponentItem(container, label, iconClass, type) {
    const item = document.createElement('div');
    item.className = 'leftbar-item d-flex align-items-center gap-2 p-2 rounded mb-1';
    item.innerHTML = `<i class="${iconClass} text-muted"></i><span>${label}</span>`;
    item.draggable = true;
    item.dataset.componentType = type;
    
    item.addEventListener('dragstart', (e) => {
      this.isDragging = true;
      this.dragPayload = { type: 'component', componentType: type };
      e.dataTransfer.effectAllowed = 'copy';
      item.style.opacity = '0.5';
    });
    
    item.addEventListener('dragend', () => {
      this.isDragging = false;
      this.dragPayload = null;
      item.style.opacity = '1';
    });
    
    container.appendChild(item);
  }

  addPartialItem(container, comp) {
    const item = document.createElement('div');
    item.className = 'leftbar-item d-flex align-items-center gap-2 p-2 rounded mb-1';
    item.innerHTML = `<i class="fas fa-file-alt text-muted"></i><span>${comp.label}</span>`;
    item.draggable = true;
    item.dataset.partialName = comp.partial;
    
    item.addEventListener('dragstart', (e) => {
      this.isDragging = true;
      this.dragPayload = {
        type: 'partial',
        partialName: comp.partial,
        label: comp.label
      };
      e.dataTransfer.effectAllowed = 'copy';
      item.style.opacity = '0.5';
    });
    
    item.addEventListener('dragend', () => {
      this.isDragging = false;
      this.dragPayload = null;
      item.style.opacity = '1';
    });
    
    container.appendChild(item);
  }

  addFieldItem(container, field) {
    const item = document.createElement('div');
    item.className = 'leftbar-item d-flex align-items-center gap-2 p-2 rounded mb-1';
    item.innerHTML = `<i class="fas fa-tag text-muted"></i><span>${field.label}</span>`;
    item.draggable = true;
    item.dataset.fieldApi = field.api_name;
    item.dataset.fieldLabel = field.label;
    item.dataset.fieldType = field.type || 'text';
    
    item.addEventListener('dragstart', (e) => {
      this.isDragging = true;
      this.dragPayload = {
        type: 'field',
        api: field.api_name,
        label: field.label,
        ftype: field.type || 'text'
      };
      e.dataTransfer.effectAllowed = 'copy';
      item.style.opacity = '0.5';
    });
    
    item.addEventListener('dragend', () => {
      this.isDragging = false;
      this.dragPayload = null;
      item.style.opacity = '1';
    });
    
    container.appendChild(item);
  }

  setupDragAndDrop() {
    if (!this.canvas) return;
    
    // Canvas-level drag handlers
    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      // Allow both 'copy' (from sidebar) and 'move' (reordering) operations
      if (this.dragPayload?.type === 'move') {
        e.dataTransfer.dropEffect = 'move';
      } else {
        e.dataTransfer.dropEffect = 'copy';
      }
    });
    
    this.canvas.addEventListener('drop', (e) => {
      
      // Only handle if not already handled by tab-section/section-column handlers
      const tabSection = e.target.closest('[data-role="pf-tab-section"]');
      const sectionColumn = e.target.closest('[data-role="section-column"]');
      if (tabSection || sectionColumn) {
        // Let the delegated handler above handle it
        return;
      }
      
      e.preventDefault();
      if (!this.dragPayload) return;
      
      // For root-level drops (including reordering), use findDropTarget
      const target = this.findDropTarget(e.target, e.clientX, e.clientY);
      console.log('[Native Builder] Canvas drop', { dragPayload: this.dragPayload, target });
      this.handleDrop(target, e.clientX, e.clientY);
    });
    
    
    // Use event delegation for tab sections and section columns
    // This ensures drops work even after re-rendering
    this.canvas.addEventListener('dragover', (e) => {
      const tabSection = e.target.closest('[data-role="pf-tab-section"]');
      const sectionColumn = e.target.closest('[data-role="section-column"]');
      
      if (tabSection || sectionColumn) {
        e.preventDefault();
        e.stopPropagation();
        // Allow both 'copy' (from sidebar) and 'move' (reordering)
        e.dataTransfer.dropEffect = this.dragPayload?.type === 'move' ? 'move' : 'copy';
        
        // Add visual feedback
        if (tabSection) {
          tabSection.classList.add('dragover');
        }
        if (sectionColumn) {
          sectionColumn.classList.add('dragover');
        }
      }
    }, true);
    
    this.canvas.addEventListener('dragleave', (e) => {
      const tabSection = e.target.closest('[data-role="pf-tab-section"]');
      const sectionColumn = e.target.closest('[data-role="section-column"]');
      
      if (tabSection) {
        tabSection.classList.remove('dragover');
      }
      if (sectionColumn) {
        sectionColumn.classList.remove('dragover');
      }
    }, true);
    
    this.canvas.addEventListener('drop', (e) => {
      const tabSection = e.target.closest('[data-role="pf-tab-section"]');
      const sectionColumn = e.target.closest('[data-role="section-column"]');
      
      if (tabSection) {
        tabSection.classList.remove('dragover');
      }
      if (sectionColumn) {
        sectionColumn.classList.remove('dragover');
      }
      
      // Handle drop on tab section or section column
      if (tabSection || sectionColumn) {
        e.preventDefault();
        e.stopPropagation();
        if (this.dragPayload) {
          // We already found the drop target element, so construct the target object directly
          let target;
          if (tabSection) {
            const componentId = tabSection.dataset.componentId;
            const tabId = tabSection.dataset.tabId;
            console.log('[Native Builder] Drop on tab section', { componentId, tabId, dragPayload: this.dragPayload });
            if (componentId && tabId) {
              target = { type: 'tab-section', element: tabSection, componentId, tabId };
            }
          } else if (sectionColumn) {
            const componentId = sectionColumn.dataset.componentId;
            const columnId = sectionColumn.dataset.columnId;
            console.log('[Native Builder] Drop on section column', { componentId, columnId, dragPayload: this.dragPayload });
            if (componentId && columnId) {
              target = { type: 'section-column', element: sectionColumn, componentId, columnId };
            }
          }
          
          // Fallback to findDropTarget if we couldn't construct the target
          if (!target) {
            console.warn('[Native Builder] Could not construct target from element, using findDropTarget');
            target = this.findDropTarget(e.target, e.clientX, e.clientY);
          }
          
          console.log('[Native Builder] Calling handleDrop with target', target);
          this.handleDrop(target, e.clientX, e.clientY);
        }
      }
    }, true);
  }

  findDropTarget(element, x, y) {
    // Get the dragged element's component ID to exclude it from drop targets
    const draggedElement = this.isDragging && this.dragPayload?.componentId
      ? document.querySelector(`[data-component-id="${this.dragPayload.componentId}"]`)
      : null;
    
    // Use elementFromPoint to find what's actually under the cursor
    // This avoids issues with the dragged element being the target
    const pointElement = x !== undefined && y !== undefined 
      ? document.elementFromPoint(x, y)
      : element;
    
    // Walk up from the point element to find drop targets
    // Skip the dragged element itself and its children
    let current = pointElement;
    while (current && current !== this.canvas) {
      // Skip if this is the dragged element itself
      if (draggedElement && (current === draggedElement || draggedElement.contains(current))) {
        current = current.parentElement;
        continue;
      }
      
      // Check for tab section (most specific)
      if (current.hasAttribute && current.hasAttribute('data-role') && 
          current.getAttribute('data-role') === 'pf-tab-section') {
        const componentId = current.dataset.componentId;
        const tabId = current.dataset.tabId;
        if (componentId && tabId) {
          // Make sure we're not trying to drop into the dragged component itself
          if (this.dragPayload?.componentId !== componentId) {
            return { type: 'tab-section', element: current, componentId, tabId };
          }
        }
      }
      
      // Check for section column
      if (current.hasAttribute && current.hasAttribute('data-role') && 
          current.getAttribute('data-role') === 'section-column') {
        const componentId = current.dataset.componentId;
        const columnId = current.dataset.columnId;
        if (componentId && columnId) {
          // Make sure we're not trying to drop into the dragged component itself
          // For section columns, componentId is the section's ID, not the field's ID
          // So we only need to check if we're moving the section into itself
          const draggedComponentId = this.dragPayload?.componentId;
          console.log('[Native Builder] Found section column', { componentId, columnId, draggedComponentId, element: current });
          if (draggedComponentId !== componentId) {
            return { type: 'section-column', element: current, componentId, columnId };
          } else {
            console.warn('[Native Builder] Skipping section column - same as dragged component', componentId);
          }
        }
      }
      
      current = current.parentElement;
    }
    
    // For root-level drops, check if we're dropping near another component to determine insertion point
    if (this.dragPayload?.type === 'move' && this.dragPayload?.componentId) {
      // Find all root-level components (not inside tabs or sections)
      const rootComponents = Array.from(this.canvas.children).filter(child => {
        const componentId = child.dataset.componentId;
        if (!componentId) return false;
        // Make sure it's not the dragged component
        if (componentId === this.dragPayload.componentId) return false;
        // Make sure it's a direct child (root level)
        return child.parentElement === this.canvas;
      });
      
      // Find which component we're dropping near
      for (const comp of rootComponents) {
        const rect = comp.getBoundingClientRect();
        // Check if drop point is near this component (within 50px vertically)
        if (y >= rect.top - 25 && y <= rect.bottom + 25) {
          // Determine if dropping before or after based on vertical position
          const midPoint = rect.top + (rect.height / 2);
          const insertBefore = y < midPoint;
          return { 
            type: 'root', 
            element: this.canvas,
            insertBefore: insertBefore,
            insertBeforeComponentId: insertBefore ? comp.dataset.componentId : null,
            insertAfterComponentId: !insertBefore ? comp.dataset.componentId : null
          };
        }
      }
    }
    
    // Default to root canvas (append to end)
    return { type: 'root', element: this.canvas };
  }

  handleDrop(target, x, y) {
    if (!this.dragPayload) return;
    
    if (this.dragPayload.type === 'component') {
      this.addComponent(target, this.dragPayload.componentType);
    } else if (this.dragPayload.type === 'field') {
      this.addField(target, this.dragPayload);
    } else if (this.dragPayload.type === 'partial') {
      this.addPartial(target, this.dragPayload);
    } else if (this.dragPayload.type === 'move') {
      this.moveComponent(target, this.dragPayload.componentId);
    }
    
    this.dragPayload = null;
  }

  addComponent(target, componentType) {
    const component = {
      id: this.generateId(),
      type: componentType,
      children: []
    };
    
    if (componentType === 'tabs') {
      component.config = { tabs: [{ id: 'tab1', title: 'Tab 1' }], activeTabId: 'tab1' };
    } else if (componentType === 'section') {
      component.config = { columns: [{ id: 'col1', width: '50%' }, { id: 'col2', width: '50%' }] };
    }
    
    // Add to component tree
    if (target.type === 'root') {
      this.components.push(component);
    } else if (target.type === 'tab-section') {
      // Add to tab section - need to set tabId
      const parent = this.findComponentById(target.componentId);
      if (parent) {
        component.tabId = target.tabId;
        if (!parent.children) parent.children = [];
        parent.children.push(component);
      }
    } else if (target.type === 'section-column') {
      // Add to section column - need to set columnId
      const parent = this.findComponentById(target.componentId);
      if (parent) {
        component.columnId = target.columnId;
        if (!parent.children) parent.children = [];
        parent.children.push(component);
      }
    } else {
      // Fallback: find parent component and add to its children
      const parentId = target.element?.dataset?.componentId;
      if (parentId) {
        const parent = this.findComponentById(parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(component);
        }
      }
    }
    
    this.render();
  }

  addField(target, fieldData) {
    const field = {
      id: this.generateId(),
      type: 'field',
      api: fieldData.api,
      label: fieldData.label,
      ftype: fieldData.ftype
    };
    
    // Add to component tree
    if (target.type === 'root') {
      this.components.push(field);
    } else if (target.type === 'tab-section') {
      // Add to tab section
      const parent = this.findComponentById(target.componentId);
      if (parent) {
        field.tabId = target.tabId;
        if (!parent.children) parent.children = [];
        parent.children.push(field);
      }
    } else if (target.type === 'section-column') {
      // Add to section column
      const parent = this.findComponentById(target.componentId);
      console.log('[Native Builder] addField to section-column', { 
        target, 
        parent, 
        columnId: target.columnId,
        field,
        parentColumns: parent?.config?.columns
      });
      if (parent) {
        // Verify the columnId exists in the section's columns
        const columnExists = parent.config?.columns?.some(col => col.id === target.columnId);
        if (!columnExists) {
          console.error('[Native Builder] Column ID does not exist in section columns', {
            columnId: target.columnId,
            availableColumns: parent.config?.columns
          });
          // Use first column as fallback
          if (parent.config?.columns?.length > 0) {
            field.columnId = parent.config.columns[0].id;
            console.log('[Native Builder] Using first column as fallback:', field.columnId);
          } else {
            console.error('[Native Builder] Section has no columns!');
            return;
          }
        } else {
          field.columnId = target.columnId;
        }
        if (!parent.children) parent.children = [];
        parent.children.push(field);
        console.log('[Native Builder] Field added to section, parent.children now:', parent.children);
      } else {
        console.error('[Native Builder] Could not find parent section component', target.componentId);
      }
    } else {
      // Fallback
      const parentId = target.element?.dataset?.componentId;
      if (parentId) {
        const parent = this.findComponentById(parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(field);
        }
      }
    }
    
    this.render();
  }

  addPartial(target, partialData) {
    console.log('[Native Builder] addPartial called', { target, partialData });
    const partial = {
      id: this.generateId(),
      type: 'partial',
      partialName: partialData.partialName,
      label: partialData.label
    };
    console.log('[Native Builder] Created partial component', partial);
    
    // Add to component tree
    if (target.type === 'root') {
      this.components.push(partial);
    } else if (target.type === 'tab-section') {
      const parent = this.findComponentById(target.componentId);
      if (parent) {
        partial.tabId = target.tabId;
        if (!parent.children) parent.children = [];
        parent.children.push(partial);
      }
    } else if (target.type === 'section-column') {
      const parent = this.findComponentById(target.componentId);
      if (parent) {
        partial.columnId = target.columnId;
        if (!parent.children) parent.children = [];
        parent.children.push(partial);
      }
    } else {
      const parentId = target.element?.dataset?.componentId;
      if (parentId) {
        const parent = this.findComponentById(parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(partial);
        }
      }
    }
    
    this.render();
  }

  moveComponent(target, componentId) {
    console.log('[Native Builder] moveComponent called', { componentId, target });
    
    // Find the component to move
    const component = this.findComponentById(componentId);
    if (!component) {
      console.warn('[Native Builder] Cannot move: component not found', componentId);
      return;
    }
    
    // Prevent moving a container component (section/tabs) into itself
    // For fields and partials, target.componentId is the parent section/tabs ID, not the field's ID
    // So if target.componentId matches componentId for a field/partial, it's a bug in detection
    console.log('[Native Builder] Checking move restrictions', { 
      targetType: target.type, 
      targetComponentId: target.componentId, 
      componentId, 
      componentType: component.type,
      dragPayloadType: this.dragPayload?.componentType,
      match: target.componentId === componentId
    });
    
    // Only prevent if we're actually moving a section/tabs component into itself
    // For fields/partials, target.componentId is the parent section's ID, so they should never match
    if (target.type === 'section-column' && target.componentId === componentId) {
      if (component.type === 'section') {
        console.warn('[Native Builder] Cannot move section component into itself', componentId);
        return;
      }
      // If it's a field/partial and IDs match, it's a detection bug - log and allow to proceed
      // The move will fail gracefully if parent isn't found
      console.warn('[Native Builder] Warning: target.componentId matches field/partial componentId - detection bug, but allowing move', { 
        componentId, 
        target, 
        componentType: component.type
      });
    }
    if (target.type === 'tab-section' && target.componentId === componentId && component.type === 'tabs') {
      console.warn('[Native Builder] Cannot move tabs component into itself', componentId);
      return;
    }
    
    // Find current parent and remove component from its current location
    const currentParent = this.findParentComponent(componentId);
    const removeFromParent = (parent, childId) => {
      if (!parent) {
        // Component is at root level
        const index = this.components.findIndex(c => c.id === childId);
        if (index !== -1) {
          this.components.splice(index, 1);
          return true;
        }
        return false;
      } else {
        // Component is a child
        if (!parent.children) return false;
        const index = parent.children.findIndex(c => c.id === childId);
        if (index !== -1) {
          parent.children.splice(index, 1);
          return true;
        }
        return false;
      }
    };
    
    const removed = removeFromParent(currentParent, componentId);
    if (!removed) {
      console.warn('[Native Builder] Failed to remove component from current location', componentId);
      return;
    }
    
    // Update component's location properties
    delete component.tabId;
    delete component.columnId;
    
    // Add to new location
    if (target.type === 'root') {
      // Check if we need to insert at a specific position for reordering
      if (target.insertBeforeComponentId) {
        // Insert before the specified component
        const insertIndex = this.components.findIndex(c => c.id === target.insertBeforeComponentId);
        if (insertIndex !== -1) {
          this.components.splice(insertIndex, 0, component);
          console.log('[Native Builder] Moved component to root level before', target.insertBeforeComponentId);
        } else {
          this.components.push(component);
          console.log('[Native Builder] Moved component to root level (insertBeforeComponentId not found, appending)');
        }
      } else if (target.insertAfterComponentId) {
        // Insert after the specified component
        const insertIndex = this.components.findIndex(c => c.id === target.insertAfterComponentId);
        if (insertIndex !== -1) {
          this.components.splice(insertIndex + 1, 0, component);
          console.log('[Native Builder] Moved component to root level after', target.insertAfterComponentId);
        } else {
          this.components.push(component);
          console.log('[Native Builder] Moved component to root level (insertAfterComponentId not found, appending)');
        }
      } else {
        // Append to end
        this.components.push(component);
        console.log('[Native Builder] Moved component to root level (appending)');
      }
    } else if (target.type === 'tab-section') {
      const parent = this.findComponentById(target.componentId);
      if (parent) {
        component.tabId = target.tabId;
        if (!parent.children) parent.children = [];
        parent.children.push(component);
      } else {
        console.error('[Native Builder] Target parent not found for tab-section', target.componentId);
        // Restore to original location
        if (currentParent) {
          if (!currentParent.children) currentParent.children = [];
          currentParent.children.push(component);
        } else {
          this.components.push(component);
        }
        return;
      }
    } else if (target.type === 'section-column') {
      const parent = this.findComponentById(target.componentId);
      if (parent) {
        component.columnId = target.columnId;
        if (!parent.children) parent.children = [];
        parent.children.push(component);
      } else {
        console.error('[Native Builder] Target parent not found for section-column', target.componentId);
        // Restore to original location
        if (currentParent) {
          if (!currentParent.children) currentParent.children = [];
          currentParent.children.push(component);
        } else {
          this.components.push(component);
        }
        return;
      }
    } else {
      // Fallback: add to root
      this.components.push(component);
    }
    
    this.render();
  }

  findParentComponent(componentId) {
    const find = (components, parent = null) => {
      for (const comp of components) {
        if (comp.id === componentId) return parent;
        if (comp.children) {
          const found = find(comp.children, comp);
          if (found !== null) return found;
        }
      }
      return null;
    };
    return find(this.components);
  }

  findComponentById(id) {
    const find = (components) => {
      for (const comp of components) {
        if (comp.id === id) return comp;
        if (comp.children) {
          const found = find(comp.children);
          if (found) return found;
        }
      }
      return null;
    };
    return find(this.components);
  }

  render() {
    if (!this.canvas) {
      console.error('[Native Builder] Cannot render: canvas not found');
      return;
    }
    
    this.canvas.innerHTML = '';
    
    // Add empty state if no components
    if (this.components.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'text-center text-muted p-5';
      emptyMsg.style.padding = '40px';
      emptyMsg.innerHTML = `
        <i class="fas fa-mouse-pointer fa-3x mb-3" style="opacity: 0.3;"></i>
        <p>Drag components from the sidebar to start building</p>
      `;
      this.canvas.appendChild(emptyMsg);
      return;
    }
    
    // Render all components
    this.components.forEach(component => {
      const element = this.renderComponent(component);
      if (element) {
        this.canvas.appendChild(element);
      }
    });
    
    console.log('[Native Builder] Rendered', this.components.length, 'components');
  }

  renderComponent(component) {
    switch (component.type) {
      case 'field':
        return this.renderField(component);
      case 'partial':
        return this.renderPartial(component);
      case 'tabs':
        return this.renderTabs(component);
      case 'section':
        return this.renderSection(component);
      default:
        return document.createDocumentFragment();
    }
  }

  renderField(component) {
    const div = document.createElement('div');
    div.className = 'record-field-placeholder pf-interactive rounded p-2 mb-2 bg-white';
    div.dataset.componentId = component.id;
    div.setAttribute('data-component-id', component.id); // Also set as attribute for easier querying
    div.draggable = true;
    div.innerHTML = `
      <span class="rb-del" title="Delete">×</span>
      <span>${component.label || component.api}</span>
    `;
    
    div.querySelector('.rb-del').onclick = () => this.deleteComponent(component.id);
    this.setupComponentDrag(div, component);
    
    // Make sure field drags don't bubble to parent sections
    div.addEventListener('dragstart', (e) => {
      e.stopPropagation(); // Prevent bubbling to section container
    });
    
    return div;
  }

  renderPartial(component) {
    const div = document.createElement('div');
    div.className = 'record-partial-placeholder pf-interactive rounded p-2 mb-2 bg-light';
    div.dataset.componentId = component.id;
    div.setAttribute('data-component-id', component.id); // Also set as attribute for easier querying
    div.dataset.partialName = component.partialName;
    // Set partial-name attribute for runtime rendering
    div.setAttribute('partial-name', component.partialName || '');
    div.draggable = true;
    
    // Make sure partial drags don't bubble to parent sections
    div.addEventListener('dragstart', (e) => {
      e.stopPropagation(); // Prevent bubbling to section container
    });
    
    // Try to get preview HTML from metadata
    let previewHtml = '';
    try {
      const previewScript = document.getElementById('record-layout-preview');
      if (previewScript) {
        const preview = JSON.parse(previewScript.textContent);
        const partials = preview.partials || {};
        previewHtml = partials[component.partialName] || '';
      }
    } catch(e) {
      console.warn('[Native Builder] Error loading partial preview:', e);
    }
    
    // Show preview HTML if available, otherwise show nothing (no label text)
    if (previewHtml) {
      div.innerHTML = `
        <span class="rb-del" title="Delete">×</span>
        <div style="margin-top: 8px;">${previewHtml}</div>
      `;
    } else {
      // Just show delete button if no preview available
      div.innerHTML = `
        <span class="rb-del" title="Delete">×</span>
      `;
      // Add a subtle indicator that this is a partial
      div.style.border = '1px dashed #ccc';
      div.style.minHeight = '40px';
    }
    
    div.querySelector('.rb-del').onclick = () => this.deleteComponent(component.id);
    this.setupComponentDrag(div, component);
    
    return div;
  }

  renderTabs(component) {
    const container = document.createElement('div');
    container.className = 'pf-tabs-container pf-interactive';
    container.dataset.componentId = component.id;
    container.draggable = true;
    container.style.position = 'relative'; // Needed for absolute positioning of buttons
    
    const tabs = component.config?.tabs || [{ id: 'tab1', title: 'Tab 1' }];
    const activeTabId = component.config?.activeTabId || tabs[0]?.id;
    
    const tabsWrapper = document.createElement('div');
    tabsWrapper.className = 'pf-tabs';
    
    // Header
    const header = document.createElement('div');
    header.className = 'pf-tabs-header';
    tabs.forEach(tab => {
      const btn = document.createElement('span');
      btn.className = `pf-tab-btn ${tab.id === activeTabId ? 'active' : ''}`;
      btn.dataset.tabId = tab.id;
      btn.textContent = tab.title;
      btn.onclick = () => this.switchTab(component.id, tab.id);
      header.appendChild(btn);
    });
    tabsWrapper.appendChild(header);
    
    // Body
    const body = document.createElement('div');
    body.className = 'pf-tabs-body';
    tabs.forEach(tab => {
      const section = document.createElement('div');
      section.className = `pf-tab-section ${tab.id === activeTabId ? 'active' : ''}`;
      section.setAttribute('data-role', 'pf-tab-section');
      section.dataset.tabId = tab.id;
      section.dataset.componentId = component.id;
      
      // Make section droppable
      section.style.minHeight = '50px';
      section.style.padding = '16px';
      
      // Render children for this tab
      if (component.children) {
        component.children
          .filter(child => child.tabId === tab.id)
          .forEach(child => {
            section.appendChild(this.renderComponent(child));
          });
      }
      
      body.appendChild(section);
    });
    tabsWrapper.appendChild(body);
    
    container.appendChild(tabsWrapper);
    
    // Edit and delete buttons
    const editBtn = document.createElement('span');
    editBtn.className = 'rb-edit-tabs';
    editBtn.textContent = '✎';
    editBtn.title = 'Edit Tabs';
    editBtn.style.cssText = 'position: absolute; top: 4px; right: 30px; background: rgba(0,0,0,0.6); color: #fff; border-radius: 12px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 9999; pointer-events: auto; font-size: 14px;';
    editBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.editTabs(component);
    };
    container.appendChild(editBtn);
    
    const delBtn = document.createElement('span');
    delBtn.className = 'rb-del';
    delBtn.innerHTML = '×';
    delBtn.title = 'Delete';
    delBtn.style.cssText = 'position: absolute; top: 4px; right: 4px; background: rgba(220,53,69,0.8); color: #fff; border-radius: 12px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 9999; pointer-events: auto; font-size: 16px; font-weight: bold;';
    delBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.deleteComponent(component.id);
    };
    container.appendChild(delBtn);
    
    this.setupComponentDrag(container, component);
    
    return container;
  }

  renderSection(component) {
    const container = document.createElement('div');
    container.className = 'pf-section-container pf-interactive';
    container.dataset.componentId = component.id;
    container.draggable = true;
    container.style.position = 'relative'; // Needed for absolute positioning of buttons
    
    const section = document.createElement('div');
    section.className = 'pf-section';
    
    const body = document.createElement('div');
    body.className = 'pf-section-body';
    
    const columns = component.config?.columns || [
      { id: 'col1', width: '50%' },
      { id: 'col2', width: '50%' }
    ];
    
    console.log('[Native Builder] renderSection - columns:', columns, 'component.config:', component.config);
    
    columns.forEach((col, index) => {
      const column = document.createElement('div');
      column.className = 'pf-section-column';
      column.setAttribute('data-role', 'section-column');
      column.dataset.columnId = col.id;
      column.dataset.componentId = component.id;
      if (col.width) {
        column.style.flex = `0 0 ${col.width}`;
        column.style.width = col.width;
      }
      
      // Make column droppable
      column.style.minHeight = '100px';
      
      // Render children for this column
      if (component.children) {
        const columnChildren = component.children.filter(child => child.columnId === col.id);
        console.log(`[Native Builder] Rendering ${columnChildren.length} children for column ${col.id}`, columnChildren);
        columnChildren.forEach(child => {
          const rendered = this.renderComponent(child);
          if (rendered) {
            column.appendChild(rendered);
          } else {
            console.warn('[Native Builder] renderComponent returned null for child', child);
          }
        });
      } else {
        console.log(`[Native Builder] No children array for section component ${component.id}`);
      }
      
      body.appendChild(column);
    });
    
    section.appendChild(body);
    container.appendChild(section);
    
    // Edit and delete buttons
    const editBtn = document.createElement('span');
    editBtn.className = 'rb-edit-section';
    editBtn.textContent = '✎';
    editBtn.title = 'Edit Section';
    // Don't set display inline - let CSS handle hover visibility
    editBtn.style.cssText = 'position: absolute; top: 4px; right: 30px; background: rgba(0,0,0,0.6); color: #fff; border-radius: 12px; width: 22px; height: 22px; align-items: center; justify-content: center; cursor: pointer; z-index: 9999; pointer-events: auto; font-size: 14px;';
    editBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.editSection(component);
    };
    container.appendChild(editBtn);
    
    const delBtn = document.createElement('span');
    delBtn.className = 'rb-del';
    delBtn.innerHTML = '×';
    delBtn.title = 'Delete';
    delBtn.style.cssText = 'position: absolute; top: 4px; right: 4px; background: rgba(220,53,69,0.8); color: #fff; border-radius: 12px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 9999; pointer-events: auto; font-size: 16px; font-weight: bold;';
    delBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.deleteComponent(component.id);
    };
    container.appendChild(delBtn);
    
    this.setupComponentDrag(container, component);
    
    return container;
  }

  setupComponentDrag(element, component) {
    element.addEventListener('dragstart', (e) => {
      // Check if the drag actually started on this element or a child
      // If a child field/partial started the drag, don't handle it here
      const actualTarget = e.target;
      const actualComponentId = actualTarget.closest('[data-component-id]')?.dataset?.componentId;
      
      // Only handle if the drag started on this element or a direct child that doesn't have its own componentId
      // If actualComponentId exists and doesn't match this component's ID, it means a child component started the drag
      if (actualComponentId && actualComponentId !== component.id) {
        console.log('[Native Builder] Drag started on child component, ignoring parent drag handler', {
          parentId: component.id,
          parentType: component.type,
          childId: actualComponentId,
          actualTarget
        });
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      
      this.isDragging = true;
      this.dragPayload = { type: 'move', componentId: component.id, componentType: component.type };
      e.dataTransfer.effectAllowed = 'move';
      element.style.opacity = '0.5';
      console.log('[Native Builder] Drag started', { componentId: component.id, componentType: component.type, element, actualTarget });
    });
    
    element.addEventListener('dragend', () => {
      this.isDragging = false;
      this.dragPayload = null;
      element.style.opacity = '1';
    });
  }

  switchTab(componentId, tabId) {
    const component = this.findComponentById(componentId);
    if (component && component.config) {
      component.config.activeTabId = tabId;
      this.render();
    }
  }

  deleteComponent(id) {
    const remove = (components) => {
      const index = components.findIndex(c => c.id === id);
      if (index !== -1) {
        components.splice(index, 1);
        return true;
      }
      for (const comp of components) {
        if (comp.children && remove(comp.children)) {
          return true;
        }
      }
      return false;
    };
    
    if (remove(this.components)) {
      this.render();
    }
  }

  editTabs(component) {
    console.log('[Native Builder] Edit tabs:', component);
    
    // Create an adapter object that mimics GrapesJS component interface
    const adapter = this.createComponentAdapter(component);
    
    // Call the modal handler if available
    if (window.openTabsConfigModal) {
      window.openTabsConfigModal(adapter);
    } else if (this.modalHandlers) {
      // Try to call directly if modal handlers are loaded
      this.modalHandlers.setupTabsConfigModal();
      if (window.openTabsConfigModal) {
        window.openTabsConfigModal(adapter);
      }
    } else {
      console.warn('[Native Builder] Tabs config modal not available');
    }
  }

  editSection(component) {
    console.log('[Native Builder] Edit section:', component);
    
    // Create an adapter object that mimics GrapesJS component interface
    const adapter = this.createComponentAdapter(component);
    if (!adapter) {
      console.error('[Native Builder] Failed to create adapter for component', component.id);
      return;
    }
    
    // Call the modal handler if available
    if (window.openSectionConfigModal) {
      window.openSectionConfigModal(adapter);
    } else if (this.modalHandlers) {
      // Try to call directly if modal handlers are loaded
      this.modalHandlers.setupSectionConfigModal();
      if (window.openSectionConfigModal) {
        window.openSectionConfigModal(adapter);
      }
    } else {
      console.warn('[Native Builder] Section config modal not available');
    }
  }

  createComponentAdapter(component) {
    // Create an adapter that mimics GrapesJS component interface
    // IMPORTANT: Find the actual component object from this.components to ensure we're modifying the right reference
    const actualComponent = this.findComponentById(component.id);
    if (!actualComponent) {
      console.error('[Native Builder] Component not found for adapter', component.id, 'Available components:', this.components.map(c => c.id));
      return null;
    }
    console.log('[Native Builder] Creating adapter for component', actualComponent.id, 'type:', actualComponent.type, 'config:', actualComponent.config);
    const element = document.querySelector(`[data-component-id="${actualComponent.id}"]`);
    const self = this;
    
    return {
      getAttributes: () => {
        // Return attributes from component config
        const attrs = {};
        if (actualComponent.type === 'tabs' && actualComponent.config?.tabs) {
          attrs['tabs-json'] = JSON.stringify(actualComponent.config.tabs);
          attrs['active-tab-id'] = actualComponent.config.activeTabId || actualComponent.config.tabs[0]?.id;
        }
        if (actualComponent.type === 'section' && actualComponent.config?.columns) {
          attrs['columns-json'] = JSON.stringify(actualComponent.config.columns);
        }
        return attrs;
      },
      addAttributes: (newAttrs) => {
        console.log('[Native Builder] addAttributes called', { 
          newAttrs, 
          componentType: actualComponent.type, 
          componentId: actualComponent.id,
          hasColumnsJson: !!newAttrs['columns-json'],
          hasTabsJson: !!newAttrs['tabs-json'],
          hasUpdatingSection: !!newAttrs['_updating-section']
        });
        
        // Ignore _updating-section flag first (GrapesJS-specific)
        if (newAttrs['_updating-section'] !== undefined) {
          console.log('[Native Builder] Ignoring _updating-section flag');
          return;
        }
        
        // Update component config from attributes
        if (newAttrs['tabs-json'] && actualComponent.type === 'tabs') {
          try {
            actualComponent.config = actualComponent.config || {};
            actualComponent.config.tabs = JSON.parse(newAttrs['tabs-json']);
            if (newAttrs['active-tab-id']) {
              actualComponent.config.activeTabId = newAttrs['active-tab-id'];
            }
            // Preserve children when tabs change
            // Close modal and render
            const tabsModal = document.getElementById('pf-tabs-config-modal');
            if (tabsModal) tabsModal.style.display = 'none';
            console.log('[Native Builder] Rendering after tabs update');
            self.render(); // Re-render after update
          } catch (e) {
            console.error('[Native Builder] Error parsing tabs-json:', e);
          }
        }
        if (newAttrs['columns-json'] && actualComponent.type === 'section') {
          console.log('[Native Builder] Processing columns-json update', { 
            columnsJson: newAttrs['columns-json'],
            currentColumns: actualComponent.config?.columns 
          });
          try {
            actualComponent.config = actualComponent.config || {};
            const newColumns = JSON.parse(newAttrs['columns-json']);
            console.log('[Native Builder] Updating section columns', { 
              oldColumns: actualComponent.config.columns, 
              newColumns, 
              componentId: actualComponent.id,
              oldCount: actualComponent.config.columns?.length,
              newCount: newColumns.length
            });
            
            // Preserve children when columns change - map them to new column IDs
            if (actualComponent.children) {
              const oldColumns = actualComponent.config.columns || [];
              const columnIdMap = {};
              
              // Map old column IDs to new ones by index
              oldColumns.forEach((oldCol, index) => {
                if (newColumns[index]) {
                  columnIdMap[oldCol.id] = newColumns[index].id;
                }
              });
              
              // Update children's columnId if their column was remapped
              actualComponent.children.forEach(child => {
                if (child.columnId && columnIdMap[child.columnId]) {
                  child.columnId = columnIdMap[child.columnId];
                } else if (child.columnId && !newColumns.find(c => c.id === child.columnId)) {
                  // Column was deleted, move to first column
                  child.columnId = newColumns[0]?.id;
                }
              });
            }
            
            actualComponent.config.columns = newColumns;
            console.log('[Native Builder] Updated component.config.columns', actualComponent.config.columns);
            
            // Verify the component in the array is the same reference
            const componentInArray = self.findComponentById(actualComponent.id);
            if (componentInArray !== actualComponent) {
              console.error('[Native Builder] Component reference mismatch!', {
                actualComponentId: actualComponent.id,
                arrayComponentId: componentInArray?.id,
                sameReference: componentInArray === actualComponent
              });
              // Update the component in the array directly
              if (componentInArray) {
                componentInArray.config = componentInArray.config || {};
                componentInArray.config.columns = newColumns;
              }
            } else {
              console.log('[Native Builder] Component reference verified - same object');
            }
            
            // Close modal immediately
            const modal = document.getElementById('pf-section-config-modal');
            if (modal) modal.style.display = 'none';
            
            // Render immediately - no need for GrapesJS rebuild logic
            console.log('[Native Builder] About to render, component in array has columns:', self.findComponentById(actualComponent.id)?.config?.columns?.length);
            self.render();
          } catch (e) {
            console.error('[Native Builder] Error parsing columns-json:', e);
          }
        }
      },
      getEl: () => element,
      find: (selector) => {
        // Mimic GrapesJS find() method - return array-like object with GrapesJS-like methods
        // Re-query element in case it was re-rendered
        try {
          const currentElement = document.querySelector(`[data-component-id="${actualComponent.id}"]`);
          if (!currentElement) {
            console.warn('[Native Builder] find() - element not found for component', actualComponent.id);
            return [];
          }
          const matches = currentElement.querySelectorAll(selector);
          const self = this;
          const result = Array.from(matches).map(el => ({
          getAttributes: () => {
            const attrs = {};
            Array.from(el.attributes).forEach(attr => {
              attrs[attr.name] = attr.value;
            });
            return attrs;
          },
          getAttribute: (name) => el.getAttribute(name),
          // For section modal - components() method that returns children
          components: (html) => {
            // If html is provided, it means we're setting components (GrapesJS style)
            // In native builder, we don't need to do anything here since render() handles it
            if (html !== undefined) {
              // This is called to clear/set components, but we handle it via render()
              return;
            }
            
            // Return children of this column element
            const columnId = el.getAttribute('data-column-id') || el.dataset.columnId;
            if (columnId && actualComponent.type === 'section' && actualComponent.children) {
              // Return children that belong to this column
              const columnChildren = actualComponent.children.filter(c => c.columnId === columnId);
              return {
                forEach: (callback) => {
                  columnChildren.forEach(child => {
                    // Create a mock component object for each child
                    callback({
                      toHTML: () => {
                        // Serialize child to HTML
                        if (child.type === 'field') {
                          return `<div class="record-field-placeholder" field-api-name="${child.api}" field-label="${child.label}" field-type="${child.ftype || 'text'}">${child.label}</div>`;
                        } else if (child.type === 'partial') {
                          return `<div class="record-partial-placeholder" partial-name="${child.partialName}"></div>`;
                        }
                        return '';
                      }
                    });
                  });
                }
              };
            }
            return { forEach: () => {} };
          }
          }));
          
          // Add array-like methods
          result.slice = Array.prototype.slice.bind(result);
          return result;
        } catch (e) {
          console.error('[Native Builder] Error in find()', e);
          return [];
        }
      },
      id: actualComponent.id,
      type: actualComponent.type
    };
  }

  generateId() {
    return `comp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  clear() {
    if (confirm('Clear all components?')) {
      this.components = [];
      this.render();
    }
  }

  save() {
    const html = this.serializeToHTML();
    const css = this.serializeToCSS();
    const js = this.serializeToJS();
    
    this.saveToDatabase(html, css, js);
  }

  serializeToHTML() {
    // Convert component tree to HTML
    const serialize = (components) => {
      return components.map(comp => {
        switch (comp.type) {
          case 'field':
            return `<div class="record-field-placeholder" field-api-name="${this.escapeHtml(comp.api)}" field-label="${this.escapeHtml(comp.label)}" field-type="${this.escapeHtml(comp.ftype || 'text')}">${this.escapeHtml(comp.label)}</div>`;
          case 'partial':
            return this.serializePartial(comp);
          case 'tabs':
            return this.serializeTabs(comp);
          case 'section':
            return this.serializeSection(comp);
          default:
            return '';
        }
      }).join('');
    };
    
    return serialize(this.components);
  }

  serializePartial(component) {
    // Partials need partial-name attribute for runtime rendering
    // Don't include label text - runtime will replace entire element with actual partial content
    console.log('[Native Builder] Serializing partial', { component, partialName: component.partialName });
    return `<div class="record-partial-placeholder" partial-name="${this.escapeHtml(component.partialName)}"></div>`;
  }

  serializeTabs(component) {
    const tabs = component.config?.tabs || [];
    const tabsJson = JSON.stringify(tabs);
    const activeTabId = component.config?.activeTabId || tabs[0]?.id || '';
    
    let html = `<div class="pf-tabs-container" data-comp-kind="record-tabs" tabs-json="${this.escapeHtml(tabsJson)}" active-tab-id="${this.escapeHtml(activeTabId)}">`;
    html += '<div class="pf-tabs">';
    html += '<div class="pf-tabs-header">';
    tabs.forEach(tab => {
      html += `<span class="pf-tab-btn ${tab.id === activeTabId ? 'active' : ''}" data-tab-id="${this.escapeHtml(tab.id)}">${this.escapeHtml(tab.title)}</span>`;
    });
    html += '</div>';
    html += '<div class="pf-tabs-body">';
    tabs.forEach(tab => {
      html += `<div class="pf-tab-section ${tab.id === activeTabId ? 'active' : ''}" data-role="pf-tab-section" data-tab-id="${this.escapeHtml(tab.id)}">`;
      if (component.children) {
        component.children
          .filter(child => child.tabId === tab.id)
          .forEach(child => {
            if (child.type === 'field') {
              html += `<div class="record-field-placeholder" field-api-name="${this.escapeHtml(child.api)}" field-label="${this.escapeHtml(child.label)}" field-type="${this.escapeHtml(child.ftype || 'text')}">${this.escapeHtml(child.label)}</div>`;
            } else if (child.type === 'partial') {
              html += `<div class="record-partial-placeholder" partial-name="${this.escapeHtml(child.partialName)}"></div>`;
            } else if (child.type === 'section') {
              html += this.serializeSection(child);
            }
          });
      }
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  serializeSection(component) {
    const columns = component.config?.columns || [];
    const columnsJson = JSON.stringify(columns);
    
    let html = `<div class="pf-section-container" data-comp-kind="record-section" columns-json="${this.escapeHtml(columnsJson)}">`;
    html += '<div class="pf-section">';
    html += '<div class="pf-section-body">';
    columns.forEach(col => {
      html += `<div class="pf-section-column" data-role="pf-section-column" data-column-id="${this.escapeHtml(col.id)}" style="flex: 0 0 ${this.escapeHtml(col.width || '50%')}; width: ${this.escapeHtml(col.width || '50%')};">`;
      if (component.children) {
        component.children
          .filter(child => child.columnId === col.id)
          .forEach(child => {
            if (child.type === 'field') {
              html += `<div class="record-field-placeholder" field-api-name="${this.escapeHtml(child.api)}" field-label="${this.escapeHtml(child.label)}" field-type="${this.escapeHtml(child.ftype || 'text')}">${this.escapeHtml(child.label)}</div>`;
            } else if (child.type === 'partial') {
              html += `<div class="record-partial-placeholder" partial-name="${this.escapeHtml(child.partialName)}"></div>`;
            } else if (child.type === 'tabs') {
              html += this.serializeTabs(child);
            } else if (child.type === 'section') {
              html += this.serializeSection(child);
            }
          });
      }
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  serializeToCSS() {
    // Return runtime CSS for tabs and sections
    return `
.pf-tabs-container { position: relative; }
.pf-tabs { border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
.pf-tabs-header { background: #f8f9fa; border-bottom: 1px solid #ddd; display: flex; }
.pf-tab-btn { padding: 8px 16px; cursor: pointer; border-right: 1px solid #ddd; }
.pf-tab-btn.active { background: #fff; border-bottom: 2px solid #007bff; }
.pf-tabs-body { background: #fff; padding: 16px; }
.pf-tab-section { display: none; }
.pf-tab-section.active { display: block; }
.pf-section-container { position: relative; margin-bottom: 1rem; }
.pf-section { border: 1px solid #dee2e6; border-radius: 6px; background: #fff; }
.pf-section-body { display: flex; gap: 16px; padding: 16px; }
.pf-section-column { min-height: 100px; border: 2px dashed #dee2e6; border-radius: 4px; padding: 8px; }
    `.trim();
  }

  serializeToJS() {
    // Return runtime JS for tabs - matches the structure expected by the renderer
    return `
(function() {
  function initTabs() {
    const isBuilder = document.getElementById('record-builder-canvas') || window.location.pathname.includes('/record_layouts/builder');
    if (isBuilder) return;
    
    document.querySelectorAll('.pf-tabs-container').forEach(container => {
      if (container.__pf_tabs_initialized) return;
      container.__pf_tabs_initialized = true;
      
      const wrapper = container.querySelector('.pf-tabs');
      const header = wrapper?.querySelector('.pf-tabs-header');
      if (!header) return;
      
      header.querySelectorAll('.pf-tab-btn').forEach(btn => {
        if (btn.__pf_runtime_click) return;
        btn.__pf_runtime_click = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const tabId = btn.getAttribute('data-tab-id');
          // Remove active from all buttons
          header.querySelectorAll('.pf-tab-btn').forEach(b => b.classList.remove('active'));
          // Remove active from all sections
          wrapper.querySelectorAll('[data-role="pf-tab-section"]').forEach(s => {
            if (s.classList.contains('pf-tab-section')) {
              s.classList.remove('active');
            }
          });
          // Add active to clicked button
          btn.classList.add('active');
          // Add active to corresponding section
          const section = wrapper.querySelector(\`[data-role="pf-tab-section"][data-tab-id="\${tabId}"]\`);
          if (section && section.classList.contains('pf-tab-section')) {
            section.classList.add('active');
          }
        };
        btn.addEventListener('click', btn.__pf_runtime_click);
      });
      
      // Set first tab as active if none is active
      if (!header.querySelector('.pf-tab-btn.active') && header.querySelector('.pf-tab-btn')) {
        const first = header.querySelector('.pf-tab-btn');
        const firstTabId = first.getAttribute('data-tab-id');
        first.classList.add('active');
        const firstSection = wrapper.querySelector(\`[data-role="pf-tab-section"][data-tab-id="\${firstTabId}"]\`);
        if (firstSection && firstSection.classList.contains('pf-tab-section')) {
          firstSection.classList.add('active');
        }
      }
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTabs);
  } else {
    initTabs();
  }
  
  if (typeof Turbo !== 'undefined') {
    document.addEventListener('turbo:load', initTabs);
    document.addEventListener('turbo:frame-load', initTabs);
  }
})();
    `.trim();
  }

  saveToDatabase(html, css, js) {
    console.log('[Native Builder] Saving layout...', { htmlLength: html.length, cssLength: css.length, jsLength: js.length });
    
    const metadataScript = document.getElementById('record-layout-metadata');
    if (!metadataScript) {
      console.error('[Native Builder] Missing metadata script');
      Utils.showSaveMessage('Save failed: Missing metadata', 'error');
      return;
    }
    
    const meta = JSON.parse(metadataScript.textContent);
    const orgId = meta.organization_id;
    const tableType = meta.table_type;
    const tableId = meta.table_id;
    
    if (!orgId || !tableType) {
      console.error('[Native Builder] Missing orgId or tableType', { orgId, tableType });
      Utils.showSaveMessage('Save failed: Missing organization or table type', 'error');
      return;
    }
    
    let url = `/organizations/${orgId}/record_layout?table_type=${encodeURIComponent(tableType)}`;
    if (tableId) {
      url += `&table_id=${encodeURIComponent(tableId)}`;
    }
    url += '&format=json';
    
    console.log('[Native Builder] Saving to:', url);
    
    fetch(url, {
      method: 'PATCH',
      headers: {
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        record_layout: {
          layout_html: html,
          layout_css: css,
          layout_js: js
        }
      })
    })
    .then(response => {
      console.log('[Native Builder] Save response status:', response.status);
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.errors || 'Server error');
        });
      }
      return response.json();
    })
    .then(data => {
      console.log('[Native Builder] Save response:', data);
      if (data.success) {
        // Update metadata with new layout
        if (this.metadata) {
          this.metadata.layout_html = html;
          this.metadata.layout_css = css;
        }
        Utils.showSaveMessage('Layout saved successfully!', 'success');
      } else {
        Utils.showSaveMessage('Save failed: ' + (data.errors || 'Unknown error'), 'error');
      }
    })
    .catch(error => {
      console.error('[Native Builder] Save error:', error);
      Utils.showSaveMessage('Save failed: ' + error.message, 'error');
    });
  }

  loadExistingLayout() {
    if (!this.metadata || !this.metadata.layout_html) {
      console.log('[Native Builder] No saved layout to load');
      return;
    }
    
    try {
      const html = this.metadata.layout_html;
      console.log('[Native Builder] Loading saved layout, HTML length:', html.length);
      
      // Parse HTML into component tree
      this.components = this.parseHTMLToComponents(html);
      
      // Render the loaded components
      this.render();
      
      console.log('[Native Builder] Loaded', this.components.length, 'components from saved layout');
    } catch (error) {
      console.error('[Native Builder] Error loading layout:', error);
    }
  }

  parseHTMLToComponents(html) {
    const components = [];
    
    try {
      // Create a temporary container to parse HTML
      const temp = document.createElement('div');
      temp.innerHTML = html;
      
      // Parse each top-level element
      Array.from(temp.children).forEach(element => {
        const component = this.parseElementToComponent(element);
        if (component) {
          components.push(component);
        }
      });
    } catch (error) {
      console.error('[Native Builder] Error parsing HTML:', error);
    }
    
    return components;
  }

  parseElementToComponent(element) {
    // Check for tabs
    if (element.classList.contains('pf-tabs-container') || element.querySelector('.pf-tabs')) {
      return this.parseTabsComponent(element);
    }
    
    // Check for section
    if (element.classList.contains('pf-section-container') || element.querySelector('.pf-section')) {
      return this.parseSectionComponent(element);
    }
    
    // Check for field
    if (element.classList.contains('record-field-placeholder') || element.hasAttribute('field-api-name') || element.hasAttribute('data-field-api')) {
      return this.parseFieldComponent(element);
    }
    
    // Check for partial
    if (element.classList.contains('record-partial-placeholder') || element.hasAttribute('partial-name')) {
      return this.parsePartialComponent(element);
    }
    
    return null;
  }

  parseTabsComponent(element) {
    const container = element.classList.contains('pf-tabs-container') ? element : element.querySelector('.pf-tabs-container') || element;
    const tabsJson = container.getAttribute('tabs-json');
    const activeTabId = container.getAttribute('active-tab-id') || '';
    
    let tabs = [];
    if (tabsJson) {
      try {
        // Decode HTML entities
        const textarea = document.createElement('textarea');
        textarea.innerHTML = tabsJson;
        tabs = JSON.parse(textarea.value);
      } catch(e) {
        console.warn('[Native Builder] Error parsing tabs-json:', e);
        tabs = [{ id: 'tab1', title: 'Tab 1' }];
      }
    } else {
      tabs = [{ id: 'tab1', title: 'Tab 1' }];
    }
    
    const component = {
      id: this.generateId(),
      type: 'tabs',
      config: { tabs, activeTabId },
      children: []
    };
    
    // Parse children from tab sections
    const tabSections = container.querySelectorAll('.pf-tab-section');
    tabSections.forEach(section => {
      const tabId = section.getAttribute('data-tab-id');
      if (!tabId) return;
      
      Array.from(section.children).forEach(child => {
        const childComp = this.parseElementToComponent(child);
        if (childComp) {
          childComp.tabId = tabId;
          component.children.push(childComp);
        }
      });
    });
    
    return component;
  }

  parseSectionComponent(element) {
    const container = element.classList.contains('pf-section-container') ? element : element.querySelector('.pf-section-container') || element;
    const columnsJson = container.getAttribute('columns-json');
    
    let columns = [];
    if (columnsJson) {
      try {
        // Decode HTML entities
        const textarea = document.createElement('textarea');
        textarea.innerHTML = columnsJson;
        columns = JSON.parse(textarea.value);
      } catch(e) {
        console.warn('[Native Builder] Error parsing columns-json:', e);
        columns = [{ id: 'col1', width: '50%' }, { id: 'col2', width: '50%' }];
      }
    } else {
      columns = [{ id: 'col1', width: '50%' }, { id: 'col2', width: '50%' }];
    }
    
    const component = {
      id: this.generateId(),
      type: 'section',
      config: { columns },
      children: []
    };
    
    // Parse children from section columns
    const sectionColumns = container.querySelectorAll('.pf-section-column');
    sectionColumns.forEach(column => {
      const columnId = column.getAttribute('data-column-id');
      if (!columnId) return;
      
      Array.from(column.children).forEach(child => {
        const childComp = this.parseElementToComponent(child);
        if (childComp) {
          childComp.columnId = columnId;
          component.children.push(childComp);
        }
      });
    });
    
    return component;
  }

  parseFieldComponent(element) {
    const api = element.getAttribute('field-api-name') || element.getAttribute('data-field-api');
    const label = element.getAttribute('field-label') || element.getAttribute('data-field-label') || api || 'Field';
    const ftype = element.getAttribute('field-type') || element.getAttribute('data-field-type') || 'text';
    
    return {
      id: this.generateId(),
      type: 'field',
      api: api || '',
      label: label,
      ftype: ftype
    };
  }

  parsePartialComponent(element) {
    const partialName = element.getAttribute('partial-name');
    const label = element.textContent.trim() || partialName || 'Partial';
    
    return {
      id: this.generateId(),
      type: 'partial',
      partialName: partialName || '',
      label: label
    };
  }
}

// Initialize the native builder
let nativeBuilderInstance = null;
let nativeBuilderInitialized = false;

function initNativeRecordBuilder() {
  // Early exit check - only initialize on the builder page
  // Path can be /record_layouts/builder or /organizations/:id/record_layout/builder
  const pathname = window.location.pathname;
  if (!pathname.includes('/record_layout') || !pathname.includes('/builder')) {
    return; // Exit early, no logging to reduce overhead
  }
  
  console.log('[Native Builder] initNativeRecordBuilder called', { pathname });
  
  const canvasEl = document.getElementById('record-builder-canvas');
  if (!canvasEl) {
    console.warn('[Native Builder] Canvas element #record-builder-canvas not found');
    return;
  }
  
  console.log('[Native Builder] Canvas found, proceeding with initialization');
  
  if (!document.getElementById('record-layout-metadata')) {
    console.warn('[Native Builder] Metadata element not found');
    return;
  }
  
  if (nativeBuilderInitialized) {
    console.log('[Native Builder] Already initialized, skipping');
    return;
  }
  
  console.log('[Native Builder] Creating new instance...');
  try {
    nativeBuilderInitialized = true;
    nativeBuilderInstance = new NativeRecordBuilder();
    nativeBuilderInstance.init();
    // Expose globally for compatibility with view files
    window.recordLayoutBuilderInstance = nativeBuilderInstance;
    console.log('[Native Builder] Initialization complete');
  } catch (error) {
    console.error('[Native Builder] Error during initialization:', error);
    nativeBuilderInitialized = false;
    nativeBuilderInstance = null;
  }
}

function destroyNativeRecordBuilder() {
  console.log('[Native Builder] Destroying instance');
  if (nativeBuilderInstance) {
    nativeBuilderInstance = null;
  }
  nativeBuilderInitialized = false;
}

// Event listeners
document.addEventListener('turbo:before-cache', destroyNativeRecordBuilder);
document.addEventListener('turbo:load', function() {
  // Early exit if not on builder page - avoid unnecessary work
  if (!window.location.pathname.includes('/record_layout') || !window.location.pathname.includes('/builder')) {
    return;
  }
  destroyNativeRecordBuilder();
  setTimeout(initNativeRecordBuilder, 100); // Small delay to ensure DOM is ready
});
document.addEventListener('DOMContentLoaded', function() {
  console.log('[Native Builder] DOMContentLoaded event');
  initNativeRecordBuilder();
});

// Also try immediate initialization if DOM is already ready
if (document.readyState === 'loading') {
  console.log('[Native Builder] DOM still loading, will wait for DOMContentLoaded');
} else {
  console.log('[Native Builder] DOM already ready, initializing immediately');
  setTimeout(initNativeRecordBuilder, 100);
}

