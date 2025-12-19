// Component Locking Module
// Handles locking inner components and adding delete buttons

export class ComponentLocking {
  constructor(builder) {
    this.builder = builder;
    this.editor = builder.editor;
  }

  setup() {
    if (!this.editor) return;
    
    // Lock inner components whenever a component is added or updated
    this.editor.on('component:add', (component) => {
      // Only lock inner components of record-field and record-partial
      const attrs = component.getAttributes ? component.getAttributes() : {};
      if (attrs['field-api-name'] || attrs['partial-name']) {
        // Small delay to ensure children are added first
        setTimeout(() => {
          this.addDeleteButton(component);
          // Ensure fields/partials are not droppable (can't drop components into them)
          component.set({ droppable: false });
          this.lockInnerComponents(component);
        }, 10);
      } else if (attrs['data-comp-kind'] === 'record-tabs' || component.get('type') === 'record-tabs') {
        // Lock tabs inner components (but allow tab buttons to be draggable for reordering)
        setTimeout(() => {
          // Ensure tabs container is draggable
          component.set({
            draggable: true,
            selectable: true,
            hoverable: true,
            highlightable: true,
            droppable: false
          });
          this.lockTabsInnerComponents(component);
          // Ensure buildWorkingTabs is called to add buttons
          if (window.TabsComponent && window.TabsComponent.buildWorkingTabs) {
            try {
              window.TabsComponent.buildWorkingTabs(component);
            } catch(e) {
              console.warn('[PF] Error building tabs on add:', e);
            }
          }
        }, 100);
      } else if (attrs['data-comp-kind'] === 'record-section' || component.get('type') === 'record-section') {
        // Lock section inner components
        setTimeout(() => {
          // Ensure section container is draggable and not droppable (only columns should accept drops)
          component.set({ 
            draggable: true,
            selectable: true,
            hoverable: true,
            highlightable: true,
            droppable: false 
          });
          // Ensure buildWorkingSection is called to add buttons
          if (window.SectionComponent && window.SectionComponent.buildWorkingSection) {
            try {
              window.SectionComponent.buildWorkingSection(component);
            } catch(e) {
              console.warn('[PF] Error building section on add:', e);
            }
          }
        }, 100);
      }
    });

    // Also lock when components are updated
    // ROOT CAUSE: component:update fires during drags, causing buildWorkingSection to run,
    // which calls comp.components('') and triggers ensureInList recursively
    // SOLUTION: Completely skip ALL component:update handlers during drags
    this.editor.on('component:update', (component) => {
      // CRITICAL: Skip ALL updates during drag operations to prevent recursion
      // This must be checked FIRST, before any other logic
      if (window.__pf_isMovingComponent === true) {
        return; // Exit immediately - don't process any updates during drags
      }
      
      const attrs = component.getAttributes ? component.getAttributes() : {};
      if (attrs['field-api-name'] || attrs['partial-name']) {
        setTimeout(() => {
          // Double-check flag in setTimeout - it might have changed
          if (window.__pf_isMovingComponent === true) {
            return;
          }
          this.addDeleteButton(component);
          // ROOT CAUSE FIX: Ensure fields/partials are NEVER droppable and reject all drops
          // This prevents invalid nesting (fields inside fields) that causes ensureInList recursion
          // Only set if not currently dragging
          if (!window.__pf_isMovingComponent) {
            component.set({ 
              droppable: false, // Never accept drops
              accept: [] // Explicitly reject all component types
            });
          }
          this.lockInnerComponents(component);
        }, 10);
      } else if (attrs['data-comp-kind'] === 'record-tabs' || component.get('type') === 'record-tabs') {
        // DON'T call component.set() here - it triggers updates during drags which cause recursion!
        // These properties should be set in component definition, not in update handlers
        
        // Lock tabs inner components
        // Skip if we're in the middle of updating tabs (from modal save)
        const isUpdating = component.getAttributes() && component.getAttributes()['_updating-tabs'] === 'true';
        if (isUpdating) {
          return;
        }
        // Skip if component is currently being built (prevents infinite loops)
        const compEl = component.getEl();
        if (compEl && compEl.__pf_building_tabs) {
          return;
        }
        setTimeout(() => {
          // ROOT CAUSE: Check drag flag AND depth counter - recursion can happen even after drag ends
          // if setTimeout fires after drag ends but ensureInList is still processing
          if (window.__pf_isMovingComponent === true) {
            return; // Don't do anything during drags
          }
          
          // Also check depth counter - if it's high, we're in a recursion loop
          if (window.__pf_ensureInListDepth && window.__pf_ensureInListDepth > 5) {
            console.warn('[PF] Skipping buildWorkingTabs - depth too high:', window.__pf_ensureInListDepth);
            return; // Don't rebuild if we're in a recursion loop
          }
          
          this.lockTabsInnerComponents(component);
          // Only call buildWorkingTabs if structure doesn't exist or needs update
          // Don't call it on every update to prevent loops
          const el = component.getEl();
          const hasStructure = el && el.querySelector('.pf-tabs') && 
                               el.querySelector('.pf-tabs-header') && 
                               el.querySelector('.pf-tabs-body');
          
          // ROOT CAUSE: Double-check drag flag AND depth before calling buildWorkingTabs
          // buildWorkingTabs calls comp.components('') which triggers ensureInList recursion
          if (window.__pf_isMovingComponent === true) {
            return; // Don't rebuild during drags
          }
          
          // Check depth again before calling buildWorkingTabs
          if (window.__pf_ensureInListDepth && window.__pf_ensureInListDepth > 5) {
            return; // Don't rebuild if we're in a recursion loop
          }
          
          if (!hasStructure && window.TabsComponent && window.TabsComponent.buildWorkingTabs) {
            try {
              window.TabsComponent.buildWorkingTabs(component);
            } catch(e) {
              console.warn('[PF] Error building tabs on update:', e);
            }
          }
        }, 100);
      } else if (attrs['data-comp-kind'] === 'record-section' || component.get('type') === 'record-section') {
        // Lock section inner components
        // Skip if we're in the middle of updating section (from modal save)
        const isUpdating = component.getAttributes() && component.getAttributes()['_updating-section'] === 'true';
        if (isUpdating) {
          return;
        }
        // Skip if a component is being moved within this section
        const isMovingComponent = component.getAttributes() && component.getAttributes()['_moving-component'] === 'true';
        if (isMovingComponent) {
          return;
        }
        // Skip if component is currently being built (prevents infinite loops)
        const compEl = component.getEl();
        if (compEl && compEl.__pf_building_section) {
          return;
        }
        setTimeout(() => {
          // ROOT CAUSE: Check drag flag AND depth counter - recursion can happen even after drag ends
          // if setTimeout fires after drag ends but ensureInList is still processing
          if (window.__pf_isMovingComponent === true) {
            return; // Don't do anything during drags
          }
          
          // Also check depth counter - if it's high, we're in a recursion loop
          if (window.__pf_ensureInListDepth && window.__pf_ensureInListDepth > 5) {
            console.warn('[PF] Skipping section update - depth too high:', window.__pf_ensureInListDepth);
            return; // Don't process if we're in a recursion loop
          }
          
          // DON'T call component.set() here - it triggers updates during drags which cause recursion!
          // These properties should be set in component definition or on initial creation only
          // Also ensure the DOM element has the right attributes
          const el = component.getEl();
          if (el) {
            el.setAttribute('draggable', 'true');
            el.style.cursor = 'move';
            el.style.pointerEvents = 'auto';
            
            // CRITICAL: Make ALL inner containers allow events to bubble AND ensure they don't block parent drag
            // This is essential - when you click on inner elements, GrapesJS should still drag the parent
            const allInnerElements = el.querySelectorAll('.pf-section, .pf-section-body, .pf-section-column');
            allInnerElements.forEach(inner => {
              inner.style.pointerEvents = 'auto'; // Allow events to bubble up
              // Remove any draggable attribute that might block parent drag
              inner.removeAttribute('draggable');
            });
            
            // Also ensure that clicks on inner elements trigger parent drag
            el.addEventListener('mousedown', (e) => {
              // If clicking on an inner element (not the main container itself), ensure parent can be dragged
              if (e.target !== el && e.target.closest('.pf-section, .pf-section-body')) {
                // Don't prevent default - let GrapesJS handle it
                // But ensure the parent component is draggable
                if (component && component.get('draggable')) {
                  // The drag should work - GrapesJS should handle it
                }
              }
            }, true);
          }
          // ROOT CAUSE: buildWorkingSection calls comp.components('') which triggers ensureInList recursively
          // NEVER call buildWorkingSection during drags - it causes infinite recursion
          if (window.__pf_isMovingComponent === true) {
            return; // Don't rebuild during drags - exit immediately
          }
          
          // Check depth again before calling buildWorkingSection
          if (window.__pf_ensureInListDepth && window.__pf_ensureInListDepth > 5) {
            return; // Don't rebuild if we're in a recursion loop
          }
          
          // Only call buildWorkingSection if structure doesn't exist or needs update
          // Don't call it on every update to prevent loops
          const hasStructure = el && el.querySelector('.pf-section') && 
                               el.querySelector('.pf-section-body');
          
          // CRITICAL: Also check if columns exist with content - if so, never rebuild
          const existingColumns = el?.querySelectorAll('.pf-section-column');
          const hasColumnsWithContent = existingColumns && existingColumns.length > 0 && 
            Array.from(existingColumns).some(col => col.children.length > 0);
          
          // ROOT CAUSE: Only rebuild if structure is COMPLETELY missing AND columns don't have content
          // If structure exists OR columns have content, NEVER rebuild - it causes ensureInList recursion
          // During drags, the structure might temporarily not be in the component tree but exists in DOM
          if (!hasStructure && !hasColumnsWithContent && window.SectionComponent && window.SectionComponent.buildWorkingSection) {
            try {
              window.SectionComponent.buildWorkingSection(component);
            } catch(e) {
              console.warn('[PF] Error building section on update:', e);
            }
          }
        }, 100);
      }
    });
  }

