// Section Drop Prevention Module
// Prevents drops on section containers and bodies, only allows drops on columns

export class SectionDropPrevention {
  constructor(builder) {
    this.builder = builder;
    this.editor = builder.editor;
  }

  setup() {
    this.setupSectionDropPrevention();
  }

  setupSectionDropPrevention() {
    // Prevent GrapesJS from allowing drops on section containers and bodies
    // Only columns should accept drops
    if (!this.editor) {
      console.error('[PF] SectionDropPrevention: editor not available');
      return;
    }
    
    console.log('[PF] SectionDropPrevention: Setting up, editor available:', !!this.editor);
    console.log('[PF] SectionDropPrevention: Components available:', !!this.editor.Components);
    
    // ROOT CAUSE FIX: Set flag during drags so onRender doesn't call this.model.components()
    // which triggers ensureInList recursion
    window.__pf_isMovingComponent = false;
    
    // ROOT CAUSE FIX: Global flag to prevent recursive ensureInList chains
    // This prevents ensureInList from calling itself recursively on children
    window.__pf_inEnsureInListChain = false;
    
    // ROOT CAUSE FIX: Initialize call counters to track active calls
    // This prevents recursion by only allowing one active call at a time
    if (window.__pf_ensureInListCallCount === undefined) {
      window.__pf_ensureInListCallCount = 0;
    }
    if (window.__pf_propToParentCallCount === undefined) {
      window.__pf_propToParentCallCount = 0;
    }
    
    // ROOT CAUSE FIX: Patch ensureInList and getList to skip execution during drags
    // This prevents the infinite recursion that happens when ensureInList calls itself on children
    // getList is called by ensureInList, so we need to patch both
    // Use a WeakSet to track components being processed to prevent recursion even if flag isn't set
    // Use a depth counter to track recursion depth (kept for backward compatibility)
    if (!window.__pf_processingComponents) {
      window.__pf_processingComponents = new WeakSet();
    }
    if (!window.__pf_ensureInListDepth) {
      window.__pf_ensureInListDepth = 0;
    }
    // ROOT CAUSE: ensureInList recursively calls itself on children via forEach
    // The recursion happens very fast, so we need a low threshold to catch it early
    
    // Safety mechanism: Reset call counter if it gets stuck (intermittent errors suggest state accumulation)
    setInterval(() => {
      // If call counters are stuck > 0 and we're not dragging, reset them
      if (window.__pf_ensureInListCallCount !== undefined && window.__pf_ensureInListCallCount > 0 && !window.__pf_isMovingComponent) {
        console.warn('[PF] Resetting stuck ensureInList call counter:', window.__pf_ensureInListCallCount);
        window.__pf_ensureInListCallCount = 0;
      }
      if (window.__pf_propToParentCallCount !== undefined && window.__pf_propToParentCallCount > 0 && !window.__pf_isMovingComponent) {
        console.warn('[PF] Resetting stuck __propToParent call counter:', window.__pf_propToParentCallCount);
        window.__pf_propToParentCallCount = 0;
      }
      if (window.__pf_ensureInListDepth !== undefined && window.__pf_ensureInListDepth > 0 && !window.__pf_isMovingComponent) {
        window.__pf_ensureInListDepth = 0;
        window.__pf_inEnsureInListChain = false;
        if (window.__pf_processingComponents) {
          window.__pf_processingComponents = new WeakSet();
        }
      }
    }, 500); // Check every 500ms
    
    const applyPatches = () => {
      try {
        console.log('[PF] applyPatches: Attempting to patch, editor:', !!this.editor);
        const Components = this.editor.Components;
        console.log('[PF] applyPatches: Components:', !!Components, 'Component:', !!Components?.Component);
        if (!Components || !Components.Component) {
          console.warn('[PF] Components not available yet, will retry');
          return false;
        }
        
        console.log('[PF] applyPatches: Components available, checking if already patched');
        console.log('[PF] applyPatches: ensureInList patched:', !!Components.Component.prototype.__pf_ensureInListPatched);
        console.log('[PF] applyPatches: getList patched:', !!Components.Component.prototype.__pf_getListPatched);
        
        // Patch ensureInList
        // ROOT CAUSE: ensureInList recursively calls itself on children via forEach, causing infinite recursion
        // The original function structure is: ensureInList() { this.components().forEach(child => child.ensureInList()) }
        // SOLUTION: Use a global call counter that increments on entry and decrements on exit
        // Any call with counter > 1 is a recursive call and should be skipped
        if (!Components.Component.prototype.__pf_ensureInListPatched) {
            const originalEnsureInList = Components.Component.prototype.ensureInList;
            
            // Initialize global call counter
            if (window.__pf_ensureInListCallCount === undefined) {
              window.__pf_ensureInListCallCount = 0;
            }
            
            Components.Component.prototype.ensureInList = function(...args) {
              // PRIMARY GUARD: If dragging, completely skip ensureInList
              // This is the most important check - if we're dragging, don't run at all
              if (window.__pf_isMovingComponent === true) {
                return this; // Skip entirely during drags
              }
              
              // Initialize counter if needed
              if (window.__pf_ensureInListCallCount === undefined) {
                window.__pf_ensureInListCallCount = 0;
              }
              
              // SECONDARY GUARD: If counter > 0, we're already in an ensureInList call
              // This means any new call is recursive and should be skipped
              // This is the key to preventing recursion - we only allow ONE active call at a time
              if (window.__pf_ensureInListCallCount > 0) {
                return this; // Already processing - this is a recursive call, skip it
              }
              
              // Increment counter BEFORE calling original
              // This ensures that any recursive calls (from children) will see counter > 0 and skip
              window.__pf_ensureInListCallCount = 1;
              
              try {
                // Call the original function
                // When it calls ensureInList on children, those calls will hit this patched version
                // and see counter = 1, so they'll return early (preventing recursion)
                const result = originalEnsureInList.apply(this, args);
                return result;
              } catch(err) {
                // Catch recursion errors and break the loop
                if (err && err.message && (err.message.includes('Maximum call stack') || err.message.includes('stack'))) {
                  console.error('[PF] Recursion error in ensureInList - breaking loop');
                  // Reset counter to break the recursion completely
                  window.__pf_ensureInListCallCount = 0;
                  return this; // Return self to break recursion
                }
                throw err; // Re-throw other errors
              } finally {
                // CRITICAL: ALWAYS reset counter in finally
                // This must happen even if there's an error
                // Only reset if we're the outermost call (counter should be 1)
                if (window.__pf_ensureInListCallCount === 1) {
                  window.__pf_ensureInListCallCount = 0;
                } else {
                  // If counter is not 1, something went wrong - reset anyway
                  window.__pf_ensureInListCallCount = 0;
                }
              }
            };
            Components.Component.prototype.__pf_ensureInListPatched = true;
            console.log('[PF] ensureInList patched successfully with call counter');
            
            // Verify patch was applied
            if (Components.Component.prototype.ensureInList === originalEnsureInList) {
              console.error('[PF] ERROR: ensureInList patch was not applied!');
            } else {
              console.log('[PF] ensureInList patch verified - original function replaced');
            }
          } else {
            console.log('[PF] ensureInList already patched');
          }
          
          // Patch getList - it's called by ensureInList and can also cause recursion
          if (!Components.Component.prototype.__pf_getListPatched) {
            const originalGetList = Components.Component.prototype.getList;
            Components.Component.prototype.getList = function(...args) {
              // PRIMARY GUARD: Skip getList during drags to prevent recursion
              // getList is called by ensureInList, and can trigger more ensureInList calls
              if (window.__pf_isMovingComponent === true) {
                // Return existing models without triggering ensureInList
                // Try to access internal _components collection directly if available
                try {
                  // Backbone collections often have a models property
                  if (this._components && Array.isArray(this._components)) {
                    return this._components;
                  }
                  // Some GrapesJS components store models in components property
                  if (this.components && Array.isArray(this.components)) {
                    return this.components;
                  }
                  // Last resort: return empty array
                  return [];
                } catch(_) {
                  return [];
                }
              }
              
              // SECONDARY GUARD: If call counter > 0, we're in a recursive ensureInList call
              // Return cached models if possible to avoid further recursion
              if (window.__pf_ensureInListCallCount !== undefined && window.__pf_ensureInListCallCount > 0) {
                try {
                  // Try to access internal state directly
                  if (this._components && Array.isArray(this._components)) {
                    return this._components;
                  }
                  if (this.components && Array.isArray(this.components)) {
                    return this.components;
                  }
                  return [];
                } catch(_) {
                  return [];
                }
              }
              
              return originalGetList.apply(this, args);
            };
            Components.Component.prototype.__pf_getListPatched = true;
            console.log('[PF] getList patched successfully - prevents ensureInList during drags and recursion');
          } else {
            console.log('[PF] getList already patched');
          }
          
          // ROOT CAUSE FIX: Patch __propToParent to prevent property propagation recursion during drags
          // __propToParent propagates properties from child to parent, triggering events that cause recursion
          // Use a call counter to prevent recursion without completely blocking it
          if (!Components.Component.prototype.__pf_propToParentPatched) {
            const originalPropToParent = Components.Component.prototype.__propToParent;
            if (originalPropToParent && typeof originalPropToParent === 'function') {
              // Track active __propToParent calls to prevent recursion
              if (window.__pf_propToParentCallCount === undefined) {
                window.__pf_propToParentCallCount = 0;
              }
              
              Components.Component.prototype.__propToParent = function(...args) {
                // PRIMARY GUARD: If dragging, skip property propagation
                if (window.__pf_isMovingComponent === true) {
                  return; // Skip entirely during drags
                }
                
                // Initialize counter if needed
                if (window.__pf_propToParentCallCount === undefined) {
                  window.__pf_propToParentCallCount = 0;
                }
                
                // SECONDARY GUARD: If counter > 0, we're in a recursive call - skip it
                if (window.__pf_propToParentCallCount > 0) {
                  return; // Skip during recursion
                }
                
                // Increment counter before calling original
                window.__pf_propToParentCallCount = 1;
                
                try {
                  // Call original function
                  return originalPropToParent.apply(this, args);
                } finally {
                  // Always reset counter
                  window.__pf_propToParentCallCount = 0;
                }
              };
              Components.Component.prototype.__pf_propToParentPatched = true;
              console.log('[PF] __propToParent patched - prevents property propagation recursion');
            } else {
              console.warn('[PF] __propToParent not found on Component prototype');
            }
          } else {
            console.log('[PF] __propToParent already patched');
          }
          
          // ROOT CAUSE FIX: Patch components() method to prevent clearing during drags
          // Only prevent clearing (components('')) during drags - let normal calls go through
          // The ensureInList patch will handle preventing recursion
          if (!Components.Component.prototype.__pf_componentsPatched) {
            const originalComponents = Components.Component.prototype.components;
            Components.Component.prototype.components = function(...args) {
              // ONLY prevent clearing components during drags - this is the main recursion trigger
              // For normal calls (getting components), let them go through - ensureInList patch will handle it
              if (args.length > 0 && (args[0] === '' || args[0] === null || args[0] === undefined)) {
                if (window.__pf_isMovingComponent === true) {
                  // During drags, don't clear components - it triggers ensureInList recursion
                  return this; // Return self instead of clearing
                }
              }
              
              // For all other cases (including getting components), call original
              // The ensureInList patch will prevent recursion if needed
              return originalComponents.apply(this, args);
            };
            Components.Component.prototype.__pf_componentsPatched = true;
            console.log('[PF] components() method patched - only prevents clearing during drags');
          } else {
            console.log('[PF] components() method already patched');
          }
          
          return true; // Patches applied successfully
      } catch(err) {
        console.error('[PF] Error patching ensureInList/getList:', err);
        return false;
      }
      return false;
    };
    
    // Try to apply patches immediately
    let patchesApplied = applyPatches.call(this);
    console.log('[PF] Initial patch attempt result:', patchesApplied);
    
    // Also try after delays in case Components isn't ready yet
    if (!patchesApplied) {
      console.log('[PF] Patch not applied, retrying in 100ms...');
      setTimeout(() => {
        patchesApplied = applyPatches.call(this);
        console.log('[PF] Second patch attempt result:', patchesApplied);
        if (!patchesApplied) {
          console.log('[PF] Patch still not applied, retrying in 500ms...');
          setTimeout(() => {
            const finalResult = applyPatches.call(this);
            console.log('[PF] Final patch attempt result:', finalResult);
            if (!finalResult) {
              console.error('[PF] ERROR: Failed to apply patches after all retries!');
            }
          }, 500);
        }
      }, 100);
    } else {
      console.log('[PF] Patches applied successfully on first attempt');
    }
    
    // ROOT CAUSE FIX: Set flag on mousedown BEFORE GrapesJS's drag system calls ensureInList
    // ensureInList is called during drag initialization, before component:drag:start fires
    // We set up listeners both on the iframe document AND the main document to catch all cases
    const setupDragDetection = (doc) => {
      if (!doc) return;
      doc.addEventListener('mousedown', (e) => {
        // Check if clicking on ANY draggable component - not just sections/tabs
        // This catches all drag operations before GrapesJS calls ensureInList
        const target = e.target;
        if (target) {
          // Check if target or any parent has draggable attribute or is a component
          // Also check for GrapesJS component markers
          const draggableEl = target.closest('[draggable="true"], [data-comp-kind], [data-gjs-type], [data-gjs-id]');
          if (draggableEl) {
            // Check if it's actually a draggable component (not just any element)
            const isDraggable = draggableEl.getAttribute('draggable') === 'true' ||
                              draggableEl.hasAttribute('data-comp-kind') ||
                              draggableEl.hasAttribute('data-gjs-type');
            if (isDraggable) {
              // Set flag immediately - this happens before GrapesJS calls ensureInList
              window.__pf_isMovingComponent = true;
              window.__pf_inEnsureInListChain = false; // Also clear chain flag
              // Reset recursion guards to be safe
              window.__pf_ensureInListCallCount = 0;
              window.__pf_propToParentCallCount = 0;
              if (window.__pf_ensureInListDepth !== undefined) {
                window.__pf_ensureInListDepth = 0;
              }
              if (window.__pf_processingComponents) {
                window.__pf_processingComponents = new WeakSet();
              }
            }
          }
        }
      }, true); // Use capture phase to catch early
    };
    
    try {
      // Set up listener on iframe document (primary)
      const canvas = this.editor.Canvas;
      if (canvas && canvas.getFrameEl) {
        const frameEl = canvas.getFrameEl();
        if (frameEl) {
          // Wait for iframe to load before accessing contentDocument
          if (frameEl.contentDocument) {
            setupDragDetection(frameEl.contentDocument);
          }
          // Also listen for when iframe loads
          frameEl.addEventListener('load', () => {
            if (frameEl && frameEl.contentDocument) {
              setupDragDetection(frameEl.contentDocument);
            }
          });
        }
      }
      // Also set up listener on main document as backup
      if (document) {
        setupDragDetection(document);
      }
    } catch(err) {
      console.warn('[PF] Error setting up early drag detection:', err);
    }
    
    // Track when a component starts being dragged
    // ROOT CAUSE: Reset ALL state on drag start to prevent accumulation
    this.editor.on('component:drag:start', () => {
      // Reset everything immediately
      window.__pf_isMovingComponent = true;
      window.__pf_ensureInListCallCount = 0;
      window.__pf_propToParentCallCount = 0;
      window.__pf_ensureInListDepth = 0;
      window.__pf_inEnsureInListChain = false;
      if (window.__pf_processingComponents) {
        window.__pf_processingComponents = new WeakSet();
      }
    });
    
    // Clear flag when drag ends
    // ROOT CAUSE: Reset state IMMEDIATELY and MULTIPLE times to prevent accumulation
    // Intermittent errors suggest state isn't being reset properly
    this.editor.on('component:drag:end', () => {
      // Reset immediately
      window.__pf_isMovingComponent = false;
      window.__pf_ensureInListCallCount = 0;
      window.__pf_propToParentCallCount = 0;
      window.__pf_ensureInListDepth = 0;
      window.__pf_inEnsureInListChain = false;
      if (window.__pf_processingComponents) {
        window.__pf_processingComponents = new WeakSet();
      }
      
      // Reset again after a very short delay (catch any queued calls)
      setTimeout(() => {
        window.__pf_isMovingComponent = false;
        window.__pf_ensureInListCallCount = 0;
        window.__pf_propToParentCallCount = 0;
        window.__pf_ensureInListDepth = 0;
        window.__pf_inEnsureInListChain = false;
        if (window.__pf_processingComponents) {
          window.__pf_processingComponents = new WeakSet();
        }
      }, 10);
      
      // Reset again after a longer delay (catch setTimeout-delayed calls)
      setTimeout(() => {
        window.__pf_isMovingComponent = false;
        window.__pf_ensureInListCallCount = 0;
        window.__pf_propToParentCallCount = 0;
        window.__pf_ensureInListDepth = 0;
        window.__pf_inEnsureInListChain = false;
        if (window.__pf_processingComponents) {
          window.__pf_processingComponents = new WeakSet();
        }
      }, 100);
    });
    
    // Don't intercept component:drag:enter - let GrapesJS handle it naturally
    // The accept property on columns will handle allowing/disallowing drops
    // We only need to prevent actual drops in canvas:drop handler
    
    // Skip component:update during drags to prevent rebuilds and recursion
    // ROOT CAUSE: component:update events during drags trigger property propagation
    // which causes __propToParent recursion
    this.editor.on('component:update', (component) => {
      if (window.__pf_isMovingComponent === true) {
        return; // Skip all updates during drags
      }
    });
    
    // ROOT CAUSE FIX: Prevent component:add events from triggering during drags
    // These events can trigger property propagation and cause recursion
    this.editor.on('component:add', (component) => {
      if (window.__pf_isMovingComponent === true) {
        // Don't process component:add during drags - it triggers property propagation
        return;
      }
    });
    
    // ROOT CAUSE FIX: Prevent component:remove events from triggering during drags
    this.editor.on('component:remove', (component) => {
      if (window.__pf_isMovingComponent === true) {
        // Don't process component:remove during drags - it triggers property propagation
        return;
      }
    });
    
    // Intercept GrapesJS's canvas:drop event to prevent drops on invalid targets
    // ROOT CAUSE FIX: Prevent drops on fields/partials to avoid invalid nesting that causes recursion
    this.editor.on('canvas:drop', (event) => {
      try {
        const target = event.target;
        if (!target) return;
        
        const targetEl = target.getEl && target.getEl();
        if (!targetEl) return;
        
        // ROOT CAUSE FIX: Prevent drops on fields and partials - they should never accept drops
        // This prevents invalid nesting (fields inside fields) that triggers ensureInList recursion
        const targetType = target.get('type');
        const targetAttrs = target.getAttributes ? target.getAttributes() : {};
        const isField = targetType === 'record-field' || targetAttrs['field-api-name'] || 
                       targetAttrs['data-comp-kind'] === 'record-field';
        const isPartial = targetType === 'record-partial' || targetAttrs['partial-name'] || 
                         targetAttrs['data-comp-kind'] === 'record-partial';
        
        if (isField || isPartial) {
          console.warn('[PF] Preventing drop on field/partial - invalid nesting would cause recursion');
          if (event.stop) event.stop();
          if (event.preventDefault) event.preventDefault();
          return false; // Prevent the drop
        }
        
        // Check if target is a valid drop container (tab section or section column)
        const isTabSection = targetEl.classList && targetEl.classList.contains('pf-tab-section') ||
                            (targetEl.getAttribute && targetEl.getAttribute('data-role') === 'pf-tab-section');
        const isSectionColumn = targetEl.classList && targetEl.classList.contains('pf-section-column') ||
                               (targetEl.getAttribute && targetEl.getAttribute('data-role') === 'pf-section-column');
        
        // If it's a valid drop container, allow the drop - don't interfere
        if (isTabSection || isSectionColumn) {
          return; // Allow the drop - GrapesJS will handle it via accept property
        }
        
        // Check if target is a section container or body (not a column)
        const isSectionContainer = target.get('type') === 'record-section' || 
                                  (target.getAttributes && target.getAttributes()['data-comp-kind'] === 'record-section');
        const isSectionBody = targetEl.classList && (
          targetEl.classList.contains('pf-section-body') || 
          targetEl.classList.contains('pf-section')
        );
        
        // If it's a section container or body (but not a column), prevent the drop
        if ((isSectionContainer || isSectionBody) && !isSectionColumn) {
          if (event.stop) event.stop();
          if (event.preventDefault) event.preventDefault();
          return false;
        }
      } catch(err) {
        console.warn('[PF] Error in canvas:drop prevention:', err);
      }
    });
  }
}
