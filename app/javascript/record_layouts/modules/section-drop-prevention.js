// Section Drop Prevention Module
// Prevents drops on section containers and bodies, only allows drops on columns

export class SectionDropPrevention {
  constructor(builder) {
    this.builder = builder;
    this.editor = builder.editor;
    
    // Track original position of components being dragged
    this.draggedComponentOriginalIndex = null;
    this.draggedComponentOriginalParent = null;
    this.draggedComponent = null;
    
    // Track when components are being moved to prevent section rebuilds
    this.isMovingComponent = false;
    this.draggedComponentForFlags = null;
  }

  setup() {
    this.setupSectionDropPrevention();
  }

  setupSectionDropPrevention() {
    // Prevent GrapesJS from allowing drops on section containers and bodies
    // Only columns should accept drops
    if (!this.editor) return;
    
    // Intercept component:drag:enter to prevent drop indicator from showing
    this.editor.on('component:drag:enter', (component, target) => {
      try {
        if (!target) return;
        
        const targetAttrs = target.getAttributes ? target.getAttributes() : {};
        const targetEl = target.getEl && target.getEl();
        
        // Check if target is a valid drop container (tab section or section column)
        const isTabSection = targetAttrs['data-role'] === 'pf-tab-section' || 
                            (targetEl && targetEl.classList.contains('pf-tab-section'));
        const isSectionColumn = targetAttrs['data-role'] === 'pf-section-column' || 
                               (targetEl && targetEl.classList.contains('pf-section-column'));
        
        // If it's a valid drop container, allow the drop
        if (isTabSection || isSectionColumn) {
          return; // Allow the drop
        }
        
        // Check if target is a section container or body (not a column)
        const isSectionContainer = targetAttrs['data-comp-kind'] === 'record-section' || target.get('type') === 'record-section';
        const isSectionBody = targetEl && (targetEl.classList.contains('pf-section-body') || targetEl.classList.contains('pf-section'));
        
        // If it's a section container or body (but not a column), prevent the drop
        if ((isSectionContainer || isSectionBody) && !isSectionColumn) {
          // Set droppable to false to prevent the drop indicator
          if (target.set) {
            target.set({ droppable: false });
          }
          return false; // Prevent the drop indicator
        }
        
        // Check if we're about to drop before a section at root level
        const root = this.editor.DomComponents.getWrapper();
        const rootChildren = root.components().models || [];
        const targetIndex = rootChildren.findIndex(c => c === target);
        
        // If target is at root level, check if it's before a section
        if (targetIndex !== -1) {
          // Find sections after this position
          for (let i = targetIndex; i < rootChildren.length; i += 1) {
            const child = rootChildren[i];
            if (this.builder.isSection(child)) {
              // We're inserting before a section - check if the drag is coming from within a section/tab
              // If so, prevent it (can't drag from inside to left of section)
              const draggedComponent = component && component.target ? component.target : component;
              if (draggedComponent) {
                let currentParent = draggedComponent.parent && draggedComponent.parent();
                let isFromSectionOrTab = false;
                
                // Check if dragged component is from inside a section or tab
                while (currentParent && currentParent !== root) {
                  const parentAttrs = currentParent.getAttributes ? currentParent.getAttributes() : {};
                  if (parentAttrs['data-comp-kind'] === 'record-section' || 
                      parentAttrs['data-comp-kind'] === 'record-tabs' ||
                      currentParent.get('type') === 'record-section' ||
                      currentParent.get('type') === 'record-tabs') {
                    isFromSectionOrTab = true;
                    break;
                  }
                  currentParent = currentParent.parent && currentParent.parent();
                }
                
                if (isFromSectionOrTab && targetIndex < i) {
                  if (target.set) {
                    target.set({ droppable: false });
                  }
                  return false; // Prevent the drop
                }
              }
              break;
            }
          }
        }
      } catch(err) {
        console.warn('[PF] Error in section drop prevention:', err);
      }
    });
    
    // Track when a component starts being dragged
    // MINIMAL PATCH: Patch ensureInList to prevent recursion during drags
    this.editor.on('component:drag:start', (data) => {
      // Set flags to prevent our custom handlers from interfering
      window.__pf_isMovingComponent = true;
      this.isMovingComponent = true;
      
      // CRITICAL: Patch ensureInList to prevent infinite recursion
      // This is a minimal patch that just limits recursion depth
      try {
        const Components = this.editor.Components;
        if (Components && Components.Component) {
          // Reset counter on each drag start
          window.__pf_ensureInListDepth = 0;
          
          // Only patch if not already patched
          if (!Components.Component.prototype.__pf_ensureInListPatched) {
            const originalEnsureInList = Components.Component.prototype.ensureInList;
            const MAX_DEPTH = 5; // Very low limit to catch recursion early
            
            Components.Component.prototype.ensureInList = function(...args) {
              if (window.__pf_isMovingComponent) {
                window.__pf_ensureInListDepth = (window.__pf_ensureInListDepth || 0) + 1;
                if (window.__pf_ensureInListDepth > MAX_DEPTH) {
                  console.warn('[PF] Prevented ensureInList recursion (depth:', window.__pf_ensureInListDepth, ')');
                  window.__pf_ensureInListDepth = 0;
                  return this; // Break recursion
                }
                const result = originalEnsureInList.apply(this, args);
                window.__pf_ensureInListDepth = (window.__pf_ensureInListDepth || 1) - 1;
                return result;
              }
              return originalEnsureInList.apply(this, args);
            };
            
            Components.Component.prototype.__pf_originalEnsureInList = originalEnsureInList;
            Components.Component.prototype.__pf_ensureInListPatched = true;
          }
        }
      } catch(err) {
        console.warn('[PF] Error patching ensureInList:', err);
      }
      
      try {
        // Extract the actual component from the event data
        // The event passes {sorter, target, parent, index}
        let actualComponent = data && data.target ? data.target : null;
        if (!actualComponent || !actualComponent.cid) {
          return;
        }
        
        // CRITICAL FIX: If we clicked on an inner container of a tab/section, find the parent tab/section component
        const compType = actualComponent.get('type');
        const compAttrs = actualComponent.getAttributes ? actualComponent.getAttributes() : {};
        const isInnerContainer = !compType || compType === '' || 
                                compAttrs.class?.includes('pf-tabs') || 
                                compAttrs.class?.includes('pf-section') ||
                                compAttrs['data-role'] === 'pf-tab-section' ||
                                compAttrs['data-role'] === 'pf-section-column';
        
        if (isInnerContainer) {
          // Find the parent tab or section component
          let parent = actualComponent.parent && actualComponent.parent();
          while (parent) {
            const parentType = parent.get('type');
            const parentAttrs = parent.getAttributes ? parent.getAttributes() : {};
            if (parentType === 'record-tabs' || parentType === 'record-section' ||
                parentAttrs['data-comp-kind'] === 'record-tabs' || parentAttrs['data-comp-kind'] === 'record-section') {
              actualComponent = parent; // Use the parent component instead
              break;
            }
            parent = parent.parent && parent.parent();
          }
        }
        
        // Debug: Check if this is a tab or section
        const finalType = actualComponent.get('type');
        const finalAttrs = actualComponent.getAttributes ? actualComponent.getAttributes() : {};
        const isTabOrSection = finalType === 'record-tabs' || finalType === 'record-section' ||
                              finalAttrs['data-comp-kind'] === 'record-tabs' || finalAttrs['data-comp-kind'] === 'record-section';
        
        if (isTabOrSection) {
          console.warn('[PF] Tab/Section drag started:', {
            type: finalType,
            dataCompKind: finalAttrs['data-comp-kind'],
            draggable: actualComponent.get('draggable'),
            hasEl: !!actualComponent.getEl(),
            wasInnerContainer: isInnerContainer
          });
        }
        
        this.draggedComponent = actualComponent;
        
        // Get parent from the data or from the component
        const parent = (data && data.parent) || (actualComponent.parent && actualComponent.parent());
        if (parent) {
          const siblings = parent.components().models || [];
          this.draggedComponentOriginalIndex = data.index !== undefined ? data.index : siblings.findIndex(c => c === actualComponent);
          this.draggedComponentOriginalParent = parent;
        } else {
          // Component might be at root level
          const root = this.editor.DomComponents.getWrapper();
          const children = root.components().models || [];
          this.draggedComponentOriginalIndex = data.index !== undefined ? data.index : children.findIndex(c => c === actualComponent);
          this.draggedComponentOriginalParent = root;
        }
      } catch(err) {
        console.warn('[PF] Error tracking drag start:', err);
      }
    });
    
    // SIMPLE APPROACH: Don't intercept component:drag:end at all
    // Let GrapesJS handle everything naturally - just set flags to prevent rebuilds
    this.editor.on('component:drag:end', (data) => {
      // Just mark any parent sections to prevent rebuilds, then exit
      // Don't manipulate components - that causes recursion
      try {
        const component = (data && data.target) || this.draggedComponent;
        if (!component || !component.cid) {
          return;
        }
        
        let parent = component.parent ? component.parent() : null;
        while (parent) {
          const parentAttrs = parent.getAttributes ? parent.getAttributes() : {};
          const parentType = parent.get('type');
          if (parentType === 'record-section' || parentAttrs['data-comp-kind'] === 'record-section') {
            parent.addAttributes({ '_moving-component': 'true' });
            setTimeout(() => {
              try {
                parent.removeAttributes('_moving-component');
              } catch(_) {}
            }, 500);
            break;
          }
          parent = parent.parent ? parent.parent() : null;
        }
      } catch(err) {
        // Ignore errors
      }
      
      // Clear tracking
      this.draggedComponentOriginalIndex = null;
      this.draggedComponentOriginalParent = null;
      this.draggedComponent = null;
      
      // Let GrapesJS handle everything - don't intercept anything
      return;
    });
    
    // SIMPLE APPROACH: Don't intercept component:add either
    // Let GrapesJS handle everything - just check flags in component:update
    
    // Removed component:add handler - let GrapesJS handle everything naturally
    
    // Track when components are being moved to prevent section rebuilds
    window.__pf_isMovingComponent = false; // Global flag for section component to check
    
    // Second component:drag:start handler - just set flags on sections
    this.editor.on('component:drag:start', (component) => {
      this.draggedComponentForFlags = component;
      
      // Set flags on sections if component is valid
      if (component && typeof component.get === 'function') {
        try {
          const compAttrs = component.getAttributes ? component.getAttributes() : {};
          const compType = component.get('type');
          const isSection = compType === 'record-section' || compAttrs['data-comp-kind'] === 'record-section';
          
          if (isSection && component.addAttributes) {
            component.addAttributes({ '_moving-component': 'true' });
          }
          
          // Mark parent sections
          if (component.parent) {
            let parent = component.parent();
            while (parent && typeof parent.get === 'function') {
              const parentAttrs = parent.getAttributes ? parent.getAttributes() : {};
              const parentType = parent.get('type');
              if (parentType === 'record-section' || parentAttrs['data-comp-kind'] === 'record-section') {
                if (parent.addAttributes) {
                  parent.addAttributes({ '_moving-component': 'true' });
                }
                break;
              }
              parent = parent.parent ? parent.parent() : null;
            }
          }
        } catch(err) {
          // Ignore errors - flags are optional
        }
      }
    });
    this.editor.on('component:drag:end', () => {
      // Clear flags and restore ensureInList after a delay
      setTimeout(() => {
        this.isMovingComponent = false;
        window.__pf_isMovingComponent = false;
        
        // Reset counter and restore ensureInList after operations complete
        window.__pf_ensureInListDepth = 0;
        setTimeout(() => {
          try {
            const Components = this.editor.Components;
            if (Components && Components.Component && Components.Component.prototype.__pf_ensureInListPatched) {
              if (Components.Component.prototype.__pf_originalEnsureInList) {
                Components.Component.prototype.ensureInList = Components.Component.prototype.__pf_originalEnsureInList;
                delete Components.Component.prototype.__pf_originalEnsureInList;
                delete Components.Component.prototype.__pf_ensureInListPatched;
              }
            }
          } catch(err) {
            console.warn('[PF] Error restoring ensureInList:', err);
          }
        }, 300);
        
        // Clear _moving-component flags after a delay to allow move to complete
        setTimeout(() => {
          
          // Clear _moving-component flags
          if (this.draggedComponentForFlags && typeof this.draggedComponentForFlags.removeAttributes === 'function') {
            try {
              this.draggedComponentForFlags.removeAttributes('_moving-component');
              
              // Clear flags on parent sections
              if (this.draggedComponentForFlags.parent) {
                let parent = this.draggedComponentForFlags.parent();
                while (parent && typeof parent.get === 'function') {
                  const parentAttrs = parent.getAttributes ? parent.getAttributes() : {};
                  const parentType = parent.get('type');
                  if (parentType === 'record-section' || parentAttrs['data-comp-kind'] === 'record-section') {
                    if (parent.removeAttributes) {
                      parent.removeAttributes('_moving-component');
                    }
                    break;
                  }
                  parent = parent.parent ? parent.parent() : null;
                }
              }
            } catch(_) {}
          }
          this.draggedComponentForFlags = null;
        }, 300);
      }, 200);
    });
    
    // Also listen to component:update to ensure section containers stay non-droppable
    // BUT: Don't call component.set() during drags - that causes recursion!
    this.editor.on('component:update', (component) => {
      // CRITICAL: Skip ALL updates if a component is being moved
      // This prevents ensureInList recursion by stopping rebuilds before they start
      // Check both local flag and global flag FIRST, before any other checks
      if (this.isMovingComponent || window.__pf_isMovingComponent) {
        return;
      }
      
      // Also check if the component itself has the _moving-component attribute
      const compAttrs = component.getAttributes ? component.getAttributes() : {};
      if (compAttrs['_moving-component'] === 'true') {
        return;
      }
      
      // CRITICAL: Also check if ANY parent has the _moving-component attribute
      // This catches cases where a nested component is being updated during a drag
      let parent = component.parent ? component.parent() : null;
      while (parent) {
        const parentAttrs = parent.getAttributes ? parent.getAttributes() : {};
        if (parentAttrs['_moving-component'] === 'true') {
          return; // Parent is being moved, skip this update
        }
        parent = parent.parent ? parent.parent() : null;
      }
      
      // DON'T call component.set() here - it triggers more updates which cause recursion!
      // These properties should be set in component definition or on initial creation only
      // We can't safely modify component properties during component:update events
      
      // Removed all component.set() calls and component manipulation from this handler
      // to prevent recursion during drag operations
    });
    
    // Intercept GrapesJS's canvas:drop event to prevent drops on section bodies and to the left of sections
    // Also handle drops into tab sections and section columns
    this.editor.on('canvas:drop', (event) => {
      try {
        // Get drop coordinates from the event
        const dropEvent = event.originalEvent || event;
        const dropX = dropEvent.clientX;
        const dropY = dropEvent.clientY;
        
        // Check if we're dropping into a tab section or section column
        const target = event.target;
        if (target) {
          const targetEl = target.getEl && target.getEl();
          if (targetEl) {
            // Check if drop is on a tab section or section column
            const isTabSection = targetEl.classList && targetEl.classList.contains('pf-tab-section') ||
                                (targetEl.getAttribute && targetEl.getAttribute('data-role') === 'pf-tab-section');
            const isSectionColumn = targetEl.classList && targetEl.classList.contains('pf-section-column') ||
                                   (targetEl.getAttribute && targetEl.getAttribute('data-role') === 'pf-section-column');
            
            // If dropping into a valid container, allow it (GrapesJS will handle it via accept property)
            if (isTabSection || isSectionColumn) {
              return; // Allow the drop
            }
            
            // Check if drop is on section body (not a column)
            const isSectionBody = targetEl.classList && (
              targetEl.classList.contains('pf-section-body') || 
              targetEl.classList.contains('pf-section')
            );
            
            if (isSectionBody && !isSectionColumn) {
              if (event.stop) event.stop();
              if (event.preventDefault) event.preventDefault();
              return false;
            }
          }
        }
        
        if (dropX === undefined || dropY === undefined) {
          return;
        }
        
        // Check if drop is to the left of any section
        const root = this.editor.DomComponents.getWrapper();
        const children = root.components().models || [];
        for (let i = 0; i < children.length; i += 1) {
          const child = children[i];
          if (this.builder.isSection(child)) {
            const sectionEl = child.getEl && child.getEl();
            if (sectionEl) {
              const sectionRect = sectionEl.getBoundingClientRect();
              
              // Check if drop is vertically aligned with the section
              const isVerticallyAligned = dropY >= sectionRect.top - 50 && dropY <= sectionRect.bottom + 50;
              
              // Check if drop is to the left of the section
              const isToLeftOfSection = dropX < sectionRect.left - 10;
              
              // If drop is vertically aligned with section but to the left of it, reject
              if (isVerticallyAligned && isToLeftOfSection) {
                if (event.stop) event.stop();
                if (event.preventDefault) event.preventDefault();
                return false;
              }
              
              // Check if drop is within section bounds but not on a column
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
                  if (event.stop) event.stop();
                  if (event.preventDefault) event.preventDefault();
                  return false;
                }
              }
            }
          }
        }
      } catch(err) {
        console.warn('[PF] Error in canvas:drop prevention:', err);
      }
    });
  }
}

