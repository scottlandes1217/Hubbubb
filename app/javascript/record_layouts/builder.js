// Record Layout Builder - Clean and Minimal

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
        draggableComponents: true, // Enable dragging for all components
        canvas: {
          styles: [
            'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
            'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
            this.getAssetPath('application_css'),
            this.getAssetPath('record_builder_css')
          ]
        }
      });

      this.setupEditor();
    } catch (error) {
      console.error('[PF] Error creating editor:', error);
    }
  }

  setupEditor() {
    try {
      this.addSaveCommand();
      this.setupComponentTypes();
      this.setupTabsComponent();
      this.setupTabsConfigModal();
      this.setupSectionComponent();
      this.setupSectionConfigModal();
      this.loadInitialContent();
      this.buildLeftSidebar();
      this.setupCanvasDragAndDrop();
      this.setupComponentLocking();
      this.setupSectionDropPrevention();
      this.injectCanvasCSS();
    } catch (error) {
      console.error('[PF] Error in setupEditor:', error);
    }
  }

  injectCanvasCSS() {
    // Inject CSS into the iframe to hide the green drop indicator
    const inject = () => {
      try {
        if (!this.editor || !this.editor.Canvas) return;
        const iframe = this.editor.Canvas.getFrameEl();
        if (iframe && iframe.contentDocument && iframe.contentDocument.head) {
          // Check if we've already injected this CSS
          if (!iframe.contentDocument.getElementById('pf-hide-drop-indicator')) {
            const style = iframe.contentDocument.createElement('style');
            style.id = 'pf-hide-drop-indicator';
            style.textContent = `
              /* Hide green drop indicator line - ALL instances */
              .gjs-sorter-placeholder,
              .gjs-sorter-placeholder::before,
              .gjs-sorter-placeholder::after,
              [class*="sorter-placeholder"],
              [class*="sorter-placeholder"]::before,
              [class*="sorter-placeholder"]::after {
                opacity: 0 !important;
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                width: 0 !important;
                border: none !important;
                background: none !important;
                pointer-events: none !important;
              }
              
              /* Hide drop indicator before sections */
              .pf-section-container + .gjs-sorter-placeholder,
              .gjs-sorter-placeholder + .pf-section-container,
              .pf-section-container + [class*="sorter-placeholder"],
              [class*="sorter-placeholder"] + .pf-section-container {
                opacity: 0 !important;
                display: none !important;
                visibility: hidden !important;
              }
              
              /* Also hide any drop indicators that appear before sections */
              body > .gjs-sorter-placeholder:first-child,
              [data-gjs-type="wrapper"] > .gjs-sorter-placeholder:first-child {
                opacity: 0 !important;
                display: none !important;
              }
            `;
            iframe.contentDocument.head.appendChild(style);
            
            // Also set up a MutationObserver to hide placeholders as soon as they appear
            const observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                  if (node.nodeType === 1) { // Element node
                    if (node.classList && (node.classList.contains('gjs-sorter-placeholder') || 
                        node.className.includes('sorter-placeholder'))) {
                      node.style.display = 'none';
                      node.style.visibility = 'hidden';
                      node.style.opacity = '0';
                      node.style.height = '0';
                      node.style.width = '0';
                    }
                    // Also check children
                    const placeholders = node.querySelectorAll && node.querySelectorAll('.gjs-sorter-placeholder, [class*="sorter-placeholder"]');
                    if (placeholders) {
                      placeholders.forEach(ph => {
                        ph.style.display = 'none';
                        ph.style.visibility = 'hidden';
                        ph.style.opacity = '0';
                        ph.style.height = '0';
                        ph.style.width = '0';
                      });
                    }
                  }
                });
              });
            });
            
            // Observe the body for new placeholder elements
            if (iframe.contentDocument.body) {
              observer.observe(iframe.contentDocument.body, {
                childList: true,
                subtree: true
              });
            }
          }
        }
      } catch(err) {
        console.warn('[PF] Error injecting canvas CSS:', err);
      }
    };
    
    // Try to inject after editor is ready
    setTimeout(inject, 100);
    setTimeout(inject, 500);
    
    // Also inject when frame loads
    if (this.editor) {
      this.editor.on('canvas:frame:load', inject);
    }
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
            if (this.isSection(child)) {
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
    
    // Track original position of components being dragged
    let draggedComponentOriginalIndex = null;
    let draggedComponentOriginalParent = null;
    let draggedComponent = null;
    
    // Track when a component starts being dragged
    this.editor.on('component:drag:start', (data) => {
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
        
        draggedComponent = actualComponent;
        
        // Get parent from the data or from the component
        const parent = (data && data.parent) || (actualComponent.parent && actualComponent.parent());
        if (parent) {
          const siblings = parent.components().models || [];
          draggedComponentOriginalIndex = data.index !== undefined ? data.index : siblings.findIndex(c => c === actualComponent);
          draggedComponentOriginalParent = parent;
        } else {
          // Component might be at root level
          const root = this.editor.DomComponents.getWrapper();
          const children = root.components().models || [];
          draggedComponentOriginalIndex = data.index !== undefined ? data.index : children.findIndex(c => c === actualComponent);
          draggedComponentOriginalParent = root;
        }
      } catch(err) {
        console.warn('[PF] Error tracking drag start:', err);
      }
    });
    
    // Intercept component:drag:end to prevent dropping existing components to the left of sections
    this.editor.on('component:drag:end', (data) => {
      try {
        // Extract the actual component from the event data
        // The event passes {target, parent, index}
        const component = (data && data.target) || draggedComponent;
        const newIndex = data && data.index !== undefined ? data.index : null;
        const newParent = data && data.parent ? data.parent : null;
        
        if (!component || !component.cid) {
          return;
        }
        
        // CRITICAL: Check if component is a partial (like pet header) - allow it to be placed anywhere
        const compAttrs = component.getAttributes ? component.getAttributes() : {};
        const compType = component.get('type');
        const isPartial = compAttrs['partial-name'] || compType === 'record-partial';
        
        // If it's a partial, skip ALL revert logic - allow it anywhere
        if (isPartial) {
          draggedComponentOriginalIndex = null;
          draggedComponentOriginalParent = null;
          draggedComponent = null;
          return; // Exit early - no restrictions on partials
        }
        
        // CRITICAL: For section components, let GrapesJS handle the move completely naturally
        // DO NOT intercept section moves at all - this causes ensureInList recursion
        // Flags are already set in component:drag:start, so rebuilds are prevented
        const isSection = compType === 'record-section' || compAttrs['data-comp-kind'] === 'record-section';
        if (isSection) {
          // Exit immediately - flags are already set in drag:start, so rebuilds are prevented
          // Let GrapesJS handle the move completely naturally
          return;
        }
        
        // CRITICAL: For fields and other components moving between columns/sections,
        // let GrapesJS handle the move naturally. Only intercept for tabs that need special handling.
        // Intercepting field moves causes ensureInList recursion because GrapesJS has already moved them.
        
        // Check if component is a tab that needs special handling
        const isTab = compType === 'record-tabs' || compAttrs['data-comp-kind'] === 'record-tabs';
        
        // For non-tab components (fields, partials, etc.), just set flags and let GrapesJS handle it
        if (!isTab) {
          // Just mark any parent sections to prevent rebuilds, but don't intercept the move
          try {
            let parent = component.parent();
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
          // Let GrapesJS handle the rest - don't intercept
          return;
        }
        
        // Only intercept for tabs
        if (isTab) {
          // Get the component's current position in the DOM
          const compEl = component.getEl && component.getEl();
          if (!compEl) {
            return;
          }
          
          // Get drop coordinates from the drag end event
          const dropX = compEl.getBoundingClientRect().left;
          const dropY = compEl.getBoundingClientRect().top;
          
          // Check if we should move the component into a tab section or section column
          const root = this.editor.DomComponents.getWrapper();
          const allTabSections = root.find('[data-role="pf-tab-section"]');
          const allSectionColumns = root.find('[data-role="pf-section-column"]');
          // Find the closest tab section or section column at the drop position
          let targetContainer = null;
          
          // Check tab sections first
          for (let i = 0; i < allTabSections.length; i++) {
            const section = allTabSections[i];
            const sectionEl = section.getEl && section.getEl();
            if (sectionEl) {
              const rect = sectionEl.getBoundingClientRect();
              if (dropX >= rect.left && dropX <= rect.right && dropY >= rect.top && dropY <= rect.bottom) {
                targetContainer = section;
                break;
              }
            }
          }
          
          // Check section columns if no tab section found
          if (!targetContainer) {
            for (let i = 0; i < allSectionColumns.length; i++) {
              const column = allSectionColumns[i];
              const columnEl = column.getEl && column.getEl();
              if (columnEl) {
                const rect = columnEl.getBoundingClientRect();
                if (dropX >= rect.left && dropX <= rect.right && dropY >= rect.top && dropY <= rect.bottom) {
                  targetContainer = column;
                  break;
                }
              }
            }
          }
          
          // If we found a target container, move the component there
          if (targetContainer) {
            // Prevent rapid moves from causing infinite loops
            if (window.__pf_isMovingComponent) {
              return; // Skip if move already in progress
            }
            
            window.__pf_isMovingComponent = true;
            
            // CRITICAL: Set flags BEFORE any operations to prevent component:update handlers from firing
            // Check both source and target parents BEFORE removing component
            let sourceParentSection = null;
            let targetParentSection = null;
            
            // Find source section (before removing)
            let parent = component.parent();
            while (parent) {
              const parentAttrs = parent.getAttributes ? parent.getAttributes() : {};
              const parentType = parent.get('type');
              if (parentType === 'record-section' || parentAttrs['data-comp-kind'] === 'record-section') {
                sourceParentSection = parent;
                break;
              }
              parent = parent.parent ? parent.parent() : null;
            }
            
            // Find target section
            let targetParent = targetContainer.parent ? targetContainer.parent() : null;
            while (targetParent) {
              const parentAttrs = targetParent.getAttributes ? targetParent.getAttributes() : {};
              const parentType = targetParent.get('type');
              if (parentType === 'record-section' || parentAttrs['data-comp-kind'] === 'record-section') {
                targetParentSection = targetParent;
                break;
              }
              targetParent = targetParent.parent ? targetParent.parent() : null;
            }
            
            // Mark section(s) to prevent rebuilds during move - MUST BE DONE BEFORE remove()
            const sectionsToMark = new Set();
            if (sourceParentSection) sectionsToMark.add(sourceParentSection);
            if (targetParentSection) sectionsToMark.add(targetParentSection);
            
            // Set flags synchronously before any async operations
            sectionsToMark.forEach(section => {
              try {
                section.addAttributes({ '_moving-component': 'true' });
              } catch(err) {
                console.warn('[PF] Error setting _moving-component flag:', err);
              }
            });
            
            // CRITICAL: Use DOM manipulation to move the element first, then sync with GrapesJS
            // This avoids triggering ensureInList recursion by moving at the DOM level first
            try {
              const compEl = component.getEl();
              const targetEl = targetContainer.getEl();
              
              if (compEl && targetEl) {
                // Move the DOM element first (this doesn't trigger GrapesJS component management)
                targetEl.appendChild(compEl);
                
                // Now sync with GrapesJS component tree using a small delay
                // This gives the DOM time to update before GrapesJS processes it
                setTimeout(() => {
                  try {
                    // Get the component from the DOM element to sync the component tree
                    const syncedComponent = this.editor.Components.getComponent(compEl);
                    if (syncedComponent && syncedComponent.parent() !== targetContainer) {
                      // If component tree isn't synced, update it manually
                      // But do it in a way that doesn't trigger ensureInList
                      const currentParent = syncedComponent.parent();
                      if (currentParent && currentParent.components) {
                        // Silently remove from old parent
                        const oldComponents = currentParent.components();
                        const index = oldComponents.indexOf(syncedComponent);
                        if (index !== -1) {
                          oldComponents.models.splice(index, 1);
                        }
                      }
                      // Add to new parent
                      const newComponents = targetContainer.components();
                      if (!newComponents.models.includes(syncedComponent)) {
                        newComponents.models.push(syncedComponent);
                        syncedComponent.set('parent', targetContainer);
                      }
                    }
                    
                    // Clear flags after sync completes
                    setTimeout(() => {
                      sectionsToMark.forEach(section => {
                        try {
                          section.removeAttributes('_moving-component');
                        } catch(_) {}
                      });
                      window.__pf_isMovingComponent = false;
                    }, 200);
                  } catch(err) {
                    console.warn('[PF] Error syncing component tree:', err);
                    // Even if sync fails, DOM is moved, so clear flags
                    sectionsToMark.forEach(section => {
                      try {
                        section.removeAttributes('_moving-component');
                      } catch(_) {}
                    });
                    window.__pf_isMovingComponent = false;
                  }
                }, 50);
              } else {
                // Fallback: use component methods if DOM manipulation fails
                component.remove();
                setTimeout(() => {
                  targetContainer.append(component);
                  setTimeout(() => {
                    sectionsToMark.forEach(section => {
                      try {
                        section.removeAttributes('_moving-component');
                      } catch(_) {}
                    });
                    window.__pf_isMovingComponent = false;
                  }, 300);
                }, 100);
              }
            } catch(err) {
              console.warn('[PF] Error moving component to container:', err);
              sectionsToMark.forEach(section => {
                try {
                  section.removeAttributes('_moving-component');
                } catch(_) {}
              });
              window.__pf_isMovingComponent = false;
            }
            return; // Don't continue with revert logic
          }
        }
        
        // Wait a bit longer for GrapesJS to finish positioning and cleanup
        setTimeout(() => {
          try {
            const compRect = compEl.getBoundingClientRect();
            const dropX2 = compRect.left;
            const dropY2 = compRect.top + compRect.height / 2;
            
            
            // Check if drop is to the left of any section
            const allSections = root.find('[data-comp-kind="record-section"], [data-gjs-type="record-section"]');
            
            let shouldRevert = false;
            
            // Get the component's current parent and position
            const currentParent = component.parent && component.parent();
            const rootChildren = root.components().models || [];
            
            // Check if component was originally inside a section/tab
            const wasFromSectionOrTab = draggedComponentOriginalParent && 
                                       draggedComponentOriginalParent !== root &&
                                       !rootChildren.includes(draggedComponentOriginalParent);
            
            // FIRST: Check if component is inside a valid container (tab section or section column)
            // If so, don't revert - it's a valid drop
            const isInValidContainer = this.isInsideSectionOrTab(component);
            
            // Only check for revert if component is NOT in a valid container
            let componentIndex = -1;
            let shouldCheck = false;
            
            if (!isInValidContainer && wasFromSectionOrTab && newIndex !== null && newIndex >= 0) {
              // Component came from section/tab and we have a new index - check it
              componentIndex = newIndex;
              shouldCheck = true;
            } else if (!isInValidContainer) {
              // Try to find component in root's children
              const componentInRoot = rootChildren.includes(component);
              if (componentInRoot) {
                componentIndex = rootChildren.findIndex(c => c === component);
                shouldCheck = true;
              } else if (newIndex !== null && newIndex >= 0) {
                // Even if not found, if we have an index, use it
                componentIndex = newIndex;
                shouldCheck = true;
              }
            }
            
            // If component is in a valid container, skip all revert checks
            if (isInValidContainer) {
              shouldCheck = false;
            }
            
            // If we should check and have a valid index, check if component is before a section
            // Use newIndex if componentIndex is -1 (trust GrapesJS's event data)
            const checkIndex = componentIndex !== -1 ? componentIndex : (newIndex !== null && newIndex >= 0 ? newIndex : -1);
            
            if (shouldCheck && checkIndex !== -1) {
              for (let i = 0; i < allSections.length; i += 1) {
                const section = allSections[i];
                const sectionEl = section.getEl && section.getEl();
                if (!sectionEl) continue;
                
                const sectionRect = sectionEl.getBoundingClientRect();
                
                // Check if component is before this section in DOM order
                const sectionIndex = rootChildren.findIndex(c => c === section);
                const isBeforeSectionInDOM = sectionIndex !== -1 && checkIndex < sectionIndex;
              
              // Check if drop is vertically aligned with the section
              // Use a larger buffer and check if component overlaps vertically with section
              const componentTop = compRect.top;
              const componentBottom = compRect.bottom;
              const isVerticallyAligned = (
                (componentTop >= sectionRect.top - 200 && componentTop <= sectionRect.bottom + 200) ||
                (componentBottom >= sectionRect.top - 200 && componentBottom <= sectionRect.bottom + 200) ||
                (componentTop <= sectionRect.top && componentBottom >= sectionRect.bottom) ||
                (componentTop >= sectionRect.top && componentBottom <= sectionRect.bottom)
              );
              
              // Check if drop is to the left of the section visually
              const componentRight = compRect.right;
              const componentLeft = compRect.left;
              const isVisuallyToLeft = componentRight < sectionRect.left - 20;
              
              // Check if component is a partial (like pet header) - allow it to be placed anywhere
              const compAttrs = component.getAttributes ? component.getAttributes() : {};
              const isPartial = compAttrs['partial-name'] || component.get('type') === 'record-partial';
              
              // If component is before section in DOM and vertically aligned, it's likely to the left
              // OR if it's visually to the left
              const isToLeftOfSection = (isBeforeSectionInDOM && isVerticallyAligned) || isVisuallyToLeft;
              
              // If component is before section in DOM and vertically aligned, it's to the left - revert
              // OR if it's visually to the left
              // UNLESS it's a partial (which should be allowed at the top)
              if (((isBeforeSectionInDOM && isVerticallyAligned) || isVisuallyToLeft) && !isPartial) {
                shouldRevert = true;
                // Store the section index for later use
                break;
              }
              }
            }
            
            // Only revert if component was dropped at ROOT LEVEL to the left of a section
            // Don't revert if component is inside a valid container (tab section or section column)
            if (shouldRevert) {
              // Check if component is actually at root level - if not, it's a valid drop inside a container
              const root = this.editor.DomComponents.getWrapper();
              const rootChildren = root.components().models || [];
              const currentParent = component.parent && component.parent();
              
              // Check if component is at root level
              const isAtRoot = rootChildren.includes(component) || 
                              currentParent === root || 
                              newParent === root ||
                              (currentParent && currentParent.components && currentParent.components().models === rootChildren);
              
              // Only revert if it's at root level - otherwise it's a valid drop inside a container
              if (isAtRoot) {
                // Wait longer for GrapesJS to fully finish
                setTimeout(() => {
                  requestAnimationFrame(() => {
                    setTimeout(() => {
                      try {
                        // Get fresh children list
                        const freshChildren = root.components().models || [];
                        const currentIndex = freshChildren.findIndex(c => c === component);
                        const useIndex = currentIndex !== -1 ? currentIndex : (componentIndex !== -1 ? componentIndex : newIndex);
                        
                        // Find the first section and insert after it (or at end if no sections)
                        let insertAt = freshChildren.length;
                        for (let i = 0; i < freshChildren.length; i += 1) {
                          const child = freshChildren[i];
                          if (this.isSection(child)) {
                            // Insert after the section
                            insertAt = i + 1;
                            break;
                          }
                        }
                        
                        // Move if component is before a section (check both currentIndex and useIndex)
                        if ((currentIndex !== -1 && currentIndex < insertAt) || (useIndex !== -1 && useIndex !== null && useIndex < insertAt)) {
                          try {
                            const targetIndex = Math.min(insertAt, freshChildren.length);
                            // Remove component first
                            if (component.remove) {
                              component.remove();
                            }
                            // Wait a tick before re-adding
                            setTimeout(() => {
                              root.components().add(component, { at: targetIndex });
                            }, 10);
                          } catch(moveErr) {
                            console.warn('[PF] Error moving component:', moveErr);
                          }
                        }
                      } catch(err) {
                        console.warn('[PF] Error reverting component position:', err);
                      }
                    }, 100);
                  });
                }, 200);
              }
              // If not at root level, don't revert - it's a valid drop inside a container
            }
            
            // Reset tracking
            draggedComponentOriginalIndex = null;
            draggedComponentOriginalParent = null;
            draggedComponent = null;
          } catch(err) {
            console.warn('[PF] Error in component:drag:end check:', err);
          }
        }, 200);
      } catch(err) {
        console.warn('[PF] Error in component:drag:end prevention:', err);
      }
    });
    
    // Check component:add to immediately revert components placed before sections
    // BUT only if they're at root level, not inside valid containers
    this.editor.on('component:add', (component) => {
      // Use requestAnimationFrame to catch it as early as possible
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            // Only check if we're currently dragging (have tracked component)
            if (draggedComponent && component === draggedComponent && draggedComponentOriginalParent) {
              // Check if component is inside a valid container - if so, skip revert
              if (this.isInsideSectionOrTab(component)) {
                return; // Valid drop, don't revert
              }
              
              const root = this.editor.DomComponents.getWrapper();
              const rootChildren = root.components().models || [];
              const componentIndex = rootChildren.findIndex(c => c === component);
              
              // Check if component came from section/tab and is now at root level before a section
              const wasFromSectionOrTab = draggedComponentOriginalParent !== root &&
                                         !rootChildren.includes(draggedComponentOriginalParent);
              
              if (wasFromSectionOrTab && componentIndex !== -1) {
                // Find sections after this position
                for (let i = componentIndex + 1; i < rootChildren.length; i += 1) {
                const child = rootChildren[i];
                if (this.isSection(child)) {
                    // Component is before a section - immediately revert
                    // Hide the component element immediately to prevent visual flash
                    const compEl = component.getEl && component.getEl();
                    if (compEl) {
                      compEl.style.display = 'none';
                    }
                    
                    // Find valid position (after section)
                    let insertAt = i + 1;
                    
                    // Remove and re-add at valid position
                    component.remove();
                    root.components().add(component, { at: Math.min(insertAt, root.components().length) });
                    
                    // Show it again after moving
                    setTimeout(() => {
                      const newEl = component.getEl && component.getEl();
                      if (newEl) {
                        newEl.style.display = '';
                      }
                    }, 10);
                    
                    break;
                  }
                }
              }
            }
          } catch(err) {
            console.warn('[PF] Error in component:add check:', err);
          }
        });
      });
    });
    
    // Track when components are being moved to prevent section rebuilds
    let isMovingComponent = false;
    window.__pf_isMovingComponent = false; // Global flag for section component to check
    let draggedComponentForFlags = null; // Track the component being dragged
    let componentUpdateHandler = null; // Store the component:update handler to temporarily disable it
    
    this.editor.on('component:drag:start', (component) => {
      isMovingComponent = true;
      window.__pf_isMovingComponent = true;
      draggedComponentForFlags = component;
      
      // CRITICAL: Patch GrapesJS's toJSON and getAttributes to prevent recursion during drag
      // The recursion happens when GrapesJS tries to serialize components during drag
      try {
        const Components = this.editor.Components;
        if (Components && Components.Component) {
          const ComponentClass = Components.Component;
          
          // Patch toJSON to prevent recursion
          if (ComponentClass.prototype && ComponentClass.prototype.toJSON && !ComponentClass.prototype.__pf_toJSONPatched) {
            const originalToJSON = ComponentClass.prototype.toJSON;
            let toJSONCallDepth = 0;
            const MAX_TOJSON_DEPTH = 50; // Prevent infinite recursion
            
            ComponentClass.prototype.toJSON = function(...args) {
              if (window.__pf_isMovingComponent) {
                toJSONCallDepth++;
                if (toJSONCallDepth > MAX_TOJSON_DEPTH) {
                  console.warn('[PF] Prevented toJSON recursion during drag');
                  toJSONCallDepth = 0;
                  // Return a minimal JSON representation to break recursion
                  return {
                    type: this.get('type'),
                    tagName: this.get('tagName'),
                    components: []
                  };
                }
                const result = originalToJSON.apply(this, args);
                toJSONCallDepth--;
                return result;
              }
              return originalToJSON.apply(this, args);
            };
            
            ComponentClass.prototype.__pf_originalToJSON = originalToJSON;
            ComponentClass.prototype.__pf_toJSONPatched = true;
          }
          
          // Patch ensureInList as well
          if (ComponentClass.prototype && ComponentClass.prototype.ensureInList && !ComponentClass.prototype.__pf_ensureInListPatched) {
            const originalEnsureInList = ComponentClass.prototype.ensureInList;
            let ensureInListCallCount = 0;
            const MAX_ENSURE_CALLS = 100;
            
            ComponentClass.prototype.ensureInList = function(...args) {
              if (window.__pf_isMovingComponent) {
                ensureInListCallCount++;
                if (ensureInListCallCount > MAX_ENSURE_CALLS) {
                  console.warn('[PF] Prevented ensureInList recursion during drag');
                  ensureInListCallCount = 0;
                  return this;
                }
                const result = originalEnsureInList.apply(this, args);
                ensureInListCallCount--;
                return result;
              }
              return originalEnsureInList.apply(this, args);
            };
            
            ComponentClass.prototype.__pf_originalEnsureInList = originalEnsureInList;
            ComponentClass.prototype.__pf_ensureInListPatched = true;
          }
        }
      } catch(err) {
        console.warn('[PF] Error patching GrapesJS methods:', err);
      }
      
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
      // Restore original methods after drag completes
      setTimeout(() => {
        try {
          const Components = this.editor.Components;
          if (Components && Components.Component) {
            const ComponentClass = Components.Component;
            
            // Restore toJSON
            if (ComponentClass.prototype && ComponentClass.prototype.__pf_toJSONPatched) {
              if (ComponentClass.prototype.__pf_originalToJSON) {
                ComponentClass.prototype.toJSON = ComponentClass.prototype.__pf_originalToJSON;
                delete ComponentClass.prototype.__pf_originalToJSON;
                delete ComponentClass.prototype.__pf_toJSONPatched;
              }
            }
            
            // Restore ensureInList
            if (ComponentClass.prototype && ComponentClass.prototype.__pf_ensureInListPatched) {
              if (ComponentClass.prototype.__pf_originalEnsureInList) {
                ComponentClass.prototype.ensureInList = ComponentClass.prototype.__pf_originalEnsureInList;
                delete ComponentClass.prototype.__pf_originalEnsureInList;
                delete ComponentClass.prototype.__pf_ensureInListPatched;
              }
            }
          }
        } catch(err) {
          console.warn('[PF] Error restoring GrapesJS methods:', err);
        }
        
        // Clear flags after a delay to allow move to complete
        setTimeout(() => {
          isMovingComponent = false;
          window.__pf_isMovingComponent = false;
          
          // Clear _moving-component flags
          if (draggedComponentForFlags && typeof draggedComponentForFlags.removeAttributes === 'function') {
            try {
              draggedComponentForFlags.removeAttributes('_moving-component');
              
              // Clear flags on parent sections
              if (draggedComponentForFlags.parent) {
                let parent = draggedComponentForFlags.parent();
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
          draggedComponentForFlags = null;
        }, 300);
      }, 200);
    });
    
    // Also listen to component:update to ensure section containers stay non-droppable
    // AND to immediately revert components that are placed before sections
    this.editor.on('component:update', (component) => {
      // CRITICAL: Skip ALL updates if a component is being moved
      // This prevents ensureInList recursion by stopping rebuilds before they start
      // Check both local flag and global flag FIRST, before any other checks
      if (isMovingComponent || window.__pf_isMovingComponent) {
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
      try {
        if (this.isSection(component)) {
          // Ensure section container is not droppable
          component.set({ droppable: false });
          
          // Also ensure section body and wrapper are not droppable
          const el = component.getEl();
          if (el) {
            const sectionBody = el.querySelector('.pf-section-body');
            const sectionWrapper = el.querySelector('.pf-section');
            
            if (sectionBody) {
              const bodyComp = this.editor.Components.getComponent(sectionBody);
              if (bodyComp) {
                bodyComp.set({ droppable: false });
              }
            }
            
            if (sectionWrapper) {
              const wrapperComp = this.editor.Components.getComponent(sectionWrapper);
              if (wrapperComp) {
                wrapperComp.set({ droppable: false });
              }
            }
          }
        } else {
          // Check if this component was just moved and is now before a section
          // Only check if we're currently dragging (have tracked component)
          if (draggedComponent && component === draggedComponent && draggedComponentOriginalParent) {
            // Check if component is inside a valid container - if so, skip revert
            if (this.isInsideSectionOrTab(component)) {
              return; // Valid drop, don't revert
            }
            
            const root = this.editor.DomComponents.getWrapper();
            const rootChildren = root.components().models || [];
            const componentIndex = rootChildren.findIndex(c => c === component);
            
            // Check if component came from section/tab and is now at root level before a section
            const wasFromSectionOrTab = draggedComponentOriginalParent !== root &&
                                       !rootChildren.includes(draggedComponentOriginalParent);
            
            // Check if component is at root level and before a section
            if (wasFromSectionOrTab && componentIndex !== -1) {
              // Find sections after this position
              for (let i = componentIndex + 1; i < rootChildren.length; i += 1) {
                const child = rootChildren[i];
                if (this.isSection(child)) {
                  // Component is before a section - immediately revert
                  
                  // Hide the component element immediately to prevent visual flash
                  const compEl = component.getEl && component.getEl();
                  if (compEl) {
                    compEl.style.display = 'none';
                  }
                  
                  // Find valid position (after section)
                  let insertAt = i + 1;
                  
                  // Remove and re-add at valid position
                  component.remove();
                  root.components().add(component, { at: Math.min(insertAt, root.components().length) });
                  
                  // Show it again after moving
                  setTimeout(() => {
                    const newEl = component.getEl && component.getEl();
                    if (newEl) {
                      newEl.style.display = '';
                    }
                  }, 10);
                  
                  break;
                }
              }
            }
          }
        }
      } catch(err) {
        console.warn('[PF] Error ensuring section is non-droppable:', err);
      }
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
          if (this.isSection(child)) {
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

  setupComponentLocking() {
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
    this.editor.on('component:update', (component) => {
      const attrs = component.getAttributes ? component.getAttributes() : {};
      if (attrs['field-api-name'] || attrs['partial-name']) {
        setTimeout(() => {
          this.addDeleteButton(component);
          // Ensure fields/partials are not droppable (can't drop components into them)
          component.set({ droppable: false });
          this.lockInnerComponents(component);
        }, 10);
      } else if (attrs['data-comp-kind'] === 'record-tabs' || component.get('type') === 'record-tabs') {
        // CRITICAL: Ensure tabs are draggable FIRST, before any other operations
        component.set({
          draggable: true,
          selectable: true,
          hoverable: true,
          highlightable: true,
          droppable: false
        });
        
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
          this.lockTabsInnerComponents(component);
          // Only call buildWorkingTabs if structure doesn't exist or needs update
          // Don't call it on every update to prevent loops
          const el = component.getEl();
          const hasStructure = el && el.querySelector('.pf-tabs') && 
                               el.querySelector('.pf-tabs-header') && 
                               el.querySelector('.pf-tabs-body');
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
          // CRITICAL: Set type first, then draggable
          if (component.get('type') !== 'record-section') {
            component.set('type', 'record-section');
          }
          // Ensure section container is draggable and not droppable (only columns should accept drops)
          component.set({ 
            draggable: true,
            selectable: true,
            hoverable: true,
            highlightable: true,
            droppable: false 
          });
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
          // Only call buildWorkingSection if structure doesn't exist or needs update
          // Don't call it on every update to prevent loops
          const hasStructure = el && el.querySelector('.pf-section') && 
                               el.querySelector('.pf-section-body');
          
          // CRITICAL: Also check if columns exist with content - if so, never rebuild
          const existingColumns = el?.querySelectorAll('.pf-section-column');
          const hasColumnsWithContent = existingColumns && existingColumns.length > 0 && 
            Array.from(existingColumns).some(col => col.children.length > 0);
          
          // Only rebuild if structure is missing AND columns don't have content
          // This prevents accidental deletion when moving fields between columns
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

  lockTabsInnerComponents(comp) {
    try {
      const el = comp.getEl();
      if (!el) return;
      
      // First, ensure the main tabs container is draggable (so the whole component can be moved)
      // CRITICAL: Set type first, then draggable
      if (comp.get('type') !== 'record-tabs') {
        comp.set('type', 'record-tabs');
      }
      comp.set({
        draggable: true,
        selectable: true,
        hoverable: true,
        highlightable: true,
        droppable: false
      });
      
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

  addSaveCommand() {
    this.editor.Commands.add('save-record-layout', {
      run: (editor, sender, options) => {
        // Before getting HTML, verify tabs components are recognized and fix their type
        const root = editor.DomComponents.getWrapper();
        const tabsComponents = root.find('[data-comp-kind="record-tabs"]');
        tabsComponents.forEach((tab, idx) => {
          // CRITICAL: Ensure type is set so toHTML is called
          const currentType = tab.get('type');
          if (currentType !== 'record-tabs') {
            tab.set('type', 'record-tabs');
          }
          
          const type = tab.get('type');
          const hasToHTML = typeof tab.toHTML === 'function';
          
          // Check if tabsWrapper is a child component
          const tabsWrapper = tab.components().find(c => {
            const el = c.getEl();
            return el && el.classList && el.classList.contains('pf-tabs');
          });
          
          if (!tabsWrapper) {
            // tabsWrapper not found in component tree - need to rebuild structure
            console.warn(`[PF] Tab ${idx}: tabsWrapper not in component tree! Rebuilding...`);
            if (window.TabsComponent && window.TabsComponent.buildWorkingTabs) {
              // Mark as updating to force rebuild
              tab.addAttributes({ '_updating-tabs': 'true' });
              window.TabsComponent.buildWorkingTabs(tab);
              tab.addAttributes({ '_updating-tabs': '' });
            }
          } else {
            const bodyComp = tabsWrapper.components().find(c => {
              const el = c.getEl();
              return el && el.classList && el.classList.contains('pf-tabs-body');
            });
            if (bodyComp) {
              const sections = bodyComp.components();
              sections.forEach((section, secIdx) => {
                const sectionChildren = section.components();
              });
            }
          }
        });
        
        // Get HTML with all components properly serialized
        let html = editor.getHtml();
        let css = editor.getCss();
        let js = editor.getJs() || '';
        
        // Debug: Log what we're getting
        
        // Check if tabs are in the HTML
        if (html.includes('pf-tabs')) {
          
          // Extract the tabs component HTML to inspect it
          const tabsMatch = html.match(/<div[^>]*class="[^"]*pf-tabs-container[^"]*"[^>]*>([\s\S]*?)<\/div>/);
          if (tabsMatch) {
            const tabsHtml = tabsMatch[1];
            
            // Check for tab sections in the inner HTML
            if (tabsHtml.includes('pf-tab-section')) {
            } else {
              console.warn('[PF] Tab sections NOT found in tabs component HTML!');
            }
          }
          
          // Check for tab sections in full HTML
          if (html.includes('pf-tab-section')) {
          } else {
            console.warn('[PF] Tab sections NOT found in HTML!');
          }
        } else {
          console.warn('[PF] Tabs component NOT found in HTML!');
        }
        
        // Check for record-field and record-partial components
        const fieldCount = (html.match(/record-field/g) || []).length;
        const partialCount = (html.match(/record-partial/g) || []).length;
        
        // Check for fields inside tab sections specifically
        if (html.includes('pf-tab-section')) {
          const tabSectionMatches = html.match(/<div[^>]*class="[^"]*pf-tab-section[^"]*"[^>]*>([\s\S]*?)<\/div>/g);
          if (tabSectionMatches) {
            tabSectionMatches.forEach((match, idx) => {
              const hasField = match.includes('record-field') || match.includes('field-api-name');
              const hasPartial = match.includes('record-partial') || match.includes('partial-name');
            });
          }
        }
        
        // Get runtime tabs JavaScript and CSS from the TabsComponent
        if (window.TabsComponent && window.TabsComponent.getRuntimeCode) {
          const runtimeCode = window.TabsComponent.getRuntimeCode();
          
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
            if (jsCode) {
              js = js + '\n' + jsCode;
            }
          } else {
            console.warn('[PF] Could not find JS part in runtime content');
          }
          
          if (parts.length > 1) {
            cssCode = parts[1].trim();
            if (cssCode) {
              css = css + '\n' + cssCode;
            }
          } else {
            console.warn('[PF] Could not find CSS part in runtime content');
          }
        } else {
          console.warn('[PF] TabsComponent.getRuntimeCode not available');
        }
        
        // Add section runtime code
        if (window.SectionComponent && window.SectionComponent.getRuntimeCode) {
          const runtimeCode = window.SectionComponent.getRuntimeCode();
          
          // Split into JS and CSS parts based on the "// Runtime section CSS" marker
          const parts = runtimeCode.split('// Runtime section CSS');
          let jsCode = '';
          let cssCode = '';
          
          if (parts.length > 0) {
            // Get JS part - remove comment markers
            jsCode = parts[0]
              .replace('/* RUNTIME: Section JavaScript and CSS */', '')
              .replace('// Runtime section functionality - ONLY runs on rendered pages, not in builder', '')
              .replace('// Runtime section functionality', '')
              .trim();
            if (jsCode) {
              js = js + '\n' + jsCode;
            }
          } else {
            console.warn('[PF] Could not find JS part in section runtime content');
          }
          
          if (parts.length > 1) {
            cssCode = parts[1].trim();
            if (cssCode) {
              css = css + '\n' + cssCode;
            }
          } else {
            console.warn('[PF] Could not find CSS part in section runtime content');
          }
        } else {
          console.warn('[PF] SectionComponent.getRuntimeCode not available');
        }
        
        const sanitizedHtml = this.sanitizeLayoutHtml(html);
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
        },
        toHTML(opts = {}) {
          // Custom serialization to preserve inner HTML content
          const attrs = this.getAttributes();
          const partialName = attrs['partial-name'] || '';
          const el = this.getEl();
          
          // Build the opening tag with attributes
          let html = '<div';
          if (partialName) {
            html += ` partial-name="${String(partialName).replace(/"/g, '&quot;')}"`;
          }
          
          // Add other important attributes
          ['data-comp-id', 'data-comp-kind'].forEach(key => {
            const val = attrs[key];
            if (val != null && val !== '') {
              html += ` ${key}="${String(val).replace(/"/g, '&quot;').replace(/&/g, '&amp;')}"`;
            }
          });
          
          // Add classes (but exclude builder-only classes in saved HTML)
          const classes = this.get('classes').map(c => c.get('name')).filter(c => 
            c !== 'pf-interactive' && c !== 'gjs-selected' && c !== 'gjs-hovered'
          ).join(' ');
          if (classes) html += ` class="${classes}"`;
          html += '>';
          
          // Get inner HTML from actual DOM element to preserve all content including photo container
          if (el) {
            // Clone to avoid modifying the original
            const clone = el.cloneNode(true);
            // Remove the delete button from the clone
            const delBtn = clone.querySelector('.rb-del');
            if (delBtn) delBtn.remove();
            // Get innerHTML which includes all the pet header content
            html += clone.innerHTML;
          } else {
            // Fallback: serialize child components
            const children = this.components();
            children.forEach(child => {
              try {
                // Skip the delete button when serializing
                const childAttrs = child.getAttributes ? child.getAttributes() : {};
                if (childAttrs.class && childAttrs.class.includes('rb-del')) {
                  return; // Skip delete button
                }
                if (child.toHTML) {
                  html += child.toHTML(opts);
                } else {
                  // Fallback for text nodes or components without toHTML
                  const childEl = child.getEl ? child.getEl() : null;
                  if (childEl) {
                    html += childEl.outerHTML;
                  }
                }
              } catch(e) {
                console.warn('[PF] Error serializing partial child:', e);
              }
            });
          }
          
          html += '</div>';
          return html;
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

  isSection(comp) {
    // Helper to check if a component is a section
    if (!comp) return false;
    const attrs = comp.getAttributes ? comp.getAttributes() : {};
    return attrs['data-comp-kind'] === 'record-section' || comp.get('type') === 'record-section';
  }

  isInsideSectionOrTab(comp) {
    // Check if component is inside a tab section or section column
    try {
      let current = comp;
      let depth = 0;
      const maxDepth = 20; // Prevent infinite loops
      
      while (current && depth < maxDepth) {
        const parent = current.parent && current.parent();
        if (!parent) break;
        
        const parentAttrs = parent.getAttributes ? parent.getAttributes() : {};
        const parentEl = parent.getEl();
        
        // Check if parent is a tab section or section column
        if (parentAttrs['data-role'] === 'pf-tab-section' || 
            parentAttrs['data-role'] === 'pf-section-column' ||
            (parentEl && (
              parentEl.classList.contains('pf-tab-section') ||
              parentEl.classList.contains('pf-section-column')
            ))) {
          return true;
        }
        
        current = parent;
        depth++;
      }
    } catch (error) {
      console.warn('[PF] Error checking if inside section/tab:', error);
    }
    return false;
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
          
          // Check if this child is itself a field/partial component (not just inner content)
          const isFieldOrPartial = attrs['field-api-name'] || attrs['partial-name'] || 
                                   ch.get('type') === 'record-field' || ch.get('type') === 'record-partial';
          
          // Check if this child is inside a section/tab
          const isInsideSection = this.isInsideSectionOrTab(ch);
          
          if (isDeleteButton) {
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
          } else if (isFieldOrPartial && isInsideSection) {
            // This is a field/partial component inside a section/tab - make it draggable
            // But still lock its inner children (they will be processed in the next iteration)
            ch.set({
              selectable: true,
              hoverable: true,
              draggable: true,
              droppable: false,
              editable: false,
              copyable: false,
              highlightable: true
            });
            // Continue to lock inner children
            if (ch.components && ch.components().length) {
              stack.push(ch);
            }
          } else {
            // This is inner content (not a field/partial component itself) - always lock it
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

  setupTabsComponent() {
    
    if (!this.editor) {
      console.error('[PF] Editor not ready!');
      return;
    }
    
    if (!window.TabsComponent) {
      console.error('[PF] window.TabsComponent not available! Check console for JavaScript errors in tabs partial.');
      return;
    }
    
    if (!window.TabsComponent.defineTabsComponent) {
      console.error('[PF] defineTabsComponent function not found on TabsComponent!');
      return;
    }
    
    try {
      window.TabsComponent.defineTabsComponent(this.editor);
      
      // Verify it was registered (types might be returned as an array or object)
      const types = this.editor.DomComponents.getTypes();
      const typeNames = typeof types === 'object' && !Array.isArray(types) ? Object.keys(types) : [];
      if (!typeNames.includes('record-tabs') && !types['record-tabs']) {
        // This is just a warning - registration might have succeeded even if check fails
        console.warn('[PF] Component type check failed (may still be registered)');
      }
    } catch(e) {
      console.error('[PF] Error registering tabs component:', e);
      console.error('[PF] Error stack:', e.stack);
    }
  }

  setupSectionComponent() {
    if (!this.editor) {
      console.error('[PF] Editor not ready!');
      return;
    }
    
    // Wait for SectionComponent to be available (script might load after this runs)
    const tryRegister = (attempts = 0) => {
      if (!window.SectionComponent) {
        if (attempts < 20) {
          // Retry after a short delay (up to 2 seconds)
          setTimeout(() => tryRegister(attempts + 1), 100);
          if (attempts === 0) {
            console.log('[PF] Waiting for SectionComponent to load...');
          }
          return;
        } else {
          console.error('[PF] window.SectionComponent not available after 20 attempts (2 seconds)!');
          console.error('[PF] This usually means there is a JavaScript error in the section component partial.');
          console.error('[PF] Check the browser console for errors in _section_component.html.erb');
          return;
        }
      }
      
      if (attempts > 0) {
        console.log(`[PF] SectionComponent loaded after ${attempts} attempts`);
      }
      
      if (!window.SectionComponent.defineSectionComponent) {
        console.error('[PF] defineSectionComponent function not found on SectionComponent!');
        console.error('[PF] SectionComponent keys:', Object.keys(window.SectionComponent || {}));
        return;
      }
      
      try {
        // Check if already registered to avoid duplicate registration
        const existingTypes = this.editor.DomComponents.getTypes();
        const typeNames = typeof existingTypes === 'object' && !Array.isArray(existingTypes) ? Object.keys(existingTypes) : [];
        if (typeNames.includes('record-section') || existingTypes['record-section']) {
          console.log('[PF] Section component type already registered, skipping');
          return;
        }
        
        window.SectionComponent.defineSectionComponent(this.editor);
        
        // Verify it was registered - getTypes() might return an object or array
        const types = this.editor.DomComponents.getTypes();
        let newTypeNames = [];
        if (Array.isArray(types)) {
          newTypeNames = types;
        } else if (typeof types === 'object' && types !== null) {
          newTypeNames = Object.keys(types);
        }
        
        // Check if registered (might be in the types object or array)
        const isRegistered = newTypeNames.includes('record-section') || 
                            (types && types['record-section']) ||
                            (this.editor.DomComponents.getType && this.editor.DomComponents.getType('record-section'));
        
        if (!isRegistered) {
          console.error('[PF] Component type registration failed!');
          console.error('[PF] Available types:', newTypeNames);
          console.error('[PF] Types object:', types);
        } else {
          console.log('[PF] Section component type registered successfully');
        }
      } catch(e) {
        console.error('[PF] Error registering section component:', e);
        console.error('[PF] Error stack:', e.stack);
      }
    };
    
    tryRegister();
  }

  loadInitialContent() {
    if (!this.editor) return;
    
    const metadataScript = document.getElementById('record-layout-metadata');
    if (!metadataScript) {
      console.error('[PF] No metadata script found');
      return;
    }
    
    try {
      const meta = JSON.parse(metadataScript.textContent);
      const initialHtml = meta.layout_html || '';
      const initialCss = meta.layout_css || '';
      
      if (initialHtml) {
        this.editor.setComponents(initialHtml);
        
        // Lock inner components of all existing fields and partials, and rebuild tabs
        setTimeout(() => {
          try {
            if (!this.editor || !this.editor.DomComponents) return;
            const root = this.editor.DomComponents.getWrapper();
            const fields = root.find('[field-api-name]');
            const partials = root.find('[partial-name]');
            const tabs = root.find('[data-comp-kind="record-tabs"]');
            const sections = root.find('[data-comp-kind="record-section"]');
            
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
                
                // Ensure field is not droppable (can't drop components into it)
                field.set({ droppable: false });
                
                // Check if field is inside a section/tab - if so, keep it draggable
                const isInsideSection = this.isInsideSectionOrTab(field);
                if (isInsideSection) {
                  // Keep draggable and selectable if inside section/tab
                  field.set({
                    selectable: true,
                    hoverable: true,
                    draggable: true,
                    highlightable: true,
                    droppable: false // Still not droppable
                  });
                  // Ensure the element itself can receive drag events
                  const fieldEl = field.getEl();
                  if (fieldEl) {
                    fieldEl.style.pointerEvents = 'auto';
                    // Make sure inner locked content doesn't block drag
                    if (this.editor && this.editor.Components) {
                      fieldEl.querySelectorAll('*').forEach(child => {
                        try {
                          const childComp = this.editor.Components.getComponent(child);
                          if (!childComp || (!childComp.getAttributes()?.['field-api-name'] && 
                              !childComp.getAttributes()?.['partial-name'] &&
                              childComp.get('type') !== 'record-field' && 
                              childComp.get('type') !== 'record-partial')) {
                            // This is inner content, not a component itself
                            child.style.pointerEvents = 'none';
                          }
                        } catch(err) {
                          // Component not found or error accessing it - just set pointer-events
                          child.style.pointerEvents = 'none';
                        }
                      });
                    }
                  }
                }
                // Always lock inner components (labels, values, etc.) regardless of location
                this.lockInnerComponents(field);
              });
              partials.forEach(partial => {
                const el = partial.getEl();
                const partialName = partial.getAttributes()?.['partial-name'] || '';
                
                // CRITICAL: Always inject preview content for pet header partials to ensure photo is always shown
                // This matches exactly how it works when dragging a new partial from the sidebar
                if (el && partialName === 'pets/pet_header') {
                  try {
                    const previewScript = document.getElementById('record-layout-preview');
                    if (previewScript) {
                      const preview = JSON.parse(previewScript.textContent);
                      const parts = preview.partials || {};
                      const html = parts[partialName] || '';
                      
                      if (html) {
                        // EXACTLY match the drag-from-sidebar behavior
                        // First clear any existing components
                        partial.components('');
                        // Then inject fresh preview HTML
                        partial.components(html);
                        
                        // Add delete button and lock components - same as drag behavior
                        setTimeout(() => {
                          this.addDeleteButton(partial);
                          this.lockInnerComponents(partial);
                        }, 50);
                      }
                    }
                  } catch(e) {
                    console.error('[PF] Error injecting preview content for pet header:', e);
                  }
                } else if (el && partialName) {
                  // For other partials, only inject if content is missing
                  const hasContent = el.querySelector('.pet-header, .pet-photo-container, [field-api-name]');
                  if (!hasContent) {
                    // Partial content is missing - inject preview content
                    try {
                      const previewScript = document.getElementById('record-layout-preview');
                      if (previewScript) {
                        const preview = JSON.parse(previewScript.textContent);
                        const parts = preview.partials || {};
                        const html = parts[partialName] || '';
                        if (html) {
                          // Clear existing content and inject preview
                          const existingDelBtn = el.querySelector('.rb-del');
                          el.innerHTML = '';
                          if (existingDelBtn) {
                            el.appendChild(existingDelBtn);
                          }
                          partial.components(html);
                        }
                      }
                    } catch(e) {
                      console.warn('[PF] Error injecting preview content for partial:', e);
                    }
                  }
                }
                
                if (el) {
                  // Ensure component has pf-interactive class for delete button to show
                  if (!el.classList.contains('pf-interactive')) {
                    el.classList.add('pf-interactive');
                  }
                  // Ensure component has relative positioning for delete button
                  if (window.getComputedStyle(el).position === 'static') {
                    el.style.position = 'relative';
                  }
                  
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
                
                // Ensure partial is not droppable (can't drop components into it)
                partial.set({ droppable: false });
                
                // Check if partial is inside a section/tab - if so, keep it draggable
                const isInsideSection = this.isInsideSectionOrTab(partial);
                if (isInsideSection) {
                  // Keep draggable and selectable if inside section/tab
                  partial.set({
                    selectable: true,
                    hoverable: true,
                    draggable: true,
                    highlightable: true,
                    droppable: false // Still not droppable
                  });
                  // Ensure the element itself can receive drag events
                  const partialEl = partial.getEl();
                  if (partialEl) {
                    partialEl.style.pointerEvents = 'auto';
                    // Make sure inner locked content doesn't block drag
                    partialEl.querySelectorAll('*').forEach(child => {
                      const childComp = this.editor.Components.getComponent(child);
                      if (!childComp || (!childComp.getAttributes()?.['field-api-name'] && 
                          !childComp.getAttributes()?.['partial-name'] &&
                          childComp.get('type') !== 'record-field' && 
                          childComp.get('type') !== 'record-partial')) {
                        // This is inner content, not a component itself
                        child.style.pointerEvents = 'none';
                      }
                    });
                  }
                }
                // Always lock inner components (content, etc.) regardless of location
                this.lockInnerComponents(partial);
              });
            }, 100);
            
            // CRITICAL: Extract attributes from HTML FIRST, before any rendering
            // This must happen before buildWorkingTabs/buildWorkingSection is called (which might happen via onRender)
            tabs.forEach(tab => {
              const tabEl = tab.getEl();
              if (tabEl) {
                // Extract tabs-json from HTML and set as attribute immediately
                const tabsJsonFromHtml = tabEl.getAttribute('tabs-json');
                if (tabsJsonFromHtml) {
                  const currentTabsJson = tab.getAttributes()['tabs-json'];
                  if (tabsJsonFromHtml !== currentTabsJson) {
                    tab.addAttributes({ 'tabs-json': tabsJsonFromHtml });
                  }
                }
                // Also extract active-tab-id
                const activeTabIdFromHtml = tabEl.getAttribute('active-tab-id');
                if (activeTabIdFromHtml) {
                  tab.addAttributes({ 'active-tab-id': activeTabIdFromHtml });
                }
              }
              
              // CRITICAL: Ensure the component has the correct type set
              const currentType = tab.get('type');
              if (currentType !== 'record-tabs') {
                tab.set('type', 'record-tabs');
              }
            });
            
            // Rebuild tabs AFTER fields/partials are processed
            // This ensures tabs are rebuilt with delete buttons after all content is loaded
            tabs.forEach(tab => {
              
              // CRITICAL: Before rebuilding, ensure fields inside sections are parsed as components
              // When HTML is loaded, GrapesJS might not have parsed nested components yet
              const bodyComp = tab.find('.pf-tabs-body')[0];
              if (bodyComp) {
                const sections = tab.find('[data-role="pf-tab-section"]').slice(0, 500);
                sections.forEach(section => {
                  const sectionEl = section.getEl();
                  if (sectionEl) {
                    // Check if section has HTML content but no components
                    const hasHtml = sectionEl.innerHTML.trim().length > 0;
                    const hasComponents = section.components().length > 0;
                    
                    
                    if (hasHtml && !hasComponents) {
                      // Section has HTML but no components - need to parse it
                      try {
                        // Get the HTML and re-parse it as components
                        const html = sectionEl.innerHTML;
                        // Clear and re-add to force parsing
                        section.components(html);
                        const parsedComponents = section.components();
                        
                        // Set components to draggable after parsing (they're inside a tab section)
                        parsedComponents.forEach(child => {
                          if (child.get && (child.get('type') === 'record-field' || child.get('type') === 'record-partial')) {
                            // Components inside tab sections should be draggable but not droppable
                            child.set({
                              selectable: true,
                              hoverable: true,
                              draggable: true,
                              highlightable: true,
                              droppable: false // Can't drop components into fields/partials
                            });
                            // But still lock their inner content
                            this.lockInnerComponents(child);
                            this.addDeleteButton(child);
                          }
                        });
                      } catch(e) {
                        console.error('[PF] Error parsing section HTML:', e);
                      }
                    } else if (hasComponents) {
                      // Components exist, set them to draggable (they're inside a tab section)
                      section.components().forEach(child => {
                        if (child.get && (child.get('type') === 'record-field' || child.get('type') === 'record-partial')) {
                          // Components inside tab sections should be draggable but not droppable
                          child.set({
                            selectable: true,
                            hoverable: true,
                            draggable: true,
                            highlightable: true,
                            droppable: false // Can't drop components into fields/partials
                          });
                          // But still lock their inner content
                          this.lockInnerComponents(child);
                          this.addDeleteButton(child);
                        }
                      });
                    }
                  }
                });
              }
              
              // Force a re-render first to ensure DOM is ready
              if (tab.view && tab.view.render) {
                tab.view.render();
              }
              
              // Wait a bit for the component to be fully rendered in the DOM
              setTimeout(() => {
                // Call buildWorkingTabs to rebuild the structure
                // buildWorkingTabs is defined in the tabs component partial
                if (window.TabsComponent && window.TabsComponent.buildWorkingTabs) {
                  window.TabsComponent.buildWorkingTabs(tab);
                  
                  // After buildWorkingTabs, ensure type is still set
                  if (tab.get('type') !== 'record-tabs') {
                    tab.set('type', 'record-tabs');
                  }
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
                  if (compEl) {
                    const existingBtn = compEl.querySelector('.rb-del');
                    if (!existingBtn) {
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
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          // tab is the model, so try to get the view from the editor
                          const editor = window.recordLayoutBuilderInstance?.editor;
                          if (editor) {
                            // Get the view from the component manager
                            const view = editor.Components.getView(tab);
                            if (view && typeof view.onDelete === 'function') {
                              view.onDelete(e);
                            } else if (tab && typeof tab.remove === 'function') {
                              tab.remove();
                            } else {
                              console.warn('[PF] Could not remove tabs component - view.onDelete not available (manual)', { tab, view });
                            }
                          } else {
                            // Fallback: try direct remove
                            if (tab && typeof tab.remove === 'function') {
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
                      // Re-attach handler to be safe
                      existingBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          // tab is the model, so try to get the view from the editor
                          const editor = window.recordLayoutBuilderInstance?.editor;
                          if (editor) {
                            // Get the view from the component manager
                            const view = editor.Components.getView(tab);
                            if (view && typeof view.onDelete === 'function') {
                              view.onDelete(e);
                            } else if (tab && typeof tab.remove === 'function') {
                              tab.remove();
                            } else {
                              console.warn('[PF] Could not remove - no remove method', { tab, view });
                            }
                          } else {
                            // Fallback: try direct remove
                            if (tab && typeof tab.remove === 'function') {
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
              tabs.forEach(tab => {
                const compEl = tab.getEl();
                if (compEl) {
                  let deleteBtn = compEl.querySelector('.rb-del');
                  if (!deleteBtn) {
                    deleteBtn = document.createElement('span');
                    deleteBtn.className = 'rb-del';
                    deleteBtn.setAttribute('data-role', 'rb-del');
                    deleteBtn.setAttribute('aria-label', 'Delete');
                    deleteBtn.title = 'Delete';
                    deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M135.2 17.7C140.6 7.2 151.7 0 164 0h120c12.3 0 23.4 7.2 28.8 17.7L328 32H432c8.8 0 16 7.2 16 16s-7.2 16-16 16H16C7.2 64 0 56.8 0 48S7.2 32 16 32H120l15.2-14.3zM32 96H416l-21.2 371.6c-1.8 31.3-27.7 56.4-59.1 56.4H112.3c-31.4 0-57.3-25.1-59.1-56.4L32 96zm112 80c-8.8 0-16 7.2-16 16V416c0 8.8 7.2 16 16 16s16-7.2 16-16V192c0-8.8-7.2-16-16-16zm80 0c-8.8 0-16 7.2-16 16V416c0 8.8 7.2 16 16 16s16-7.2 16-16V192c0-8.8-7.2-16-16-16zm80 0c-8.8 0-16 7.2-16 16V416c0 8.8 7.2 16 16 16s16-7.2 16-16V192c0-8.8-7.2-16-16-16z"/></svg>';
                    deleteBtn.style.cssText = 'position: absolute; top: 4px; right: 6px; background: rgba(0,0,0,0.7); color: #fff; border-radius: 12px; width: 22px; height: 22px; display: none; align-items: center; justify-content: center; text-align: center; font-size: 12px; cursor: pointer; z-index: 9999; pointer-events: auto;';
                    
                    const deleteHandler = (e) => {
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
            
            // Final pass: ensure all components inside sections/tabs are draggable
            // Also ensure tabs and sections themselves are draggable
            setTimeout(() => {
              
              // Ensure all tabs and sections at root level are draggable
              const allTabs = root.find('[data-comp-kind="record-tabs"]').slice(0, 1000);
              allTabs.forEach(tab => {
                // CRITICAL: Set type first, then draggable
                if (tab.get('type') !== 'record-tabs') {
                  tab.set('type', 'record-tabs');
                }
                tab.set({
                  draggable: true,
                  selectable: true,
                  hoverable: true,
                  highlightable: true,
                  droppable: false
                });
                // Also ensure the DOM element has the right attributes
                const tabEl = tab.getEl();
                if (tabEl) {
                  tabEl.setAttribute('draggable', 'true');
                  tabEl.style.cursor = 'move';
                  tabEl.style.pointerEvents = 'auto';
                  // Make ALL inner elements allow events to bubble
                  const allInner = tabEl.querySelectorAll('*');
                  allInner.forEach(inner => {
                    inner.style.pointerEvents = 'auto';
                    inner.removeAttribute('draggable');
                  });
                }
              });
              
              const allSections = root.find('[data-comp-kind="record-section"]').slice(0, 1000);
              allSections.forEach(section => {
                // CRITICAL: Set type first, then draggable
                if (section.get('type') !== 'record-section') {
                  section.set('type', 'record-section');
                }
                section.set({
                  draggable: true,
                  selectable: true,
                  hoverable: true,
                  highlightable: true,
                  droppable: false
                });
                // Also ensure the DOM element has the right attributes
                const sectionEl = section.getEl();
                if (sectionEl) {
                  sectionEl.setAttribute('draggable', 'true');
                  sectionEl.style.cursor = 'move';
                  sectionEl.style.pointerEvents = 'auto';
                  
                  // CRITICAL: Ensure inner wrapper components don't block dragging
                  // The section container itself should be draggable, not inner wrappers
                  const innerWrappers = sectionEl.querySelectorAll('.pf-section, .pf-section-body');
                  innerWrappers.forEach(wrapper => {
                    // Remove draggable from inner wrappers - only the container should be draggable
                    wrapper.removeAttribute('draggable');
                    // Set pointer-events to none so clicks bubble to parent, but allow columns to accept drops
                    wrapper.style.pointerEvents = 'none';
                    // But allow pointer events on droppable columns
                    const columns = wrapper.querySelectorAll('[data-role="pf-section-column"]');
                    columns.forEach(col => {
                      col.style.pointerEvents = 'auto'; // Columns need to accept drops
                    });
                  });
                  
                  // Make other inner elements allow events to bubble (but don't make them draggable)
                  // Exception: keep pointer events on interactive elements (delete buttons, edit buttons, columns)
                  const allInner = sectionEl.querySelectorAll('*');
                  allInner.forEach(inner => {
                    const isColumn = inner.hasAttribute('data-role') && inner.getAttribute('data-role') === 'pf-section-column';
                    const isButton = inner.classList.contains('rb-del') || inner.classList.contains('rb-edit-section');
                    const isWrapper = inner.classList.contains('pf-section') || inner.classList.contains('pf-section-body');
                    
                    if (!isColumn && !isButton && !isWrapper) {
                      inner.style.pointerEvents = 'none';
                    }
                    // Never make inner elements draggable - only the container
                    inner.removeAttribute('draggable');
                  });
                  
                  // Ensure the section container can receive drag events
                  // Use GrapesJS's drag system by ensuring the component is properly configured
                  sectionEl.style.userSelect = 'none'; // Prevent text selection during drag
                }
              });
              
              // Check all tab sections
              const allTabSections = root.find('[data-role="pf-tab-section"]').slice(0, 1000);
              allTabSections.forEach(section => {
                section.components().forEach(child => {
                  const attrs = child.getAttributes ? child.getAttributes() : {};
                  if (attrs['field-api-name'] || attrs['partial-name'] || 
                      child.get('type') === 'record-field' || child.get('type') === 'record-partial' ||
                      child.get('type') === 'record-tabs' || child.get('type') === 'record-section') {
                    child.set({
                      selectable: true,
                      hoverable: true,
                      draggable: true,
                      highlightable: true,
                      droppable: false // Can't drop components into fields/partials
                    });
                    // Ensure pointer events work correctly
                    const childEl = child.getEl();
                    if (childEl) {
                      childEl.style.pointerEvents = 'auto';
                      // Make inner content not block drag
                      childEl.querySelectorAll('*').forEach(inner => {
                        const innerComp = this.editor.Components.getComponent(inner);
                        if (!innerComp || (!innerComp.getAttributes()?.['field-api-name'] && 
                            !innerComp.getAttributes()?.['partial-name'] &&
                            innerComp.get('type') !== 'record-field' && 
                            innerComp.get('type') !== 'record-partial')) {
                          inner.style.pointerEvents = 'none';
                        }
                      });
                    }
                  }
                });
              });
              
              // Check all section columns - ensure columns themselves are not draggable
              const allSectionColumns = root.find('[data-role="pf-section-column"]').slice(0, 1000);
              allSectionColumns.forEach(column => {
                // Ensure the column itself is not draggable but accepts drops with correct accept array
                column.set({
                  draggable: false,
                  selectable: false,
                  hoverable: false,
                  droppable: true, // But it should accept drops
                  accept: ['record-field', 'record-partial', 'record-section', 'record-tabs'], // Ensure accept is set
                  highlightable: false
                });
                
                column.components().forEach(child => {
                  const attrs = child.getAttributes ? child.getAttributes() : {};
                  
                  // CRITICAL: Ensure component type is set correctly for accept matching
                  if (child.get('type') === 'record-tabs' || attrs['data-comp-kind'] === 'record-tabs') {
                    child.set('type', 'record-tabs');
                  }
                  if (child.get('type') === 'record-section' || attrs['data-comp-kind'] === 'record-section') {
                    child.set('type', 'record-section');
                  }
                  
                  if (attrs['field-api-name'] || attrs['partial-name'] || 
                      child.get('type') === 'record-field' || child.get('type') === 'record-partial' ||
                      child.get('type') === 'record-tabs' || child.get('type') === 'record-section') {
                    child.set({
                      selectable: true,
                      hoverable: true,
                      draggable: true,
                      highlightable: true,
                      droppable: false // Can't drop components into fields/partials
                    });
                    // Ensure pointer events work correctly
                    const childEl = child.getEl();
                    if (childEl) {
                      childEl.style.pointerEvents = 'auto';
                      
                      // For tabs/sections, ensure inner containers allow dragging from anywhere
                      if (child.get('type') === 'record-tabs' || child.get('type') === 'record-section') {
                        const innerContainers = childEl.querySelectorAll('.pf-tabs, .pf-section, .pf-section-body, .pf-tabs-header, .pf-tabs-body');
                        innerContainers.forEach(inner => {
                          inner.style.pointerEvents = 'auto'; // Allow events to bubble for dragging
                        });
                      } else {
                        // Make inner content not block drag for fields/partials
                        childEl.querySelectorAll('*').forEach(inner => {
                          const innerComp = this.editor.Components.getComponent(inner);
                          if (!innerComp || (!innerComp.getAttributes()?.['field-api-name'] && 
                              !innerComp.getAttributes()?.['partial-name'] &&
                              innerComp.get('type') !== 'record-field' && 
                              innerComp.get('type') !== 'record-partial' &&
                              innerComp.get('type') !== 'record-tabs' &&
                              innerComp.get('type') !== 'record-section')) {
                            inner.style.pointerEvents = 'none';
                          }
                        });
                      }
                    }
                  }
                });
              });
              
              // Also ensure tab sections have accept set and components have correct types
              allTabSections.forEach(section => {
                // Ensure accept is set
                section.set({
                  droppable: true,
                  accept: ['record-field', 'record-partial', 'record-section', 'record-tabs']
                });
                
                section.components().forEach(child => {
                  // CRITICAL: Ensure component type is set correctly for accept matching
                  const attrs = child.getAttributes ? child.getAttributes() : {};
                  if (child.get('type') === 'record-tabs' || attrs['data-comp-kind'] === 'record-tabs') {
                    child.set('type', 'record-tabs');
                  }
                  if (child.get('type') === 'record-section' || attrs['data-comp-kind'] === 'record-section') {
                    child.set('type', 'record-section');
                  }
                  
                  // For tabs/sections, ensure inner containers allow dragging from anywhere
                  if (child.get('type') === 'record-tabs' || child.get('type') === 'record-section') {
                    const childEl = child.getEl();
                    if (childEl) {
                      childEl.style.pointerEvents = 'auto';
                      const innerContainers = childEl.querySelectorAll('.pf-tabs, .pf-section, .pf-section-body, .pf-tabs-header, .pf-tabs-body');
                      innerContainers.forEach(inner => {
                        inner.style.pointerEvents = 'auto'; // Allow events to bubble for dragging
                      });
                    }
                  }
                });
              });
            }, 2000);
            
            // Process sections similar to tabs
            sections.forEach(section => {
              const sectionEl = section.getEl();
              if (sectionEl) {
                // Extract columns-json from HTML and set as attribute immediately
                let columnsJsonFromHtml = sectionEl.getAttribute('columns-json');
                if (columnsJsonFromHtml) {
                  // Decode HTML entities before parsing
                  const textarea = document.createElement('textarea');
                  textarea.innerHTML = columnsJsonFromHtml;
                  columnsJsonFromHtml = textarea.value;
                  
                  const currentColumnsJson = section.getAttributes()['columns-json'];
                  if (columnsJsonFromHtml !== currentColumnsJson) {
                    section.addAttributes({ 'columns-json': columnsJsonFromHtml });
                  }
                }
              }
              
              // CRITICAL: Ensure the component has the correct type set
              const currentType = section.get('type');
              if (currentType !== 'record-section') {
                section.set('type', 'record-section');
              }
            });
            
            // Rebuild sections AFTER fields/partials are processed
            sections.forEach(section => {
              
              // Call buildWorkingSection to rebuild the structure
              if (window.SectionComponent && window.SectionComponent.buildWorkingSection) {
                window.SectionComponent.buildWorkingSection(section);
                
                // After buildWorkingSection, ensure type is still set
                if (section.get('type') !== 'record-section') {
                  section.set('type', 'record-section');
                }
              } else {
                console.warn('[PF] buildWorkingSection function not found');
              }
            });
        } catch (error) {
            console.warn('[PF] Error locking initial components:', error);
          }
        }, 200); // Increased timeout to ensure DOM is ready
      }
      
      if (initialCss) {
        this.editor.setStyle(initialCss);
      }
      
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
            if (this.isSection(children[i])) {
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
            if (this.isSection(child)) {
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
                      section.components('');
                      
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
                      if (section.components().length > 0) {
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
                        column.components('');
                        // Append the stored HTML - GrapesJS will parse it
                        column.components(childrenByColumnId[columnId]);
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

  destroy() {
    if (this.editor) {
      try {
        this.editor.destroy();
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
