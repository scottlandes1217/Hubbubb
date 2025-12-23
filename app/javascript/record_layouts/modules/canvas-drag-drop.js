// Canvas Drag and Drop Module
// Handles all drag and drop operations on the canvas

export class CanvasDragDrop {
  constructor(builder) {
    this.builder = builder;
    this.editor = builder.editor;
  }

  setup() {
    this.setupCanvasDragAndDrop();
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
      
      if (dropLock) {
        return;
      }
      dropLock = true;
      setTimeout(() => { dropLock = false; }, 150);
      
      const dt = (e && e.dataTransfer) ? e.dataTransfer : {};
      const componentType = (dt && dt.getData && dt.getData('component-type')) || 
                           (window.rbDragPayload && window.rbDragPayload.type) || '';
      
      
      if (!componentType) {
        window.rbDragPayload = null;
        return;
      }
      
      const dropX = e.clientX;
      const dropY = e.clientY;
      const targetEl = e.target;
      
      
      // CRITICAL CHECK: prevent drops to the left of any section
      // This must run BEFORE checking for tab/section targets, because even if we're dropping
      // on a column inside a tab, if the drop coordinates are to the left of a section, we should reject
      try {
        // Find ALL sections, including nested ones
        const root = this.editor.DomComponents.getWrapper();
        const allSections = root.find('[data-comp-kind="record-section"], [data-gjs-type="record-section"]');
        
        // Also check root-level children
        const children = root.components().models || [];
        
        // Check all sections found
        for (let i = 0; i < allSections.length; i += 1) {
          const section = allSections[i];
          const sectionEl = section.getEl && section.getEl();
          if (!sectionEl) continue;
          
          const sectionRect = sectionEl.getBoundingClientRect();
          // Check if drop is vertically aligned with the section (within its top/bottom bounds)
          // Use a larger buffer to catch drops near the section
          const isVerticallyAligned = dropY >= sectionRect.top - 100 && dropY <= sectionRect.bottom + 100;
          
          // Check if drop is to the left of the section
          // Use a larger buffer to catch drops that are slightly to the left
          const isToLeftOfSection = dropX < sectionRect.left - 20;
          
          // ALLOW partials (like pet header) to be placed before sections/tabs
          // Check if we're dragging a partial component
          const isPartial = componentType === 'partial' || 
                           (window.rbDragPayload && window.rbDragPayload.type === 'partial');
          
          // If drop is vertically aligned with section but to the left of it, reject
          // UNLESS it's a partial (which should be allowed at the top)
          if (isVerticallyAligned && isToLeftOfSection && !isPartial) {
            return;
          }
          
          // Also check: if drop is within section bounds horizontally but not on a column, reject
          // This catches drops on the section body itself
          if (dropX >= sectionRect.left && dropX <= sectionRect.right && 
              dropY >= sectionRect.top && dropY <= sectionRect.bottom) {
            // Check if drop is actually on a column
            const columns = sectionEl.querySelectorAll && sectionEl.querySelectorAll('[data-role="pf-section-column"]');
            let isOnColumn = false;
            if (columns && columns.length > 0) {
              for (const col of columns) {
                const colRect = col.getBoundingClientRect();
                if (dropX >= colRect.left && dropX <= colRect.right && 
                    dropY >= colRect.top && dropY <= colRect.bottom) {
                  isOnColumn = true;
                  break;
                }
              }
            }
            if (!isOnColumn) {
              return;
            }
          }
        }
      } catch(err) {
        console.warn('[PF] Error in early section check:', err);
      }
      
      // First, check if we're dropping into a tab section or section column
      // CRITICAL: Check section column FIRST (more specific) before tab section (less specific)
      // This ensures that when a section is inside a tab, we use the section column, not the tab section
      let targetTabSection = null;
      let targetSectionColumn = null;
      let isInsideSectionContainer = false;
      try {
        // targetEl already defined above
        if (targetEl) {
          // FIRST: Look for section column in the target's ancestors (most specific)
          const sectionColumnEl = targetEl.closest && targetEl.closest('[data-role="pf-section-column"]');
          if (sectionColumnEl) {
            // Verify the drop is actually on the column, not just near it
            const dropX = e.clientX;
            const dropY = e.clientY;
            const columnRect = sectionColumnEl.getBoundingClientRect();
            
            // Check if drop is actually within column bounds
            if (dropX >= columnRect.left && dropX <= columnRect.right && 
                dropY >= columnRect.top && dropY <= columnRect.bottom) {
              // Find the GrapesJS component for this section column
              const root = this.editor.DomComponents.getWrapper();
              const columns = root.find('[data-role="pf-section-column"]');
              targetSectionColumn = columns.find(s => s.getEl() === sectionColumnEl);
              if (targetSectionColumn) {
                // Found a section column - use it and skip tab section check
              }
            }
          }
          
          // SECOND: Only check for tab section if we didn't find a section column
          if (!targetSectionColumn) {
          const tabSectionEl = targetEl.closest && targetEl.closest('[data-role="pf-tab-section"]');
          if (tabSectionEl) {
            // Find the GrapesJS component for this tab section
            const root = this.editor.DomComponents.getWrapper();
            const sections = root.find('[data-role="pf-tab-section"]');
            targetTabSection = sections.find(s => s.getEl() === tabSectionEl);
            if (targetTabSection) {
              }
            }
          }
          
          // If we still don't have a target, check for section container issues
          if (!targetTabSection && !targetSectionColumn) {
            // Check if we're inside a section container/body but NOT on a column
            // This means the drop should be rejected (can't drop on section container/body itself)
            const sectionContainerEl = targetEl.closest && targetEl.closest('.pf-section-container, .pf-section, .pf-section-body');
            if (sectionContainerEl) {
              // Check if we're NOT inside a column
              const isInsideColumn = targetEl.closest && targetEl.closest('[data-role="pf-section-column"]');
              if (!isInsideColumn) {
                isInsideSectionContainer = true;
              }
            }
            
            // Also check if the target element itself is a section body or section wrapper
            if (targetEl && (targetEl.classList.contains('pf-section-body') || targetEl.classList.contains('pf-section'))) {
              // Check if we're NOT inside a column
              const isInsideColumn = targetEl.closest && targetEl.closest('[data-role="pf-section-column"]');
              // If we're directly on the body/wrapper, we're definitely not on a column
              const isDirectlyOnBody = targetEl.classList.contains('pf-section-body') || targetEl.classList.contains('pf-section');
              if (isDirectlyOnBody && !isInsideColumn) {
                isInsideSectionContainer = true;
              }
            }
          }
        }
      } catch(err) {
        console.warn('[PF] Error detecting tab section or section column:', err);
      }
      
      // If dropping on section container/body (but not on a column), reject the drop
      if (isInsideSectionContainer && !targetSectionColumn) {
        return;
      }
      
      // Additional safety check: if we have a targetSectionColumn, verify the drop is actually on it
      if (targetSectionColumn) {
        const columnEl = targetSectionColumn.getEl && targetSectionColumn.getEl();
        if (columnEl) {
          const dropX = e.clientX;
          const dropY = e.clientY;
          const columnRect = columnEl.getBoundingClientRect();
          // Check if drop is actually within column bounds
          if (dropX < columnRect.left || dropX > columnRect.right || 
              dropY < columnRect.top || dropY > columnRect.bottom) {
            return;
          }
        } else {
          // Column element not found, reject
          return;
        }
      }
      
      // Final check: if drop is on section body but we don't have a targetSectionColumn, reject
      const finalTargetEl = e.target;
      if (finalTargetEl) {
        const isOnSectionBody = finalTargetEl.classList && (
          finalTargetEl.classList.contains('pf-section-body') || 
          finalTargetEl.classList.contains('pf-section')
        );
        const isInsideColumn = finalTargetEl.closest && finalTargetEl.closest('[data-role="pf-section-column"]');
        if (isOnSectionBody && !isInsideColumn && !targetSectionColumn) {
          return;
        }
      }
      
      const root = this.editor.DomComponents.getWrapper();
      let insertAt = root.components().length;
      
      
      // Calculate drop position based on Y coordinate (only if not dropping into tab section or section column)
      if (!targetTabSection && !targetSectionColumn) {
        try {
          const dropY = e.clientY;
          const dropX = e.clientX;
          const children = root.components().models || [];
          
          for (let i = 0; i < children.length; i += 1) {
            const el = children[i].getEl && children[i].getEl();
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            
            // Check if this is a section component
            // If dropping near a section (horizontally within its bounds), check if we're on a column
            if (this.builder.isSection(children[i])) {
              if (dropX >= rect.left && dropX <= rect.right && dropY >= rect.top && dropY <= rect.bottom) {
                // We're within the section's bounds - check if we're on a column
                const sectionEl = el;
                const sectionBody = sectionEl.querySelector && sectionEl.querySelector('.pf-section-body');
                
                // Check if the drop point is actually on a column
                const columns = sectionEl.querySelectorAll && sectionEl.querySelectorAll('[data-role="pf-section-column"]');
                let isOnColumn = false;
                if (columns && columns.length > 0) {
                  for (const col of columns) {
                    const colRect = col.getBoundingClientRect();
                    if (dropX >= colRect.left && dropX <= colRect.right && dropY >= colRect.top && dropY <= colRect.bottom) {
                      isOnColumn = true;
                      break;
                    }
                  }
                }
                
                // If we're within section bounds but not on a column, reject
                if (!isOnColumn) {
                  return;
                }
              } else {
                // Check if drop is to the left of this section
                const isVerticallyAligned = dropY >= rect.top && dropY <= rect.bottom;
                const isToLeft = dropX < rect.left;
                // ALLOW partials (like pet header) to be placed before sections/tabs
                const isPartial = componentType === 'partial' || 
                                 (window.rbDragPayload && window.rbDragPayload.type === 'partial');
                if (isVerticallyAligned && isToLeft && !isPartial) {
                  return;
                }
              }
            }
            
            if (dropY < rect.top + rect.height / 2) {
              insertAt = i;
              break;
            }
          }
          
          // Additional check: prevent drops to the left of any section
          // Check all sections to see if the drop is to the left of any of them
          for (let i = 0; i < children.length; i += 1) {
            const child = children[i];
            if (this.builder.isSection(child)) {
              const sectionEl = child.getEl && child.getEl();
              if (sectionEl) {
                const sectionRect = sectionEl.getBoundingClientRect();
                
                // Check if drop is vertically aligned with the section (within its top/bottom bounds)
                const isVerticallyAligned = dropY >= sectionRect.top && dropY <= sectionRect.bottom;
                
                // Check if drop is to the left of the section
                const isToLeftOfSection = dropX < sectionRect.left;
                
                // ALLOW partials (like pet header) to be placed before sections/tabs
                const isPartial = componentType === 'partial' || 
                                 (window.rbDragPayload && window.rbDragPayload.type === 'partial');
                
                // If drop is vertically aligned with section but to the left of it, reject
                // UNLESS it's a partial (which should be allowed at the top)
                if (isVerticallyAligned && isToLeftOfSection && !isPartial) {
                  return;
                }
                
                // If drop is within section bounds, check if it's on a column
                if (dropX >= sectionRect.left && dropX <= sectionRect.right && 
                    dropY >= sectionRect.top && dropY <= sectionRect.bottom) {
                  const columns = sectionEl.querySelectorAll && sectionEl.querySelectorAll('[data-role="pf-section-column"]');
                  let isOnColumn = false;
                  if (columns && columns.length > 0) {
                    for (const col of columns) {
                      const colRect = col.getBoundingClientRect();
                      if (dropX >= colRect.left && dropX <= colRect.right && 
                          dropY >= colRect.top && dropY <= colRect.bottom) {
                        isOnColumn = true;
                        break;
                      }
                    }
                  }
                  if (!isOnColumn) {
                    return;
                  }
                }
              }
            }
          }
          
          // Also check if we're inserting right before a section or tabs
          if (insertAt < children.length) {
            const nextComponent = children[insertAt];
            const nextAttrs = nextComponent.getAttributes ? nextComponent.getAttributes() : {};
            const isNextSection = nextAttrs['data-comp-kind'] === 'record-section' || nextComponent.get('type') === 'record-section';
            const isNextTabs = nextAttrs['data-comp-kind'] === 'record-tabs' || nextComponent.get('type') === 'record-tabs';
            
            // ALLOW partials (like pet header) to be placed before sections/tabs
            const isPartial = componentType === 'partial' || 
                             (window.rbDragPayload && window.rbDragPayload.type === 'partial');
            
            if ((isNextSection || isNextTabs) && !isPartial) {
              const nextEl = nextComponent.getEl && nextComponent.getEl();
              if (nextEl) {
                const nextRect = nextEl.getBoundingClientRect();
                // If drop is to the left of the section/tabs (horizontally), reject it
                if (dropX < nextRect.left) {
                  return;
                }
              }
            }
          }
        } catch(err) {
          console.warn('[PF] Error in insert position calculation:', err);
        }
      }
      
      
      // FINAL CHECK: If we're inserting before a section or tabs, verify the drop is not to the left of it
      // This catches cases where GrapesJS calculates insertAt but the drop is actually to the left
      if (!targetTabSection && !targetSectionColumn) {
        try {
          const root = this.editor.DomComponents.getWrapper();
          const children = root.components().models || [];
          if (insertAt < children.length) {
            const nextComponent = children[insertAt];
            const nextAttrs = nextComponent.getAttributes ? nextComponent.getAttributes() : {};
            const isNextSection = nextAttrs['data-comp-kind'] === 'record-section' || nextComponent.get('type') === 'record-section';
            const isNextTabs = nextAttrs['data-comp-kind'] === 'record-tabs' || nextComponent.get('type') === 'record-tabs';
            
            // ALLOW partials (like pet header) to be placed before sections/tabs
            const isPartial = componentType === 'partial' || 
                             (window.rbDragPayload && window.rbDragPayload.type === 'partial');
            
            if ((isNextSection || isNextTabs) && !isPartial) {
              const nextEl = nextComponent.getEl && nextComponent.getEl();
              if (nextEl) {
                const nextRect = nextEl.getBoundingClientRect();
                // Check if drop is to the left of the section/tabs
                if (dropX < nextRect.left - 20) {
                  return;
                }
                
                // Also check if drop is vertically aligned and to the left
                const isVerticallyAligned = dropY >= nextRect.top - 100 && dropY <= nextRect.bottom + 100;
                if (isVerticallyAligned && dropX < nextRect.left - 20) {
                  return;
                }
              }
            }
          }
        } catch(err) {
          console.warn('[PF] Error in final section check:', err);
        }
      }
      
      if (componentType === 'record-tabs') {
        // Add tabs component - check if dropping into a container first
        let comp;
        if (targetTabSection) {
          // Add to tab section
          const added = targetTabSection.append({ type: 'record-tabs' });
          comp = Array.isArray(added) ? added[0] : added;
        } else if (targetSectionColumn) {
          // Verify we're actually on a column (not just the section body)
          const columnEl = targetSectionColumn.getEl();
          if (columnEl) {
            const dropX = e.clientX;
            const dropY = e.clientY;
            const columnRect = columnEl.getBoundingClientRect();
            // Check if drop is actually within column bounds
            if (dropX < columnRect.left || dropX > columnRect.right || dropY < columnRect.top || dropY > columnRect.bottom) {
              return;
            }
          }
          // Add to section column
          const added = targetSectionColumn.append({ type: 'record-tabs' });
          comp = Array.isArray(added) ? added[0] : added;
        } else {
          // Add to root
          comp = this.editor.DomComponents.addComponent({ type: 'record-tabs' }, { at: insertAt });
        }
        
        if (comp) {
        comp.addAttributes({ 'data-comp-id': `c_${Date.now()}_${Math.random().toString(36).slice(2,8)}` });
          // CRITICAL: Ensure it's draggable immediately
          comp.set({
            draggable: true,
            selectable: true,
            hoverable: true,
            highlightable: true,
            droppable: false
          });
          // Also set DOM attributes
          setTimeout(() => {
            const el = comp.getEl();
            if (el) {
              el.setAttribute('draggable', 'true');
              el.style.cursor = 'move';
            }
          }, 10);
        }
        // Lock inner components for tabs (but tabs have special handling, so we'll let the tabs component handle it)
      } else if (componentType === 'record-section') {
        // CRITICAL: Verify component type is registered before trying to use it
        const types = this.editor.DomComponents.getTypes();
        const typeNames = typeof types === 'object' && !Array.isArray(types) ? Object.keys(types) : [];
        const isRegistered = typeNames.includes('record-section') || types['record-section'];
        
        if (!isRegistered) {
          console.error('[PF] record-section component type not registered! Attempting to register now...');
          // Try to register it now
          if (window.SectionComponent && window.SectionComponent.defineSectionComponent) {
            try {
              window.SectionComponent.defineSectionComponent(this.editor);
              console.log('[PF] Section component type registered successfully');
            } catch(err) {
              console.error('[PF] Failed to register section component:', err);
              alert('Error: Section component type not available. Please refresh the page.');
              return;
            }
          } else {
            console.error('[PF] SectionComponent not available!');
            alert('Error: Section component not loaded. Please refresh the page.');
            return;
          }
        }
        
        // Add section component - check if dropping into a container first
        let comp;
        try {
        if (targetTabSection) {
          // Add to tab section
          const added = targetTabSection.append({ type: 'record-section' });
          comp = Array.isArray(added) ? added[0] : added;
        } else if (targetSectionColumn) {
          // Verify we're actually on a column (not just the section body)
          const columnEl = targetSectionColumn.getEl();
          if (columnEl) {
            const dropX = e.clientX;
            const dropY = e.clientY;
            const columnRect = columnEl.getBoundingClientRect();
            // Check if drop is actually within column bounds
            if (dropX < columnRect.left || dropX > columnRect.right || dropY < columnRect.top || dropY > columnRect.bottom) {
              return;
            }
          }
          // Add to section column
          const added = targetSectionColumn.append({ type: 'record-section' });
          comp = Array.isArray(added) ? added[0] : added;
        } else {
          // Add to root
          comp = this.editor.DomComponents.addComponent({ type: 'record-section' }, { at: insertAt });
          }
        } catch(err) {
          console.error('[PF] Error adding section component:', err);
          alert('Error adding section component. Please try again.');
          return;
        }
        
        if (comp) {
          comp.addAttributes({ 'data-comp-id': `c_${Date.now()}_${Math.random().toString(36).slice(2,8)}` });
          // CRITICAL: Ensure it's draggable immediately, even when inside tabs
          comp.set({
            draggable: true,  // Always draggable, even inside tabs
            selectable: true,
            hoverable: true,
            highlightable: true,
            droppable: false  // Sections themselves are not droppable, only their columns
          });
          // Also set DOM attributes
          setTimeout(() => {
            const el = comp.getEl();
            if (el) {
              el.setAttribute('draggable', 'true');
              el.style.cursor = 'move';
              el.style.pointerEvents = 'auto';
              
              // CRITICAL: Ensure section columns are droppable, especially when inside tabs
              // This fixes the issue where fields can't be added to sections inside tabs
              setTimeout(() => {
                const sectionColumns = el.querySelectorAll('[data-role="pf-section-column"]');
                sectionColumns.forEach(col => {
                  // Find the GrapesJS component for this column
                  const root = this.editor.DomComponents.getWrapper();
                  const columns = root.find('[data-role="pf-section-column"]');
                  const columnComp = columns.find(c => c.getEl() === col);
                  if (columnComp) {
                    // Ensure column is droppable and accepts the right component types
                    columnComp.set({
                      droppable: true,
                      accept: ['record-field', 'record-partial', 'record-section', 'record-tabs'],
                      selectable: false,
                      hoverable: false,
                      highlightable: false,
                      draggable: false
                    });
                  }
                });
              }, 100); // Wait a bit for section structure to be built
            }
          }, 10);
        }
        // Section component handles its own structure
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
        } else if (targetSectionColumn) {
          // Verify we're actually on a column (not just the section body)
          const columnEl = targetSectionColumn.getEl();
          if (columnEl) {
            const dropX = e.clientX;
            const dropY = e.clientY;
            const columnRect = columnEl.getBoundingClientRect();
            // Check if drop is actually within column bounds
            if (dropX < columnRect.left || dropX > columnRect.right || dropY < columnRect.top || dropY > columnRect.bottom) {
              return;
            }
          }
          // Add to section column
          const added = targetSectionColumn.append({ type: 'record-partial' });
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
                this.builder.addDeleteButton(comp);
                // Lock all inner components so they can't be selected/edited individually
                this.builder.lockInnerComponents(comp);
              } else {
                // Even without preview, add delete button
                this.builder.addDeleteButton(comp);
              }
            } else {
              this.builder.addDeleteButton(comp);
            }
          } catch(_) {
            // Fallback: add delete button even if preview fails
            this.builder.addDeleteButton(comp);
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
        } else if (targetSectionColumn) {
          // Verify we're actually on a column (not just the section body)
          const columnEl = targetSectionColumn.getEl();
          if (columnEl) {
            const dropX = e.clientX;
            const dropY = e.clientY;
            const columnRect = columnEl.getBoundingClientRect();
            // Check if drop is actually within column bounds
            if (dropX < columnRect.left || dropX > columnRect.right || dropY < columnRect.top || dropY > columnRect.bottom) {
              return;
            }
          }
          // Add to section column
          const added = targetSectionColumn.append({ type: 'record-field' });
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
              this.builder.addDeleteButton(comp);
              // Lock all inner components so they can't be selected/edited individually
              this.builder.lockInnerComponents(comp);
              if (comp.view && comp.view.render) {
                comp.view.render();
              }
            } else {
              // Fallback: add delete button even if preview script is missing
              this.builder.addDeleteButton(comp);
            }
          } catch(_) {
            // Fallback: add delete button even if preview fails
            this.builder.addDeleteButton(comp);
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
          // Check if we're dragging over a section body (not a column) - prevent drop indicator
          const sectionBody = e.target.closest && e.target.closest('.pf-section-body');
          const sectionColumn = e.target.closest && e.target.closest('[data-role="pf-section-column"]');
          if (sectionBody && !sectionColumn) {
            // We're on the section body but not on a column - prevent the drop
            e.dataTransfer.dropEffect = 'none';
            return;
          }
          
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'copy';
          
          // Highlight tab sections or section columns when dragging over them
          const tabSection = e.target.closest && e.target.closest('[data-role="pf-tab-section"]');
          if (tabSection) {
            tabSection.classList.add('dragover');
            // Remove dragover from section columns
            document.querySelectorAll('.pf-section-column.dragover').forEach(s => {
              s.classList.remove('dragover');
            });
          } else if (sectionColumn) {
            sectionColumn.classList.add('dragover');
            // Remove dragover from tab sections
            document.querySelectorAll('.pf-tab-section.dragover').forEach(s => {
              s.classList.remove('dragover');
            });
          } else {
            // Remove dragover class from all tab sections and section columns
            document.querySelectorAll('.pf-tab-section.dragover, .pf-section-column.dragover').forEach(s => {
              s.classList.remove('dragover');
            });
          }
        }
      } catch(_) {}
    });
    
    canvasContainer.addEventListener('dragleave', (e) => {
      // Remove dragover class when leaving
      document.querySelectorAll('.pf-tab-section.dragover, .pf-section-column.dragover').forEach(s => {
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
        }
        return;
      }
      
      // Remove dragover class on drop
      document.querySelectorAll('.pf-tab-section.dragover, .pf-section-column.dragover').forEach(s => {
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
                // Check if we're dragging over a section body (not a column) - prevent drop indicator
                const sectionBody = e.target.closest && e.target.closest('.pf-section-body');
                const sectionColumn = e.target.closest && e.target.closest('[data-role="pf-section-column"]');
                if (sectionBody && !sectionColumn) {
                  // We're on the section body but not on a column - prevent the drop
                  e.dataTransfer.dropEffect = 'none';
                  return;
                }
                
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';
                
                // Highlight tab sections or section columns when dragging over them
                const tabSection = e.target.closest && e.target.closest('[data-role="pf-tab-section"]');
                if (tabSection) {
                  tabSection.classList.add('dragover');
                  // Remove dragover from section columns
                  iframe.contentDocument.querySelectorAll('.pf-section-column.dragover').forEach(s => {
                    s.classList.remove('dragover');
                  });
                } else if (sectionColumn) {
                  sectionColumn.classList.add('dragover');
                  // Remove dragover from tab sections
                  iframe.contentDocument.querySelectorAll('.pf-tab-section.dragover').forEach(s => {
                    s.classList.remove('dragover');
                  });
                } else {
                  // Remove dragover class from all tab sections and section columns
                  iframe.contentDocument.querySelectorAll('.pf-tab-section.dragover, .pf-section-column.dragover').forEach(s => {
                    s.classList.remove('dragover');
                  });
                }
              }
            } catch(_) {}
          });
          
          iframe.contentDocument.addEventListener('dragleave', (e) => {
            // Remove dragover class when leaving
            try {
              iframe.contentDocument.querySelectorAll('.pf-tab-section.dragover, .pf-section-column.dragover').forEach(s => {
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
                }
                return;
              }
              
              // Remove dragover class on drop
              iframe.contentDocument.querySelectorAll('.pf-tab-section.dragover, .pf-section-column.dragover').forEach(s => {
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
}


