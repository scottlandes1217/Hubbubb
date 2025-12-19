// Modal Handlers Module
// Handles configuration modals for tabs and sections

export class ModalHandlers {
  constructor(builder) {
    this.builder = builder;
    this.editor = builder.editor;
  }

  setup() {
    this.setupTabsConfigModal();
    this.setupSectionConfigModal();
  }

  setupTabsConfigModal() {
    // Modal for configuring tabs
    const ensureTabsModal = () => {
      let modal = document.getElementById('pf-tabs-config-modal');
      if (modal) return modal;
      modal = document.createElement('div');
      modal.id = 'pf-tabs-config-modal';
      modal.style.position = 'fixed';
      modal.style.inset = '0';
      modal.style.background = 'rgba(0,0,0,0.4)';
      modal.style.display = 'none';
      modal.style.zIndex = '999999';
      modal.innerHTML = `
        <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;border-radius:8px;min-width:420px;max-width:640px;box-shadow:0 10px 30px rgba(0,0,0,0.25);">
          <div style="padding:12px 16px;border-bottom:1px solid #e9ecef;display:flex;align-items:center;justify-content:space-between;">
            <div style="font-weight:600;">Configure Tabs</div>
            <button type="button" id="pf-tabs-close" style="border:0;background:transparent;font-size:18px;line-height:1;cursor:pointer;">×</button>
          </div>
          <div style="padding:12px 16px;">
            <div class="text-muted" style="font-size:12px;margin-bottom:6px;">Drag to reorder. Click a name to edit.</div>
            <ul id="pf-tabs-list" style="list-style:none;padding:0;margin:0;max-height:300px;overflow:auto;border:1px solid #e9ecef;border-radius:6px;">
            </ul>
            <button type="button" id="pf-tabs-add" class="btn btn-sm btn-outline-primary" style="margin-top:10px;">Add tab</button>
          </div>
          <div style="padding:12px 16px;border-top:1px solid #e9ecef;display:flex;gap:8px;justify-content:flex-end;">
            <button type="button" id="pf-tabs-cancel" class="btn btn-sm btn-secondary">Cancel</button>
            <button type="button" id="pf-tabs-save" class="btn btn-sm btn-primary">Save</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      // Wire close buttons
      modal.querySelector('#pf-tabs-close').onclick = () => { modal.style.display = 'none'; };
      modal.querySelector('#pf-tabs-cancel').onclick = () => { modal.style.display = 'none'; };
      return modal;
    };

    window.openTabsConfigModal = (comp) => {
      const modal = ensureTabsModal();
      modal.style.display = 'flex';
      const list = modal.querySelector('#pf-tabs-list');
      list.innerHTML = '';
      
      // Get current tabs from component attributes
      const attrs = comp.getAttributes ? comp.getAttributes() : {};
      let tabsJson = attrs['tabs-json'];
      
      // If not in attributes, try reading from HTML element and set it
      if (!tabsJson) {
        const compEl = comp.getEl();
        if (compEl) {
          tabsJson = compEl.getAttribute('tabs-json');
          if (tabsJson) {
            comp.addAttributes({ 'tabs-json': tabsJson });
          }
        }
      }
      
      let tabs = [];
      if (tabsJson) {
        if (window.TabsComponent && window.TabsComponent.pfParseTabsJson) {
          tabs = window.TabsComponent.pfParseTabsJson(tabsJson);
        } else {
          try {
            tabs = JSON.parse(tabsJson);
          } catch(e) {
            console.warn('[PF] Modal: Error parsing tabs-json:', e);
          }
        }
      }
      
      // If still no tabs, something is wrong - but don't use a default
      if (!tabs || tabs.length === 0) {
        console.error('[PF] Modal: No tabs found in component! tabs-json:', tabsJson, 'attributes:', attrs);
        alert('Error: Could not load tabs configuration. Please refresh the page.');
        modal.style.display = 'none';
        return;
      }
      
      // Populate list
      tabs.forEach(t => {
        const li = document.createElement('li');
        li.draggable = true;
        li.dataset.tabId = t.id;
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.gap = '8px';
        li.style.padding = '8px 10px';
        li.style.borderBottom = '1px solid #f1f3f5';
        li.innerHTML = `
          <span style="cursor:grab;">☰</span>
          <input type="text" value="${(t.title || 'Tab').replace(/"/g, '&quot;')}" style="flex:1 1 auto;border:1px solid #ddd;padding:4px 8px;border-radius:4px;" />
          <button type="button" class="pf-tab-delete-btn" style="border:0;background:transparent;color:#dc3545;cursor:pointer;padding:2px 6px;font-size:14px;" title="Delete tab">×</button>
        `;
        // Add delete handler
        const deleteBtn = li.querySelector('.pf-tab-delete-btn');
        deleteBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (list.children.length > 1) {
            li.remove();
          } else {
            alert('You must have at least one tab.');
          }
        };
        list.appendChild(li);
      });
      
      // Simple DnD within modal
      let dragEl = null;
      list.addEventListener('dragstart', ev => { 
        const li = ev.target.closest('li'); 
        if (!li) return; 
        dragEl = li; 
        ev.dataTransfer.effectAllowed = 'move'; 
      });
      list.addEventListener('dragover', ev => { 
        ev.preventDefault(); 
        const li = ev.target.closest('li'); 
        if (!li || !dragEl || li === dragEl) return; 
        const rect = li.getBoundingClientRect(); 
        const after = (ev.clientY - rect.top) > rect.height/2; 
        li.parentNode.insertBefore(dragEl, after ? li.nextSibling : li); 
      });
      list.addEventListener('dragend', () => { dragEl = null; });
      
      // Add new tab
      modal.querySelector('#pf-tabs-add').onclick = () => {
        const id = window.TabsComponent && window.TabsComponent.pfGenerateId ? 
                   window.TabsComponent.pfGenerateId('tab') : 
                   `tab_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
        const li = document.createElement('li');
        li.draggable = true;
        li.dataset.tabId = id;
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.gap = '8px';
        li.style.padding = '8px 10px';
        li.style.borderBottom = '1px solid #f1f3f5';
        li.innerHTML = `
          <span style="cursor:grab;">☰</span>
          <input type="text" value="New Tab" style="flex:1 1 auto;border:1px solid #ddd;padding:4px 8px;border-radius:4px;" />
          <button type="button" class="pf-tab-delete-btn" style="border:0;background:transparent;color:#dc3545;cursor:pointer;padding:2px 6px;font-size:14px;" title="Delete tab">×</button>
        `;
        // Add delete handler
        const deleteBtn = li.querySelector('.pf-tab-delete-btn');
        deleteBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (list.children.length > 1) {
            li.remove();
          } else {
            alert('You must have at least one tab.');
          }
        };
        list.appendChild(li);
      };
      
      // Save handler
      modal.querySelector('#pf-tabs-save').onclick = () => {
        try {
          const items = Array.from(list.querySelectorAll('li'));
          if (items.length === 0) {
            alert('You must have at least one tab.');
            return;
          }
          
          const newTabs = items.map(li => ({ 
            id: li.dataset.tabId, 
            title: li.querySelector('input').value.trim() || 'Tab' 
          }));
          
          
          // Store existing section content before rebuilding
          const existingSections = {};
          try {
            const bodyComp = comp.find('.pf-tabs-body')[0];
            if (bodyComp) {
              const secComps = comp.find('[data-role="pf-tab-section"]').slice(0, 500);
              secComps.forEach(sc => {
                const tabId = sc.getAttributes()['data-tab-id'];
                if (tabId) {
                  // Store the section component itself (GrapesJS will preserve its children)
                  existingSections[tabId] = sc;
                }
              });
            }
          } catch(e) {
            console.warn('[PF] Error storing existing sections:', e);
          }
          
          // Update component attributes
          const tabsJson = window.TabsComponent && window.TabsComponent.pfStringifyTabsJson ? 
                          window.TabsComponent.pfStringifyTabsJson(newTabs) : 
                          JSON.stringify(newTabs);
          
          // Get the active tab ID (preserve current or use first)
          const currentActive = comp.getAttributes ? comp.getAttributes()['active-tab-id'] : '';
          const activeTabId = newTabs.find(t => t.id === currentActive) ? currentActive : (newTabs[0]?.id || '');
          
          // Update attributes
          comp.addAttributes({ 
            'tabs-json': tabsJson,
            'active-tab-id': activeTabId
          });
          
          
          // CRITICAL: Store children BEFORE rebuilding, then rebuild and restore
          // This ensures the component tree is correct for serialization
          setTimeout(() => {
              try {
                // Mark that we're updating FIRST, before storing children
                // This prevents buildWorkingTabs from hitting the early return
                comp.addAttributes({ '_updating-tabs': 'true' });
                
                // Store children as HTML strings before rebuild (components will be destroyed)
                const childrenByTabId = {};
                const bodyComp = comp.find('.pf-tabs-body')[0];
                if (bodyComp) {
                  const sections = comp.find('[data-role="pf-tab-section"]').slice(0, 500);
                  sections.forEach(section => {
                    const tabId = section.getAttributes()['data-tab-id'];
                    if (tabId) {
                      // Serialize all children to HTML so they persist through rebuild
                      const children = section.components();
                      const childrenHtml = [];
                      children.forEach(child => {
                        try {
                          if (child && child.toHTML) {
                            childrenHtml.push(child.toHTML());
                          }
                        } catch(e) {
                          console.warn('[PF] Error serializing child:', e);
                        }
                      });
                      childrenByTabId[tabId] = childrenHtml.join('');
                    }
                  });
                }
                
                // Verify tabs-json is updated before rebuilding
                const updatedTabsJson = comp.getAttributes()['tabs-json'];
                try {
                  const parsedTabs = JSON.parse(updatedTabsJson);
                } catch(e) {
                  console.error('[PF] Error parsing tabs-json before rebuild:', e);
                }
                
                // Rebuild the tabs structure - this ensures the component tree is correct
                // This will clear and recreate the tabsWrapper, header, body, and sections
                if (window.TabsComponent && window.TabsComponent.buildWorkingTabs) {
                  // Call buildWorkingTabs and wait for it to complete
                  window.TabsComponent.buildWorkingTabs(comp);
                  
                  // Wait longer for all buttons to be created and added to component tree
                  setTimeout(() => {
                    // Find the tabsWrapper component first
                    const tabsWrapperComp = comp.components().find(c => {
                      const el = c.getEl();
                      return el && el.classList && el.classList.contains('pf-tabs');
                    });
                    
                    if (tabsWrapperComp) {
                      const headerComp = tabsWrapperComp.components().find(c => {
                        const el = c.getEl();
                        return el && el.classList && el.classList.contains('pf-tabs-header');
                      });
                      
                      if (headerComp) {
                        const buttons = headerComp.components();
                        buttons.forEach((btn, idx) => {
                          const tabId = btn.getAttributes()['data-tab-id'];
                        });
                      } else {
                        console.warn('[PF] No header component found after rebuild');
                      }
                    } else {
                      console.warn('[PF] No tabsWrapper component found after rebuild');
                    }
                  }, 200);
                }
                
                // Restore children to their sections after rebuild by appending HTML
                // GrapesJS will parse the HTML and create components
                const newBodyComp = comp.find('.pf-tabs-body')[0];
                if (newBodyComp) {
                  const sections = comp.find('[data-role="pf-tab-section"]').slice(0, 500);
                  sections.forEach(section => {
                    const tabId = section.getAttributes()['data-tab-id'];
                    // Only restore children if this tab ID exists in our stored children
                    // New tabs won't have an entry, so they'll remain empty
                    if (tabId && childrenByTabId.hasOwnProperty(tabId) && childrenByTabId[tabId]) {
                      // Clear section first to avoid duplicates
                      // ROOT CAUSE FIX: Check drag flag - comp.components('') triggers ensureInList recursion
                      if (!window.__pf_isMovingComponent) {
                        section.components('');
                      }
                      
                      // Append HTML - GrapesJS will parse it into components
                      const storedHtml = childrenByTabId[tabId];
                      if (storedHtml && storedHtml.trim()) {
                        // Use append to add components, not replace
                        try {
                          const added = section.append(storedHtml);
                          const restoredChildren = section.components();
                        } catch(e) {
                          console.error(`[PF] Error restoring children to tab ${tabId}:`, e);
                          // Fallback: try components() method
                          try {
                            section.components(storedHtml);
                            const restoredChildren = section.components();
                          } catch(e2) {
                            console.error(`[PF] Fallback restore also failed for tab ${tabId}:`, e2);
                          }
                        }
                      }
                    } else {
                      // New tab - ensure it's empty
                      // ROOT CAUSE FIX: Check drag flag - comp.components('') triggers ensureInList recursion
                      if (!window.__pf_isMovingComponent && section.components().length > 0) {
                        section.components('');
                      }
                    }
                  });
                }
                
                // Remove the updating flag AFTER everything is done
                // Don't remove it yet - wait until handlers are attached
                
                // Wait for buttons to be fully created and DOM to be ready
                // Handlers are attached when buttons are created (in buildWorkingTabs)
                // Just verify and remove the flag after everything is done
                setTimeout(() => {
                  // Find header through component tree (more reliable than comp.find)
                  const tabsWrapperComp = comp.components().find(c => {
                    const el = c.getEl();
                    return el && el.classList && el.classList.contains('pf-tabs');
                  });
                  
                  if (tabsWrapperComp) {
                    const verifyHeader = tabsWrapperComp.components().find(c => {
                      const el = c.getEl();
                      return el && el.classList && el.classList.contains('pf-tabs-header');
                    });
                    
                    if (verifyHeader) {
                      const buttons = verifyHeader.components();
                      const headerEl = verifyHeader.getEl();
                      const domButtons = headerEl ? headerEl.querySelectorAll('.pf-tab-btn') : [];
                      
                      
                      buttons.forEach((btn, idx) => {
                        const tabId = btn.getAttributes()['data-tab-id'];
                        const btnEl = btn.getEl();
                      });
                      
                      if (buttons.length !== domButtons.length) {
                        console.warn('[PF] Mismatch between component tree and DOM! Buttons in tree:', buttons.length, 'in DOM:', domButtons.length);
                        // Force GrapesJS to sync DOM with component tree
                        buttons.forEach(btn => {
                          if (btn.view && btn.view.render) {
                            btn.view.render();
                          }
                        });
                      }
                    }
                  }
                  
                  // Remove the updating flag AFTER verification
                  comp.addAttributes({ '_updating-tabs': '' });
                  
                  // Set a flag to prevent immediate comparison checks after rebuild
                  const compEl = comp.getEl();
                  if (compEl) {
                    compEl.__pf_just_rebuilt = true;
                    setTimeout(() => {
                      if (compEl) {
                        compEl.__pf_just_rebuilt = false;
                      }
                    }, 2000); // Give it 2 seconds to settle
                  }
                  
                }, 500);
              } catch(e) {
                console.error('[PF] Error rebuilding tabs structure:', e);
                comp.addAttributes({ '_updating-tabs': '' });
              }
            }, 100);
          
        } catch(e) { 
          console.error('[PF] Error saving tabs config:', e); 
          console.error('[PF] Error stack:', e.stack);
          alert('Error saving tabs: ' + (e.message || String(e)));
        }
        modal.style.display = 'none';
      };
    };
  }

  setupSectionConfigModal() {
    // Modal for configuring sections (columns)
    const ensureSectionModal = () => {
      let modal = document.getElementById('pf-section-config-modal');
      if (modal) return modal;
      modal = document.createElement('div');
      modal.id = 'pf-section-config-modal';
      modal.style.position = 'fixed';
      modal.style.inset = '0';
      modal.style.background = 'rgba(0,0,0,0.4)';
      modal.style.display = 'none';
      modal.style.zIndex = '999999';
      modal.innerHTML = `
        <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff;border-radius:8px;min-width:420px;max-width:640px;box-shadow:0 10px 30px rgba(0,0,0,0.25);">
          <div style="padding:12px 16px;border-bottom:1px solid #e9ecef;display:flex;align-items:center;justify-content:space-between;">
            <div style="font-weight:600;">Configure Section Columns</div>
            <button type="button" id="pf-section-close" style="border:0;background:transparent;font-size:18px;line-height:1;cursor:pointer;">×</button>
          </div>
          <div style="padding:12px 16px;">
            <div class="text-muted" style="font-size:12px;margin-bottom:6px;">Drag to reorder. Set width for each column (e.g., 50%, 33%, 25%).</div>
            <ul id="pf-section-list" style="list-style:none;padding:0;margin:0;max-height:300px;overflow:auto;border:1px solid #e9ecef;border-radius:6px;">
            </ul>
            <button type="button" id="pf-section-add" class="btn btn-sm btn-outline-primary" style="margin-top:10px;">Add Column</button>
          </div>
          <div style="padding:12px 16px;border-top:1px solid #e9ecef;display:flex;gap:8px;justify-content:flex-end;">
            <button type="button" id="pf-section-cancel" class="btn btn-sm btn-secondary">Cancel</button>
            <button type="button" id="pf-section-save" class="btn btn-sm btn-primary">Save</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      // Wire close buttons
      modal.querySelector('#pf-section-close').onclick = () => { modal.style.display = 'none'; };
      modal.querySelector('#pf-section-cancel').onclick = () => { modal.style.display = 'none'; };
      return modal;
    };

    window.openSectionConfigModal = (comp) => {
      const modal = ensureSectionModal();
      modal.style.display = 'flex';
      const list = modal.querySelector('#pf-section-list');
      list.innerHTML = '';
      
      // Get current columns from component attributes
      const attrs = comp.getAttributes ? comp.getAttributes() : {};
      let columnsJson = attrs['columns-json'];
      
      // If not in attributes, try reading from HTML element and set it
      if (!columnsJson) {
        const compEl = comp.getEl();
        if (compEl) {
          columnsJson = compEl.getAttribute('columns-json');
          if (columnsJson) {
            comp.addAttributes({ 'columns-json': columnsJson });
          }
        }
      }
      
      let columns = [];
      if (columnsJson) {
        if (window.SectionComponent && window.SectionComponent.pfParseColumnsJson) {
          columns = window.SectionComponent.pfParseColumnsJson(columnsJson);
        } else {
          try {
            columns = JSON.parse(columnsJson);
          } catch(e) {
            console.warn('[PF] Modal: Error parsing columns-json:', e);
          }
        }
      }
      
      // If still no columns, something is wrong - but don't use a default
      if (!columns || columns.length === 0) {
        console.error('[PF] Modal: No columns found in component! columns-json:', columnsJson, 'attributes:', attrs);
        alert('Error: Could not load columns configuration. Please refresh the page.');
        modal.style.display = 'none';
        return;
      }
      
      // Populate list
      columns.forEach(col => {
        const li = document.createElement('li');
        li.draggable = true;
        li.dataset.columnId = col.id;
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.gap = '8px';
        li.style.padding = '8px 10px';
        li.style.borderBottom = '1px solid #f1f3f5';
        li.innerHTML = `
          <span style="cursor:grab;">☰</span>
          <input type="text" value="${(col.width || '50%').replace(/"/g, '&quot;')}" placeholder="Width (e.g., 50%)" style="flex:0 0 120px;border:1px solid #ddd;padding:4px 8px;border-radius:4px;" />
          <button type="button" class="pf-section-delete-btn" style="border:0;background:transparent;color:#dc3545;cursor:pointer;padding:2px 6px;font-size:14px;" title="Delete column">×</button>
        `;
        // Add delete handler
        const deleteBtn = li.querySelector('.pf-section-delete-btn');
        deleteBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (list.children.length > 1) {
            li.remove();
          } else {
            alert('You must have at least one column.');
          }
        };
        list.appendChild(li);
      });
      
      // Simple DnD within modal
      let dragEl = null;
      list.addEventListener('dragstart', ev => { 
        const li = ev.target.closest('li'); 
        if (!li) return; 
        dragEl = li; 
        ev.dataTransfer.effectAllowed = 'move'; 
      });
      list.addEventListener('dragover', ev => { 
        ev.preventDefault(); 
        const li = ev.target.closest('li'); 
        if (!li || !dragEl || li === dragEl) return; 
        const rect = li.getBoundingClientRect(); 
        const after = (ev.clientY - rect.top) > rect.height/2; 
        li.parentNode.insertBefore(dragEl, after ? li.nextSibling : li); 
      });
      list.addEventListener('dragend', () => { dragEl = null; });
      
      // Add new column
      modal.querySelector('#pf-section-add').onclick = () => {
        const id = window.SectionComponent && window.SectionComponent.pfGenerateId ? 
                   window.SectionComponent.pfGenerateId('col') : 
                   `col_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
        const li = document.createElement('li');
        li.draggable = true;
        li.dataset.columnId = id;
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.gap = '8px';
        li.style.padding = '8px 10px';
        li.style.borderBottom = '1px solid #f1f3f5';
        li.innerHTML = `
          <span style="cursor:grab;">☰</span>
          <input type="text" value="50%" placeholder="Width (e.g., 50%)" style="flex:0 0 120px;border:1px solid #ddd;padding:4px 8px;border-radius:4px;" />
          <button type="button" class="pf-section-delete-btn" style="border:0;background:transparent;color:#dc3545;cursor:pointer;padding:2px 6px;font-size:14px;" title="Delete column">×</button>
        `;
        // Add delete handler
        const deleteBtn = li.querySelector('.pf-section-delete-btn');
        deleteBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (list.children.length > 1) {
            li.remove();
          } else {
            alert('You must have at least one column.');
          }
        };
        list.appendChild(li);
      };
      
      // Save handler
      modal.querySelector('#pf-section-save').onclick = () => {
        try {
          const items = Array.from(list.querySelectorAll('li'));
          if (items.length === 0) {
            alert('You must have at least one column.');
            return;
          }
          
          const newColumns = items.map(li => ({ 
            id: li.dataset.columnId, 
            width: li.querySelector('input').value.trim() || '50%' 
          }));
          
          
          // Store existing column content before rebuilding
          const childrenByColumnId = {};
          try {
            const bodyComp = comp.find('.pf-section-body')[0];
            if (bodyComp) {
              const columnComps = comp.find('[data-role="pf-section-column"]').slice(0, 500);
              columnComps.forEach(column => {
                const columnId = column.getAttributes()['data-column-id'];
                if (columnId) {
                  // Serialize all children to HTML so they persist through rebuild
                  const children = column.components();
                  const childrenHtml = [];
                  children.forEach(child => {
                    try {
                      if (child && child.toHTML) {
                        childrenHtml.push(child.toHTML());
                      }
                    } catch(e) {
                      console.warn('[PF] Error serializing child:', e);
                    }
                  });
                  childrenByColumnId[columnId] = childrenHtml.join('');
                }
              });
            }
          } catch(e) {
            console.warn('[PF] Error storing existing columns:', e);
          }
          
          // Update component attributes
          const columnsJson = window.SectionComponent && window.SectionComponent.pfStringifyColumnsJson ? 
                          window.SectionComponent.pfStringifyColumnsJson(newColumns) : 
                          JSON.stringify(newColumns);
          
          // Update attributes
          comp.addAttributes({ 
            'columns-json': columnsJson
          });
          
          
          // CRITICAL: Store children BEFORE rebuilding, then rebuild and restore
          setTimeout(() => {
            try {
              // Mark that we're updating FIRST, before storing children
              comp.addAttributes({ '_updating-section': 'true' });
              
              // Rebuild the section structure
              if (window.SectionComponent && window.SectionComponent.buildWorkingSection) {
                window.SectionComponent.buildWorkingSection(comp);
                
                // Wait for rebuild to complete
                setTimeout(() => {
                  // Restore children to their columns after rebuild
                  const newBodyComp = comp.find('.pf-section-body')[0];
                  if (newBodyComp) {
                    const columns = comp.find('[data-role="pf-section-column"]').slice(0, 500);
                    columns.forEach(column => {
                      const columnId = column.getAttributes()['data-column-id'];
                      // Only restore children if this column ID exists in our stored children
                      if (columnId && childrenByColumnId.hasOwnProperty(columnId) && childrenByColumnId[columnId]) {
                        // Clear column first to avoid duplicates
                        // ROOT CAUSE FIX: Check drag flag - comp.components('') triggers ensureInList recursion
                        if (!window.__pf_isMovingComponent) {
                          column.components('');
                          // Append the stored HTML - GrapesJS will parse it
                          column.components(childrenByColumnId[columnId]);
                        }
                      }
                    });
                  }
                  
                  // Remove the updating flag
                  comp.addAttributes({ '_updating-section': '' });
                  
                }, 200);
              } else {
                comp.addAttributes({ '_updating-section': '' });
              }
            } catch(e) {
              console.error('[PF] Error rebuilding section structure:', e);
              comp.addAttributes({ '_updating-section': '' });
            }
          }, 100);
          
        } catch(e) { 
          console.error('[PF] Error saving section config:', e); 
          console.error('[PF] Error stack:', e.stack);
          alert('Error saving section: ' + (e.message || String(e)));
        }
        modal.style.display = 'none';
      };
    };
  }
}