  lockInnerComponents(comp) {
    try {
      // ROOT CAUSE FIX: Skip if dragging - comp.set() triggers ensureInList recursion
      if (window.__pf_isMovingComponent) {
        return; // Don't modify components during drags
      }
      
      // ROOT CAUSE FIX: Skip if component is being processed to prevent recursion
      if (window.__pf_processingComponents && window.__pf_processingComponents.has(comp)) {
        return; // Already processing - prevent recursion
      }
      
      const stack = Array.isArray(comp) ? comp.slice() : [comp];
      while (stack.length) {
        const node = stack.pop();
        if (!node || !node.components) continue;
        
        // ROOT CAUSE FIX: Skip if node is being processed
        if (window.__pf_processingComponents && window.__pf_processingComponents.has(node)) {
          continue; // Skip this node - already processing
        }
        
        // ROOT CAUSE FIX: Mark node as processing BEFORE calling components() to prevent recursion
        // comp.components() internally calls ensureInList, which can trigger recursion
        if (window.__pf_processingComponents) {
          window.__pf_processingComponents.add(node);
        }
        
        // ROOT CAUSE: comp.components() triggers ensureInList - but our patch should prevent recursion
        // However, we mark as processing first to be safe
        let children = [];
        try {
          const comps = node.components();
          children = comps && comps.models ? comps.models : [];
        } catch(err) {
          console.warn('[PF] Error getting components in lockInnerComponents:', err);
          // Remove from processing set on error
          if (window.__pf_processingComponents) {
            window.__pf_processingComponents.delete(node);
          }
          continue;
        }
        children.forEach(ch => {
          // ROOT CAUSE FIX: Skip if child is being processed
          if (window.__pf_processingComponents && window.__pf_processingComponents.has(ch)) {
            return; // Skip this child - already processing
          }
          
          // CRITICAL: Don't lock section columns or tab sections - they need to accept drops!
          const chAttrs = ch.getAttributes ? ch.getAttributes() : {};
          const chEl = ch.getEl && ch.getEl();
          const isSectionColumn = chAttrs['data-role'] === 'pf-section-column' ||
                                 (chEl && chEl.classList && chEl.classList.contains('pf-section-column'));
          const isTabSection = chAttrs['data-role'] === 'pf-tab-section' ||
                             (chEl && chEl.classList && chEl.classList.contains('pf-tab-section'));
          
          if (isSectionColumn || isTabSection) {
            // Don't lock columns/sections - they need droppable: true and accept property
            // Just continue to next child
            return;
          }
          
          // Don't lock the delete button - it needs to be clickable
          const attrs = chAttrs;
          const isDeleteButton = attrs.class && attrs.class.includes('rb-del');
          
          // Check if this child is itself a field/partial component (not just inner content)
          const isFieldOrPartial = attrs['field-api-name'] || attrs['partial-name'] || 
                                   ch.get('type') === 'record-field' || ch.get('type') === 'record-partial';
          
          // Check if this child is inside a section/tab
          const isInsideSection = this.builder.modules?.componentRegistry?.isInsideSectionOrTab(ch) || false;
          
          // ROOT CAUSE FIX: Mark child as processing before calling set() to prevent recursion
          if (window.__pf_processingComponents) {
            window.__pf_processingComponents.add(ch);
          }
          
          if (isDeleteButton) {
            // Ensure delete button is clickable and visible
            // ROOT CAUSE FIX: Only set if values actually need to change
            const needsUpdate = ch.get('selectable') !== false || ch.get('hoverable') !== false ||
                                ch.get('draggable') !== false || ch.get('droppable') !== false ||
                                ch.get('editable') !== false || ch.get('copyable') !== false ||
                                ch.get('highlightable') !== false;
            if (needsUpdate) {
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
          } else if (isFieldOrPartial && isInsideSection) {
            // This is a field/partial component inside a section/tab - make it draggable
            // But still lock its inner children (they will be processed in the next iteration)
            // ROOT CAUSE FIX: Only set if values actually need to change
            const needsUpdate = ch.get('selectable') !== true || ch.get('hoverable') !== true ||
                                ch.get('draggable') !== true || ch.get('droppable') !== false ||
                                ch.get('editable') !== false || ch.get('copyable') !== false ||
                                ch.get('highlightable') !== true;
            if (needsUpdate) {
              ch.set({
                selectable: true,
                hoverable: true,
                draggable: true,
                droppable: false,
                editable: false,
                copyable: false,
                highlightable: true
              });
            }
            // Continue to lock inner children
            if (ch.components && ch.components().length) {
              stack.push(ch);
            }
          } else {
            // This is inner content (not a field/partial component itself) - always lock it
            // ROOT CAUSE FIX: Only set if values actually need to change
            const needsUpdate = ch.get('selectable') !== false || ch.get('hoverable') !== false ||
                                ch.get('draggable') !== false || ch.get('droppable') !== false ||
                                ch.get('editable') !== false || ch.get('copyable') !== false ||
                                ch.get('highlightable') !== false;
            if (needsUpdate) {
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
            }
            
            // Set pointer-events to none so drag events bubble up to parent
            // This allows dragging the field/partial by clicking anywhere on it (including labels)
            try {
              const chEl = ch.getEl && ch.getEl();
              if (chEl && chEl.style) {
                chEl.style.pointerEvents = 'none';
              }
            } catch(err) {
              // Component might not have an element yet, skip
            }
            
            // Continue to lock deeper inner children
            if (ch.components && ch.components().length) {
              stack.push(ch);
            }
          }
        });
      }
    } catch (error) {
      console.warn('[PF] Error locking inner components:', error);
    }
  }

  lockTabsInnerComponents(comp) {
    try {
      // ROOT CAUSE FIX: Skip if dragging - comp.set() triggers ensureInList recursion
      if (window.__pf_isMovingComponent) {
        return; // Don't modify components during drags
      }
      
      // ROOT CAUSE FIX: Check if component is being processed to prevent recursion
      if (window.__pf_processingComponents && window.__pf_processingComponents.has(comp)) {
        return; // Already processing - prevent recursion
      }
      
      // ROOT CAUSE FIX: Mark component as processing BEFORE any set() calls
      if (window.__pf_processingComponents) {
        window.__pf_processingComponents.add(comp);
      }
      
      const el = comp.getEl();
      if (!el) {
        // Remove from processing set if we're exiting early
        if (window.__pf_processingComponents) {
          window.__pf_processingComponents.delete(comp);
        }
        return;
      }
      
      // First, ensure the main tabs container is draggable (so the whole component can be moved)
      // CRITICAL: Set type first, then draggable
      // ROOT CAUSE FIX: Only set if values actually need to change to avoid triggering updates
      const currentType = comp.get('type');
      const currentDraggable = comp.get('draggable');
      
      if (currentType !== 'record-tabs') {
        comp.set('type', 'record-tabs');
      }
      
      // Only set if values are different to avoid unnecessary updates
      if (currentDraggable !== true || comp.get('selectable') !== true || 
          comp.get('hoverable') !== true || comp.get('highlightable') !== true || 
          comp.get('droppable') !== false) {
        comp.set({
          draggable: true,
          selectable: true,
          hoverable: true,
          highlightable: true,
          droppable: false
        });
      }
      
      // Remove from processing set after a short delay
      setTimeout(() => {
        if (window.__pf_processingComponents) {
          window.__pf_processingComponents.delete(comp);
        }
      }, 50);
      
      // Ensure the main container element allows pointer events and has draggable attribute
      if (el) {
        el.style.pointerEvents = 'auto';
        el.setAttribute('draggable', 'true');
        el.style.cursor = 'move';
        
        // CRITICAL: Make ALL inner containers allow events to bubble AND ensure they don't block parent drag
        // This is essential - when you click on inner elements, GrapesJS should still drag the parent
        const allInnerElements = el.querySelectorAll('.pf-tabs, .pf-tabs-header, .pf-tabs-body, .pf-tab-section, .pf-tab-btn');
        allInnerElements.forEach(inner => {
          inner.style.pointerEvents = 'auto'; // Allow events to bubble up
          // Remove any draggable attribute that might block parent drag
          inner.removeAttribute('draggable');
        });
        
        // Also ensure that clicks on inner elements trigger parent drag
        // This is a workaround for GrapesJS not bubbling drag events properly
        el.addEventListener('mousedown', (e) => {
          // If clicking on an inner element (not the main container itself), ensure parent can be dragged
          if (e.target !== el && e.target.closest('.pf-tabs, .pf-tabs-header, .pf-tabs-body')) {
            // Don't prevent default - let GrapesJS handle it
            // But ensure the parent component is draggable
            if (comp && comp.get('draggable')) {
              // The drag should work - GrapesJS should handle it
            }
          }
        }, true);
      }
      
      // Find the tabs wrapper
      const tabsWrapper = el.querySelector('.pf-tabs');
      if (!tabsWrapper) return;
      
      // Find all inner components using GrapesJS
      // We need to find the component by traversing from the main component
      // The tabs wrapper is a child of the main component
      // ROOT CAUSE FIX: Mark as processing before calling components() to prevent recursion
      if (window.__pf_processingComponents) {
        window.__pf_processingComponents.add(comp);
      }
      
      let tabsWrapperComp = null;
      let compChildren = [];
      try {
        const comps = comp.components();
        compChildren = comps && comps.models ? comps.models : [];
      } catch(err) {
        console.warn('[PF] Error getting components in lockTabsInnerComponents:', err);
        if (window.__pf_processingComponents) {
          window.__pf_processingComponents.delete(comp);
        }
        return;
      }
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
      // But allow pointer events so dragging the main component works
      tabsWrapperComp.set({
        selectable: false,
        hoverable: false,
        draggable: false, // Prevent dragging the wrapper separately
        droppable: false,
        editable: false,
        copyable: false,
        highlightable: false
      });
      
      // CRITICAL: Ensure wrapper element allows pointer events to bubble AND doesn't block parent drag
      const wrapperEl = tabsWrapperComp.getEl();
      if (wrapperEl) {
        wrapperEl.style.pointerEvents = 'auto';
        // Make sure clicks on wrapper bubble up to parent for dragging
        wrapperEl.addEventListener('mousedown', (e) => {
          // If clicking on wrapper (not on a child that should handle its own events), allow parent drag
          if (e.target === wrapperEl || e.target.closest('.pf-tabs-header, .pf-tabs-body')) {
            // Don't prevent default - let GrapesJS handle it for the parent component
            // But ensure the parent component is the one being dragged
            const parentComp = comp;
            if (parentComp && parentComp.get('draggable')) {
              // The drag should work on the parent
            }
          }
        }, true);
      }
      
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
        // ROOT CAUSE FIX: Mark header as processing before calling components()
        if (window.__pf_processingComponents) {
          window.__pf_processingComponents.add(header);
        }
        let headerChildren = [];
        try {
          const comps = header.components();
          headerChildren = comps && comps.models ? comps.models : [];
        } catch(err) {
          console.warn('[PF] Error getting header children:', err);
          if (window.__pf_processingComponents) {
            window.__pf_processingComponents.delete(header);
          }
          headerChildren = [];
        }
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
        // ROOT CAUSE FIX: Mark body as processing before calling components()
        if (window.__pf_processingComponents) {
          window.__pf_processingComponents.add(body);
        }
        let bodyChildren = [];
        try {
          const comps = body.components();
          bodyChildren = comps && comps.models ? comps.models : [];
        } catch(err) {
          console.warn('[PF] Error getting body children:', err);
          if (window.__pf_processingComponents) {
            window.__pf_processingComponents.delete(body);
          }
          bodyChildren = [];
        }
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
      
      // Ensure buttons exist - they're created by addButtons in buildWorkingTabs
      // Buttons are DOM elements (not GrapesJS components) attached directly to compEl
      const hasDeleteBtn = el.querySelector(':scope > .rb-del');
      const hasEditBtn = el.querySelector(':scope > .rb-edit-tabs');
      
      // If buttons don't exist, ensure buildWorkingTabs is called (which calls addButtons)
      // This can happen if the component was loaded from HTML and buttons weren't created yet
      // We need to call it even if structure exists, to ensure buttons are added
      if (!hasDeleteBtn || !hasEditBtn) {
        if (window.TabsComponent && window.TabsComponent.buildWorkingTabs) {
          try {
            // buildWorkingTabs internally calls addButtons which creates the buttons
            // It checks if buttons exist and only creates if missing
            window.TabsComponent.buildWorkingTabs(comp);
          } catch(e) {
            console.warn('[PF] Error ensuring buttons exist:', e);
          }
        }
      }
      
    } catch (error) {
      console.warn('[PF] Error locking tabs inner components:', error);
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
        
        // Ensure component has pf-interactive class for delete button to show
        if (!el.classList.contains('pf-interactive')) {
          el.classList.add('pf-interactive');
        }
        // Ensure component has relative positioning for delete button
        if (window.getComputedStyle(el).position === 'static') {
          el.style.position = 'relative';
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
}

