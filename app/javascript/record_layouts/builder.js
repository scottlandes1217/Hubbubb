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
      this.setupComponentLocking();
      
      console.log('[PF] Editor setup completed');
    } catch (error) {
      console.error('[PF] Error in setupEditor:', error);
    }
  }

  setupComponentLocking() {
    // Lock inner components whenever a component is added or updated
    this.editor.on('component:add', (component) => {
      // Only lock inner components of record-field and record-partial
      const attrs = component.getAttributes ? component.getAttributes() : {};
      if (attrs['field-api-name'] || attrs['partial-name']) {
        // Small delay to ensure children are added first
        setTimeout(() => {
          this.addDeleteButton(component);
          this.lockInnerComponents(component);
        }, 10);
      } else if (attrs['data-comp-kind'] === 'record-tabs' || component.get('type') === 'record-tabs') {
        // Lock tabs inner components (but allow tab buttons to be draggable for reordering)
        setTimeout(() => {
          this.lockTabsInnerComponents(component);
        }, 50);
      }
    });

    // Also lock when components are updated
    this.editor.on('component:update', (component) => {
      const attrs = component.getAttributes ? component.getAttributes() : {};
      if (attrs['field-api-name'] || attrs['partial-name']) {
        setTimeout(() => {
          this.addDeleteButton(component);
          this.lockInnerComponents(component);
        }, 10);
      } else if (attrs['data-comp-kind'] === 'record-tabs' || component.get('type') === 'record-tabs') {
        // Lock tabs inner components
        setTimeout(() => {
          this.lockTabsInnerComponents(component);
        }, 50);
      }
    });
  }

  lockTabsInnerComponents(comp) {
    try {
      const el = comp.getEl();
      if (!el) return;
      
      // First, ensure the main tabs container is draggable (so the whole component can be moved)
      comp.set({
        draggable: true,
        selectable: true,
        hoverable: true,
        highlightable: true
      });
      
      // Find the tabs wrapper
      const tabsWrapper = el.querySelector('.pf-tabs');
      if (!tabsWrapper) return;
      
      // Find all inner components using GrapesJS
      // We need to find the component by traversing from the main component
      // The tabs wrapper is a child of the main component
      let tabsWrapperComp = null;
      const compChildren = comp.components().models || [];
      for (const child of compChildren) {
        const childEl = child.getEl();
        if (childEl && childEl.classList.contains('pf-tabs')) {
          tabsWrapperComp = child;
          break;
        }
      }
      
      if (!tabsWrapperComp) {
        // Fallback: try to find by selector
        const found = comp.find('.pf-tabs');
        tabsWrapperComp = found && found.length > 0 ? found[0] : null;
      }
      
      if (!tabsWrapperComp) return;
      
      // Lock the tabs wrapper itself - it should not be draggable separately
      tabsWrapperComp.set({
        selectable: false,
        hoverable: false,
        draggable: false, // Prevent dragging the wrapper separately
        droppable: false,
        editable: false,
        copyable: false,
        highlightable: false
      });
      
      // Lock header and body
      const header = tabsWrapperComp.find('.pf-tabs-header')[0];
      const body = tabsWrapperComp.find('.pf-tabs-body')[0];
      
      if (header) {
        header.set({
          selectable: false,
          hoverable: false,
          draggable: false, // Header should not be draggable
          droppable: false,
          editable: false,
          copyable: false,
          highlightable: false
        });
        
        // Lock all children of header EXCEPT tab buttons (tab buttons should be draggable for reordering)
        const headerChildren = header.components().models || [];
        headerChildren.forEach(ch => {
          const chAttrs = ch.getAttributes ? ch.getAttributes() : {};
          const isTabButton = chAttrs.class && chAttrs.class.includes('pf-tab-btn');
          
          if (!isTabButton) {
            // Lock non-tab-button children
            ch.set({
              selectable: false,
              hoverable: false,
              draggable: false,
              droppable: false,
              editable: false,
              copyable: false,
              highlightable: false
            });
          } else {
            // Tab buttons should NOT be draggable in GrapesJS (to prevent dragging them out)
            // Tab reordering will need to be implemented via custom drag handlers if needed
            ch.set({
              selectable: false,
              hoverable: true, // Allow hover for visual feedback
              draggable: false, // Prevent dragging tab buttons out of header
              droppable: false,
              editable: false,
              copyable: false,
              highlightable: false
            });
          }
        });
      }
      
      if (body) {
        body.set({
          selectable: false,
          hoverable: false,
          draggable: false, // Body should not be draggable
          droppable: false,
          editable: false,
          copyable: false,
          highlightable: false
        });
        
        // Tab sections should not be draggable, but components inside them should be
        const bodyChildren = body.components().models || [];
        bodyChildren.forEach(ch => {
          const chAttrs = ch.getAttributes ? ch.getAttributes() : {};
          const isTabSection = chAttrs.class && chAttrs.class.includes('pf-tab-section');
          
          if (isTabSection) {
            // Tab sections should not be draggable/selectable
            ch.set({
              selectable: false,
              hoverable: false,
              draggable: false,
              droppable: true, // But they should accept drops
              editable: false,
              copyable: false,
              highlightable: false
            });
          }
        });
      }
      
      // Lock delete and edit buttons
      const deleteBtn = tabsWrapperComp.find('.rb-del')[0];
      const editBtn = tabsWrapperComp.find('.rb-edit-tabs')[0];
      
      if (deleteBtn) {
        deleteBtn.set({
          selectable: false,
          hoverable: false,
          draggable: false,
          droppable: false,
          editable: false,
          copyable: false,
          highlightable: false
        });
      }
      
      if (editBtn) {
        editBtn.set({
          selectable: false,
          hoverable: false,
          draggable: false,
          droppable: false,
          editable: false,
          copyable: false,
          highlightable: false
        });
      }
      
    } catch (error) {
      console.warn('[PF] Error locking tabs inner components:', error);
    }
  }

  addSaveCommand() {
    this.editor.Commands.add('save-record-layout', {
      run: (editor, sender, options) => {
        // Get HTML with all components properly serialized
        let html = editor.getHtml();
        let css = editor.getCss();
        let js = editor.getJs() || '';
        
        // Debug: Log what we're getting
        console.log('[PF] HTML before sanitization length:', html.length);
        
        // Check if tabs are in the HTML
        if (html.includes('pf-tabs')) {
          console.log('[PF] Tabs component found in HTML');
          
          // Check for tab sections
          if (html.includes('pf-tab-section')) {
            console.log('[PF] Tab sections found in HTML');
          } else {
            console.warn('[PF] Tab sections NOT found in HTML!');
          }
        } else {
          console.warn('[PF] Tabs component NOT found in HTML!');
        }
        
        // Check for record-field and record-partial components
        const fieldCount = (html.match(/record-field/g) || []).length;
        const partialCount = (html.match(/record-partial/g) || []).length;
        console.log('[PF] Component counts:', { fields: fieldCount, partials: partialCount });
        
        // Get runtime tabs JavaScript and CSS from the TabsComponent
        if (window.TabsComponent && window.TabsComponent.getRuntimeCode) {
          const runtimeCode = window.TabsComponent.getRuntimeCode();
          console.log('[PF] Got runtime code from TabsComponent, length:', runtimeCode.length);
          console.log('[PF] Runtime code preview:', runtimeCode.substring(0, 500));
          
          // Split into JS and CSS parts based on the "// Runtime tabs CSS" marker
          const parts = runtimeCode.split('// Runtime tabs CSS');
          let jsCode = '';
          let cssCode = '';
          
          if (parts.length > 0) {
            // Get JS part - remove comment markers
            jsCode = parts[0]
              .replace('/* RUNTIME: Tabs JavaScript and CSS */', '')
              .replace('// Runtime tabs functionality - ONLY runs on rendered pages, not in builder', '')
              .replace('// Runtime tabs functionality', '')
              .trim();
            console.log('[PF] Extracted JS, length:', jsCode.length);
            console.log('[PF] JS preview:', jsCode.substring(0, 200));
            if (jsCode) {
              js = js + '\n' + jsCode;
            }
          } else {
            console.warn('[PF] Could not find JS part in runtime content');
          }
          
          if (parts.length > 1) {
            cssCode = parts[1].trim();
            console.log('[PF] Extracted CSS, length:', cssCode.length);
            if (cssCode) {
              css = css + '\n' + cssCode;
            }
          } else {
            console.warn('[PF] Could not find CSS part in runtime content');
          }
        } else {
          console.warn('[PF] TabsComponent.getRuntimeCode not available');
        }
        
        const sanitizedHtml = this.sanitizeLayoutHtml(html);
        console.log('[PF] HTML after sanitization length:', sanitizedHtml.length);
        this.saveLayoutToDatabase(sanitizedHtml, css, js);
      }
    });
  }

  saveLayoutToDatabase(html, css, js = '') {
    try {
      const metadataScript = document.getElementById('record-layout-metadata');
      if (!metadataScript) {
        this.showSaveMessage('Save failed: Missing metadata', 'error');
        return;
      }
      
      const meta = JSON.parse(metadataScript.textContent);
      const orgId = meta.organization_id;
      const tableType = meta.table_type;
      const tableId = meta.table_id;
      
      if (!orgId || !tableType) {
        this.showSaveMessage('Save failed: Missing organization or table type', 'error');
        return;
      }
      
      // Build URL with query parameters
      let url = `/organizations/${orgId}/record_layout?table_type=${encodeURIComponent(tableType)}`;
      if (tableId) {
        url += `&table_id=${encodeURIComponent(tableId)}`;
      }
      url += '&format=json';
      
      console.log('[PF] Saving layout to:', url);
      console.log('[PF] HTML length:', html.length);
      console.log('[PF] CSS length:', css.length);
      console.log('[PF] JS length:', js.length);
      
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
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.errors || 'Server error');
          });
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          this.showSaveMessage('Layout saved successfully!', 'success');
          console.log('[PF] Layout saved successfully');
        } else {
          this.showSaveMessage('Save failed: ' + (data.errors || 'Unknown error'), 'error');
        }
      })
      .catch(error => {
        console.error('[PF] Save error:', error);
        this.showSaveMessage('Save failed: ' + error.message, 'error');
      });
    } catch (error) {
      console.error('[PF] Save error:', error);
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
          selectable: true,
          hoverable: true,
          highlightable: true,
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
          selectable: true,
          hoverable: true,
          highlightable: true,
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

  lockInnerComponents(comp) {
    try {
      const stack = Array.isArray(comp) ? comp.slice() : [comp];
      while (stack.length) {
        const node = stack.pop();
        if (!node || !node.components) continue;
        const children = node.components().models || [];
        children.forEach(ch => {
          // Don't lock the delete button - it needs to be clickable
          const attrs = ch.getAttributes ? ch.getAttributes() : {};
          const isDeleteButton = attrs.class && attrs.class.includes('rb-del');
          
          if (!isDeleteButton) {
            // Lock all inner components to prevent individual selection/editing
            ch.set({ 
              selectable: false, 
              hoverable: false, 
              draggable: false, 
              droppable: false, 
              editable: false, 
              copyable: false, 
              highlightable: false, 
              badgable: false, 
              layerable: false 
            });
          } else {
            // Ensure delete button is clickable and visible
            ch.set({
              selectable: false,
              hoverable: false,
              draggable: false,
              droppable: false,
              editable: false,
              copyable: false,
              highlightable: false,
              badgable: false,
              layerable: false,
              // But keep it clickable via pointer events
              pointerEvents: 'auto'
            });
          }
          
          if (ch.components && ch.components().length) {
            stack.push(ch);
          }
        });
      }
    } catch (error) {
      console.warn('[PF] Error locking inner components:', error);
    }
  }

  addDeleteButton(comp) {
    try {
      // Wait for component to be rendered
      const addButton = () => {
        const el = comp.getEl();
        if (!el) {
          // Retry if element not ready
          setTimeout(addButton, 50);
          return;
        }
        
        // Check if delete button already exists
        if (el.querySelector('.rb-del')) return;
        
        // Create delete button as a direct child of the component
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'rb-del';
        deleteBtn.setAttribute('title', 'Delete');
        deleteBtn.setAttribute('data-role', 'rb-del');
        deleteBtn.setAttribute('aria-label', 'Delete');
        deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M135.2 17.7C140.6 7.2 151.7 0 164 0h120c12.3 0 23.4 7.2 28.8 17.7L328 32H432c8.8 0 16 7.2 16 16s-7.2 16-16 16H16C7.2 64 0 56.8 0 48S7.2 32 16 32H120l15.2-14.3zM32 96H416l-21.2 371.6c-1.8 31.3-27.7 56.4-59.1 56.4H112.3c-31.4 0-57.3-25.1-59.1-56.4L32 96zm112 80c-8.8 0-16 7.2-16 16V416c0 8.8 7.2 16 16 16s16-7.2 16-16V192c0-8.8-7.2-16-16-16zm80 0c-8.8 0-16 7.2-16 16V416c0 8.8 7.2 16 16 16s16-7.2 16-16V192c0-8.8-7.2-16-16-16zm80 0c-8.8 0-16 7.2-16 16V416c0 8.8 7.2 16 16 16s16-7.2 16-16V192c0-8.8-7.2-16-16-16z"/></svg>';
        deleteBtn.style.cssText = 'position: absolute; top: 4px; right: 6px; background: rgba(0,0,0,0.7); color: #fff; border-radius: 12px; width: 22px; height: 22px; display: none; align-items: center; justify-content: center; text-align: center; font-size: 12px; cursor: pointer; z-index: 9999; pointer-events: auto;';
        
        // Add click handler - ensure it works for both new and loaded components
        deleteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          try {
            // Try multiple ways to remove the component
            if (comp && typeof comp.remove === 'function') {
              comp.remove();
            } else if (comp && comp.model && typeof comp.model.remove === 'function') {
              comp.model.remove();
            } else {
              // Fallback: get view and call onDelete
              const editor = window.recordLayoutBuilderInstance?.editor || window.grapesjs;
              if (editor && editor.Components) {
                const view = editor.Components.getView(comp);
                if (view && typeof view.onDelete === 'function') {
                  view.onDelete(e);
                }
              }
            }
          } catch (err) {
            console.error('[PF] Error removing component:', err);
          }
        });
        
        // Insert as first child so it's a direct child of the container
        if (el.firstChild) {
          el.insertBefore(deleteBtn, el.firstChild);
        } else {
          el.appendChild(deleteBtn);
        }
        
        // Make sure the component element has position relative
        if (window.getComputedStyle(el).position === 'static') {
          el.style.position = 'relative';
        }
      };
      
      // Try immediately, or wait a bit for rendering
      if (comp.getEl()) {
        addButton();
      } else {
        setTimeout(addButton, 10);
      }
    } catch (error) {
      console.warn('[PF] Error adding delete button:', error);
    }
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
        
        // Lock inner components of all existing fields and partials, and rebuild tabs
        setTimeout(() => {
          try {
            const root = this.editor.DomComponents.getWrapper();
            const fields = root.find('[field-api-name]');
            const partials = root.find('[partial-name]');
            const tabs = root.find('[data-comp-kind="record-tabs"]');
            
            // Process fields and partials first
            // Use a longer timeout to ensure all components are fully loaded, especially those inside tabs
            setTimeout(() => {
              fields.forEach(field => {
                // Re-check if delete button exists and is working
                const el = field.getEl();
                if (el) {
                  const existingBtn = el.querySelector('.rb-del');
                  if (existingBtn) {
                    // Button exists, but make sure click handler works
                    // Remove old handler and re-add
                    const newBtn = existingBtn.cloneNode(true);
                    existingBtn.parentNode.replaceChild(newBtn, existingBtn);
                    newBtn.addEventListener('click', (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      field.remove();
                    });
                  } else {
                    // Button missing, add it
                    this.addDeleteButton(field);
                  }
                } else {
                  // Element not ready, add button with delay
                  setTimeout(() => this.addDeleteButton(field), 50);
                }
                this.lockInnerComponents(field);
              });
              partials.forEach(partial => {
                const el = partial.getEl();
                if (el) {
                  const existingBtn = el.querySelector('.rb-del');
                  if (existingBtn) {
                    const newBtn = existingBtn.cloneNode(true);
                    existingBtn.parentNode.replaceChild(newBtn, existingBtn);
                    newBtn.addEventListener('click', (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      partial.remove();
                    });
                  } else {
                    this.addDeleteButton(partial);
                  }
                } else {
                  setTimeout(() => this.addDeleteButton(partial), 50);
                }
                this.lockInnerComponents(partial);
              });
            }, 100);
            
            // Rebuild tabs AFTER fields/partials are processed
            // This ensures tabs are rebuilt with delete buttons after all content is loaded
            tabs.forEach(tab => {
              console.log('[PF] Rebuilding loaded tabs component:', tab);
              
              // Force a re-render first to ensure DOM is ready
              if (tab.view && tab.view.render) {
                tab.view.render();
              }
              
              // Wait a bit for the component to be fully rendered in the DOM
              setTimeout(() => {
                // Call buildWorkingTabs to rebuild the structure
                // buildWorkingTabs is defined in the tabs component partial
                if (window.TabsComponent && window.TabsComponent.buildWorkingTabs) {
                  console.log('[PF] Calling buildWorkingTabs for loaded tab');
                  window.TabsComponent.buildWorkingTabs(tab);
                } else if (typeof buildWorkingTabs === 'function') {
                  buildWorkingTabs(tab);
                } else if (window.buildWorkingTabs) {
                  window.buildWorkingTabs(tab);
                } else {
                  console.warn('[PF] buildWorkingTabs function not found');
                }
                // Also lock inner components
                this.lockTabsInnerComponents(tab);
                
                // Double-check delete button was added - wait longer if fields are present
                // Fields might be processed after tabs, so we need to check again
                const checkDeleteButton = () => {
                  const compEl = tab.getEl();
                  console.log('[PF] Checking delete button for loaded tab:', { compEl, tab });
                  if (compEl) {
                    const existingBtn = compEl.querySelector('.rb-del');
                    console.log('[PF] Existing delete button:', existingBtn);
                    if (!existingBtn) {
                      console.log('[PF] Delete button missing, adding manually');
                      // Manually add delete button if it's still missing
                      const deleteBtn = document.createElement('span');
                      deleteBtn.className = 'rb-del';
                      deleteBtn.setAttribute('data-role', 'rb-del');
                      deleteBtn.setAttribute('aria-label', 'Delete');
                      deleteBtn.title = 'Delete';
                      deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M135.2 17.7C140.6 7.2 151.7 0 164 0h120c12.3 0 23.4 7.2 28.8 17.7L328 32H432c8.8 0 16 7.2 16 16s-7.2 16-16 16H16C7.2 64 0 56.8 0 48S7.2 32 16 32H120l15.2-14.3zM32 96H416l-21.2 371.6c-1.8 31.3-27.7 56.4-59.1 56.4H112.3c-31.4 0-57.3-25.1-59.1-56.4L32 96zm112 80c-8.8 0-16 7.2-16 16V416c0 8.8 7.2 16 16 16s16-7.2 16-16V192c0-8.8-7.2-16-16-16zm80 0c-8.8 0-16 7.2-16 16V416c0 8.8 7.2 16 16 16s16-7.2 16-16V192c0-8.8-7.2-16-16-16zm80 0c-8.8 0-16 7.2-16 16V416c0 8.8 7.2 16 16 16s16-7.2 16-16V192c0-8.8-7.2-16-16-16z"/></svg>';
                      deleteBtn.style.cssText = 'position: absolute; top: 4px; right: 6px; background: rgba(0,0,0,0.7); color: #fff; border-radius: 12px; width: 22px; height: 22px; display: none; align-items: center; justify-content: center; text-align: center; font-size: 12px; cursor: pointer; z-index: 9999; pointer-events: auto;';
                      // Add click handler that calls the view's onDelete method
                      const deleteHandler = (e) => {
                        console.log('[PF] Delete button clicked (manual)!', { tab, e });
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          // tab is the model, so try to get the view from the editor
                          const editor = window.recordLayoutBuilderInstance?.editor;
                          if (editor) {
                            // Get the view from the component manager
                            const view = editor.Components.getView(tab);
                            console.log('[PF] View found (manual):', view);
                            if (view && typeof view.onDelete === 'function') {
                              console.log('[PF] Calling view.onDelete (manual)');
                              view.onDelete(e);
                            } else if (tab && typeof tab.remove === 'function') {
                              console.log('[PF] Calling tab.remove() directly (manual)');
                              tab.remove();
                            } else {
                              console.warn('[PF] Could not remove tabs component - view.onDelete not available (manual)', { tab, view });
                            }
                          } else {
                            // Fallback: try direct remove
                            if (tab && typeof tab.remove === 'function') {
                              console.log('[PF] No editor, calling tab.remove() directly (manual)');
                              tab.remove();
                            } else {
                              console.warn('[PF] No editor and no remove method (manual)', { tab });
                            }
                          }
                        } catch (err) {
                          console.error('[PF] Error removing tabs component (manual):', err);
                        }
                      };
                      deleteBtn.addEventListener('click', deleteHandler);
                      console.log('[PF] Delete button event listener attached (manual)', { deleteBtn, tab });
                      if (compEl.firstChild) {
                        compEl.insertBefore(deleteBtn, compEl.firstChild);
                      } else {
                        compEl.appendChild(deleteBtn);
                      }
                      if (window.getComputedStyle(compEl).position === 'static') {
                        compEl.style.position = 'relative';
                      }
                    } else {
                      // Button exists, but let's verify it has a click handler
                      console.log('[PF] Delete button exists, checking if it has click handler');
                      // Re-attach handler to be safe
                      existingBtn.addEventListener('click', (e) => {
                        console.log('[PF] Delete button clicked (existing)!', { tab, e });
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          // tab is the model, so try to get the view from the editor
                          const editor = window.recordLayoutBuilderInstance?.editor;
                          if (editor) {
                            // Get the view from the component manager
                            const view = editor.Components.getView(tab);
                            if (view && typeof view.onDelete === 'function') {
                              console.log('[PF] Calling view.onDelete');
                              view.onDelete(e);
                            } else if (tab && typeof tab.remove === 'function') {
                              console.log('[PF] Calling tab.remove() directly');
                              tab.remove();
                            } else {
                              console.warn('[PF] Could not remove - no remove method', { tab, view });
                            }
                          } else {
                            // Fallback: try direct remove
                            if (tab && typeof tab.remove === 'function') {
                              console.log('[PF] No editor, calling tab.remove() directly');
                              tab.remove();
                            } else {
                              console.warn('[PF] No editor and no remove method', { tab });
                            }
                          }
                        } catch (err) {
                          console.error('[PF] Error removing tabs component (existing):', err);
                        }
                      });
                    }
                  }
                };
                
                // Check immediately
                setTimeout(checkDeleteButton, 100);
                
                // Check again after fields might have been processed
                setTimeout(checkDeleteButton, 500);
                
                // Final check after everything should be loaded
                setTimeout(checkDeleteButton, 1000);
              }, 100);
            });
            
            // Final pass: ensure all tabs have delete buttons after ALL processing is done
            setTimeout(() => {
              console.log('[PF] Final pass: ensuring all tabs have delete buttons');
              tabs.forEach(tab => {
                const compEl = tab.getEl();
                if (compEl) {
                  let deleteBtn = compEl.querySelector('.rb-del');
                  if (!deleteBtn) {
                    console.log('[PF] Final pass: Adding missing delete button to tab');
                    deleteBtn = document.createElement('span');
                    deleteBtn.className = 'rb-del';
                    deleteBtn.setAttribute('data-role', 'rb-del');
                    deleteBtn.setAttribute('aria-label', 'Delete');
                    deleteBtn.title = 'Delete';
                    deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M135.2 17.7C140.6 7.2 151.7 0 164 0h120c12.3 0 23.4 7.2 28.8 17.7L328 32H432c8.8 0 16 7.2 16 16s-7.2 16-16 16H16C7.2 64 0 56.8 0 48S7.2 32 16 32H120l15.2-14.3zM32 96H416l-21.2 371.6c-1.8 31.3-27.7 56.4-59.1 56.4H112.3c-31.4 0-57.3-25.1-59.1-56.4L32 96zm112 80c-8.8 0-16 7.2-16 16V416c0 8.8 7.2 16 16 16s16-7.2 16-16V192c0-8.8-7.2-16-16-16zm80 0c-8.8 0-16 7.2-16 16V416c0 8.8 7.2 16 16 16s16-7.2 16-16V192c0-8.8-7.2-16-16-16zm80 0c-8.8 0-16 7.2-16 16V416c0 8.8 7.2 16 16 16s16-7.2 16-16V192c0-8.8-7.2-16-16-16z"/></svg>';
                    deleteBtn.style.cssText = 'position: absolute; top: 4px; right: 6px; background: rgba(0,0,0,0.7); color: #fff; border-radius: 12px; width: 22px; height: 22px; display: none; align-items: center; justify-content: center; text-align: center; font-size: 12px; cursor: pointer; z-index: 9999; pointer-events: auto;';
                    
                    const deleteHandler = (e) => {
                      console.log('[PF] Delete button clicked (final pass)!', { tab, e });
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        const editor = window.recordLayoutBuilderInstance?.editor;
                        if (editor) {
                          const view = editor.Components.getView(tab);
                          if (view && typeof view.onDelete === 'function') {
                            view.onDelete(e);
                          } else if (tab && typeof tab.remove === 'function') {
                            tab.remove();
                          }
                        } else if (tab && typeof tab.remove === 'function') {
                          tab.remove();
                        }
                      } catch (err) {
                        console.error('[PF] Error removing tabs component (final pass):', err);
                      }
                    };
                    deleteBtn.addEventListener('click', deleteHandler);
                    
                    if (compEl.firstChild) {
                      compEl.insertBefore(deleteBtn, compEl.firstChild);
                    } else {
                      compEl.appendChild(deleteBtn);
                    }
                    if (window.getComputedStyle(compEl).position === 'static') {
                      compEl.style.position = 'relative';
                    }
                  } else {
                    // Button exists, make sure it's visible and has proper styling
                    deleteBtn.style.cssText = 'position: absolute; top: 4px; right: 6px; background: rgba(0,0,0,0.7); color: #fff; border-radius: 12px; width: 22px; height: 22px; display: none; align-items: center; justify-content: center; text-align: center; font-size: 12px; cursor: pointer; z-index: 9999; pointer-events: auto;';
                  }
                }
              });
            }, 1500);
          } catch (error) {
            console.warn('[PF] Error locking initial components:', error);
          }
        }, 200); // Increased timeout to ensure DOM is ready
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

  setupCanvasDragAndDrop() {
    const canvasContainer = document.getElementById('gjs');
    if (!canvasContainer) return;
    
    let dropLock = false;
    
    const handleDrop = (e) => {
      try {
        e.preventDefault();
        e.stopPropagation();
      } catch(_) {}
      
      if (dropLock) return;
      dropLock = true;
      setTimeout(() => { dropLock = false; }, 150);
      
      const dt = (e && e.dataTransfer) ? e.dataTransfer : {};
      const componentType = (dt && dt.getData && dt.getData('component-type')) || 
                           (window.rbDragPayload && window.rbDragPayload.type) || '';
      
      if (!componentType) {
        window.rbDragPayload = null;
        return;
      }
      
      console.log('[PF] Drop detected:', { componentType, target: e.target });
      
      // First, check if we're dropping into a tab section
      let targetTabSection = null;
      try {
        const targetEl = e.target;
        if (targetEl) {
          // Look for tab section in the target's ancestors
          const tabSectionEl = targetEl.closest && targetEl.closest('[data-role="pf-tab-section"]');
          if (tabSectionEl) {
            console.log('[PF] Found tab section element:', tabSectionEl);
            // Find the GrapesJS component for this tab section
            const root = this.editor.DomComponents.getWrapper();
            const sections = root.find('[data-role="pf-tab-section"]');
            targetTabSection = sections.find(s => s.getEl() === tabSectionEl);
            if (targetTabSection) {
              console.log('[PF] Found tab section component:', targetTabSection);
            }
          }
        }
      } catch(err) {
        console.warn('[PF] Error detecting tab section:', err);
      }
      
      const root = this.editor.DomComponents.getWrapper();
      let insertAt = root.components().length;
      
      // Calculate drop position based on Y coordinate (only if not dropping into tab section)
      if (!targetTabSection) {
        try {
          const dropY = e.clientY;
          const children = root.components().models || [];
          for (let i = 0; i < children.length; i += 1) {
            const el = children[i].getEl && children[i].getEl();
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            if (dropY < rect.top + rect.height / 2) {
              insertAt = i;
              break;
            }
          }
        } catch(_) {}
      }
      
      if (componentType === 'record-tabs') {
        // Add tabs component
        const comp = this.editor.DomComponents.addComponent({ type: 'record-tabs' }, { at: insertAt });
        comp.addAttributes({ 'data-comp-id': `c_${Date.now()}_${Math.random().toString(36).slice(2,8)}` });
        // Lock inner components for tabs (but tabs have special handling, so we'll let the tabs component handle it)
      } else if (componentType === 'partial') {
        const partialName = (dt && dt.getData && dt.getData('partial-name')) || 
                           (window.rbDragPayload && window.rbDragPayload.partial) || '';
        if (!partialName) {
          window.rbDragPayload = null;
          return;
        }
        
        let comp;
        if (targetTabSection) {
          // Add to tab section
          const added = targetTabSection.append({ type: 'record-partial' });
          comp = Array.isArray(added) ? added[0] : added;
        } else {
          // Add to root
          comp = this.editor.DomComponents.addComponent({ type: 'record-partial' }, { at: insertAt });
        }
        
        if (comp && comp.addAttributes) {
          comp.addAttributes({ 
            'partial-name': partialName, 
            'data-comp-id': `c_${Date.now()}_${Math.random().toString(36).slice(2,8)}` 
          });
          
          // Add preview content
          try {
            const previewScript = document.getElementById('record-layout-preview');
            if (previewScript) {
              const preview = JSON.parse(previewScript.textContent);
              const parts = preview.partials || {};
              const html = parts[partialName] || '';
              if (html) {
                comp.components(html);
                // Add delete button as direct child
                this.addDeleteButton(comp);
                // Lock all inner components so they can't be selected/edited individually
                this.lockInnerComponents(comp);
              } else {
                // Even without preview, add delete button
                this.addDeleteButton(comp);
              }
            } else {
              this.addDeleteButton(comp);
            }
          } catch(_) {
            // Fallback: add delete button even if preview fails
            this.addDeleteButton(comp);
          }
        }
      } else if (componentType === 'field') {
        const api = (dt && dt.getData && dt.getData('field-api-name')) || 
                   (window.rbDragPayload && window.rbDragPayload.api) || '';
        const label = (dt && dt.getData && dt.getData('field-label')) || 
                     (window.rbDragPayload && window.rbDragPayload.label) || api;
        const ftype = (dt && dt.getData && dt.getData('field-type')) || 
                     (window.rbDragPayload && window.rbDragPayload.ftype) || 'text';
        
        if (!api) {
          window.rbDragPayload = null;
          return;
        }
        
        let comp;
        if (targetTabSection) {
          // Add to tab section
          const added = targetTabSection.append({ type: 'record-field' });
          comp = Array.isArray(added) ? added[0] : added;
        } else {
          // Add to root
          comp = this.editor.DomComponents.addComponent({ type: 'record-field' }, { at: insertAt });
        }
        
        if (comp && comp.addAttributes) {
          comp.addAttributes({ 
            'field-api-name': api, 
            'field-label': label, 
            'field-type': ftype, 
            'data-comp-id': `c_${Date.now()}_${Math.random().toString(36).slice(2,8)}` 
          });
          
          // Add preview content
          try {
            const previewScript = document.getElementById('record-layout-preview');
            if (previewScript) {
              const preview = JSON.parse(previewScript.textContent);
              const values = preview.values || {};
              const val = Object.prototype.hasOwnProperty.call(values, api) ? values[api] : '';
              const html = `<div class="rf-row d-flex align-items-start justify-content-between">
                <div class="rf-content flex-grow-1">
                  <div class="rf-label">${label || ''}</div>
                  <div class="rf-value">${val == null ? '' : String(val)}</div>
                </div>
                <i class="fas fa-pencil-alt" aria-hidden="true" style="color:#000; margin-left:8px;"></i>
              </div>`;
              comp.components(html);
              // Add delete button as direct child (not nested in preview HTML)
              this.addDeleteButton(comp);
              // Lock all inner components so they can't be selected/edited individually
              this.lockInnerComponents(comp);
              if (comp.view && comp.view.render) {
                comp.view.render();
              }
            } else {
              // Fallback: add delete button even if preview script is missing
              this.addDeleteButton(comp);
            }
          } catch(_) {
            // Fallback: add delete button even if preview fails
            this.addDeleteButton(comp);
          }
        }
      }
      
      window.rbDragPayload = null;
    };
    
    // Set up dragover and drop handlers on canvas container
    canvasContainer.addEventListener('dragover', (e) => {
      try {
        // Check if this is a tab reorder drag (should be handled by tab buttons)
        const isTabReorder = e.dataTransfer.types.includes('application/x-tab-reorder');
        if (isTabReorder) {
          // Don't handle tab reorder drags here - let tab buttons handle them
          // But prevent default to allow the drag
          const header = e.target.closest && e.target.closest('.pf-tabs-header');
          if (header) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
          } else {
            // Outside header - prevent drop
            e.dataTransfer.dropEffect = 'none';
          }
          return;
        }
        
        if (window.rbDragPayload || (e.dataTransfer && e.dataTransfer.getData('component-type'))) {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'copy';
          
          // Highlight tab sections when dragging over them
          const tabSection = e.target.closest && e.target.closest('[data-role="pf-tab-section"]');
          if (tabSection) {
            tabSection.classList.add('dragover');
          } else {
            // Remove dragover class from all tab sections
            document.querySelectorAll('.pf-tab-section.dragover').forEach(s => {
              s.classList.remove('dragover');
            });
          }
        }
      } catch(_) {}
    });
    
    canvasContainer.addEventListener('dragleave', (e) => {
      // Remove dragover class when leaving
      document.querySelectorAll('.pf-tab-section.dragover').forEach(s => {
        s.classList.remove('dragover');
      });
    });
    
    canvasContainer.addEventListener('drop', (e) => {
      // Check if this is a tab reorder drop (should be handled by tab buttons)
      const isTabReorder = e.dataTransfer.types.includes('application/x-tab-reorder');
      if (isTabReorder) {
        // Don't handle tab reorder drops here - let tab buttons handle them
        // Only handle if dropped outside header
        const header = e.target.closest && e.target.closest('.pf-tabs-header');
        if (!header) {
          // Cancel the drop if outside header
          e.preventDefault();
          e.stopPropagation();
          console.log('[PF] Tab reorder drop cancelled - outside header');
        }
        return;
      }
      
      // Remove dragover class on drop
      document.querySelectorAll('.pf-tab-section.dragover').forEach(s => {
        s.classList.remove('dragover');
      });
      handleDrop(e);
    });
    
    // Also set up handlers on the iframe (GrapesJS canvas)
    // Retry mechanism since iframe might not be ready immediately
    const setupIframeHandlers = () => {
      try {
        const iframe = this.editor.Canvas.getFrameEl();
        if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
          iframe.contentDocument.addEventListener('dragover', (e) => {
            try {
              // Check if this is a tab reorder drag
              const isTabReorder = e.dataTransfer.types.includes('application/x-tab-reorder');
              if (isTabReorder) {
                // Only allow drag over within header
                const header = e.target.closest && e.target.closest('.pf-tabs-header');
                if (header) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                } else {
                  e.dataTransfer.dropEffect = 'none';
                }
                return;
              }
              
              if (window.rbDragPayload || (e.dataTransfer && e.dataTransfer.getData('component-type'))) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';
                
                // Highlight tab sections when dragging over them
                const tabSection = e.target.closest && e.target.closest('[data-role="pf-tab-section"]');
                if (tabSection) {
                  tabSection.classList.add('dragover');
                } else {
                  // Remove dragover class from all tab sections
                  iframe.contentDocument.querySelectorAll('.pf-tab-section.dragover').forEach(s => {
                    s.classList.remove('dragover');
                  });
                }
              }
            } catch(_) {}
          });
          
          iframe.contentDocument.addEventListener('dragleave', (e) => {
            // Remove dragover class when leaving
            try {
              iframe.contentDocument.querySelectorAll('.pf-tab-section.dragover').forEach(s => {
                s.classList.remove('dragover');
              });
            } catch(_) {}
          });
          
          iframe.contentDocument.addEventListener('drop', (e) => {
            try {
              // Check if this is a tab reorder drop
              const isTabReorder = e.dataTransfer.types.includes('application/x-tab-reorder');
              if (isTabReorder) {
                // Don't handle tab reorder drops here - let tab buttons handle them
                // Only cancel if dropped outside header
                const header = e.target.closest && e.target.closest('.pf-tabs-header');
                if (!header) {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[PF] Tab reorder drop cancelled in iframe - outside header');
                }
                return;
              }
              
              // Remove dragover class on drop
              iframe.contentDocument.querySelectorAll('.pf-tab-section.dragover').forEach(s => {
                s.classList.remove('dragover');
              });
              // Forward to main handler
              handleDrop(e);
            } catch(_) {}
          });
          return true;
        }
      } catch(_) {}
      return false;
    };
    
    // Try immediately
    if (!setupIframeHandlers()) {
      // Retry after a short delay
      setTimeout(() => {
        if (!setupIframeHandlers()) {
          // One more retry
          setTimeout(setupIframeHandlers, 500);
        }
      }, 100);
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

  destroy() {
    if (this.editor) {
      try {
        this.editor.destroy();
        console.log('[PF] Record builder editor destroyed');
      } catch (error) {
        console.warn('[PF] Error destroying editor:', error);
      }
      this.editor = null;
    }
  }
}

// Initialize the builder
let builderInitialized = false;
let builderInstance = null;

function destroyRecordPageBuilder() {
  if (builderInstance) {
    try {
      builderInstance.destroy();
    } catch (error) {
      console.warn('[PF] Error destroying builder instance:', error);
    }
    builderInstance = null;
  }
  builderInitialized = false;
}

function initRecordPageBuilder() {
  // Only initialize if we're on the builder page
  if (!document.getElementById('gjs') || !document.getElementById('record-layout-metadata')) {
    return;
  }

  if (builderInitialized) return;
  builderInitialized = true;
  
  builderInstance = new RecordLayoutBuilder();
}

// Event listeners
document.addEventListener('turbo:before-cache', destroyRecordPageBuilder);
document.addEventListener('turbo:load', function() {
  destroyRecordPageBuilder();
  initRecordPageBuilder();
});
document.addEventListener('DOMContentLoaded', initRecordPageBuilder);
