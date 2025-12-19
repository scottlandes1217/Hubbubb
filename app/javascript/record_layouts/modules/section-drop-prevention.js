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
    
    // ROOT CAUSE FIX: Patch ensureInList and getList to skip execution during drags
    // This prevents the infinite recursion that happens when ensureInList calls itself on children
    // getList is called by ensureInList, so we need to patch both
    // Use a WeakSet to track components being processed to prevent recursion even if flag isn't set
    // Use a depth counter to track recursion depth
    if (!window.__pf_processingComponents) {
      window.__pf_processingComponents = new WeakSet();
    }
    if (!window.__pf_ensureInListDepth) {
      window.__pf_ensureInListDepth = 0;
    }
    const MAX_RECURSION_DEPTH = 3; // Maximum depth before we break recursion
    // ROOT CAUSE: ensureInList recursively calls itself on children via forEach
    // The recursion happens very fast, so we need a low threshold to catch it early
    
    // Safety mechanism: Reset depth if it gets stuck (intermittent errors suggest state accumulation)
    setInterval(() => {
      // If depth is stuck > 0 and we're not dragging, reset it
      if (window.__pf_ensureInListDepth > 0 && !window.__pf_isMovingComponent) {
        console.warn('[PF] Resetting stuck ensureInList depth:', window.__pf_ensureInListDepth);
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
        // ROOT CAUSE: ensureInList recursively calls itself on children, causing infinite recursion during drags
        // SOLUTION: Completely disable ensureInList during drags, and prevent recursion with depth check
        if (!Components.Component.prototype.__pf_ensureInListPatched) {
            const originalEnsureInList = Components.Component.prototype.ensureInList;
            Components.Component.prototype.ensureInList = function(...args) {
              // Initialize state if needed
              if (window.__pf_ensureInListDepth === undefined) {
                window.__pf_ensureInListDepth = 0;
              }
              
              // PRIMARY GUARD: If dragging, completely skip ensureInList
              // This is the most important check - if we're dragging, don't run at all
              if (window.__pf_isMovingComponent === true) {
                return this; // Skip entirely during drags
              }
              
              // SECONDARY GUARD: If depth > 0, we're in a recursive call
              // Return immediately to break the recursion chain
              if (window.__pf_ensureInListDepth > 0) {
                return this; // Already recursing - break the chain
              }
              
              // TERTIARY GUARD: Check if this component is already being processed
              if (window.__pf_processingComponents && window.__pf_processingComponents.has(this)) {
                return this; // Already processing this component
              }
              
              // Set depth to 1 BEFORE calling original
              // When original calls ensureInList on children, those calls will:
              // 1. Hit our patched version (because we patched the prototype)
              // 2. See depth=1 and return immediately (via check above)
              // 3. This prevents the recursion
              window.__pf_ensureInListDepth = 1;
              
              // Mark as processing
              if (window.__pf_processingComponents) {
                window.__pf_processingComponents.add(this);
              }
              
              try {
                // Wrap in try-catch to catch recursion errors
                // Use a timeout to break out of synchronous recursion if needed
                const result = originalEnsureInList.apply(this, args);
                return result;
              } catch(err) {
                // Catch recursion errors and break the loop
                if (err && err.message && (err.message.includes('Maximum call stack') || err.message.includes('stack'))) {
                  console.error('[PF] Recursion error in ensureInList - breaking loop');
                  // Reset everything to break the recursion
                  window.__pf_ensureInListDepth = 0;
                  if (window.__pf_processingComponents) {
                    window.__pf_processingComponents = new WeakSet();
                  }
                  return this; // Return self to break recursion
                }
                throw err; // Re-throw other errors
              } finally {
                // CRITICAL: ALWAYS reset depth in finally
                // This must happen even if there's an error
                window.__pf_ensureInListDepth = 0;
                if (window.__pf_processingComponents) {
                  try {
                    window.__pf_processingComponents.delete(this);
                  } catch(_) {
                    // Ignore cleanup errors
                  }
                }
              }
            };
            Components.Component.prototype.__pf_ensureInListPatched = true;
            console.log('[PF] ensureInList patched successfully');
            
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
              // ROOT CAUSE: Skip getList during drags to prevent recursion
              // getList is called by ensureInList, and can trigger more ensureInList calls
              if (window.__pf_isMovingComponent) {
                // Return existing models without triggering ensureInList
                try {
                  if (this.components && typeof this.components === 'function') {
                    const comps = this.components();
                    if (comps && comps.models) {
                      return comps.models;
                    }
                  }
                  return [];
                } catch(_) {
                  return [];
                }
              }
              return originalGetList.apply(this, args);
            };
            Components.Component.prototype.__pf_getListPatched = true;
            console.log('[PF] getList patched successfully');
          } else {
            console.log('[PF] getList already patched');
          }
          
          // ROOT CAUSE FIX: Patch components() method to prevent comp.components('') during drags
          // comp.components('') triggers ensureInList, which causes recursion
          if (!Components.Component.prototype.__pf_componentsPatched) {
            const originalComponents = Components.Component.prototype.components;
            Components.Component.prototype.components = function(...args) {
              // If called with empty string during drags, skip it
              // This prevents ensureInList from being triggered
              if (args.length > 0 && (args[0] === '' || args[0] === null || args[0] === undefined)) {
                if (window.__pf_isMovingComponent) {
                  // During drags, don't clear components - it triggers ensureInList recursion
                  return this; // Return self instead of clearing
                }
              }
              // For all other cases, call original
              return originalComponents.apply(this, args);
            };
            Components.Component.prototype.__pf_componentsPatched = true;
            console.log('[PF] components() method patched successfully');
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
      window.__pf_ensureInListDepth = 0;
      window.__pf_inEnsureInListChain = false;
      if (window.__pf_processingComponents) {
        window.__pf_processingComponents = new WeakSet();
      }
      
      // Reset again after a very short delay (catch any queued calls)
      setTimeout(() => {
        window.__pf_isMovingComponent = false;
        window.__pf_ensureInListDepth = 0;
        window.__pf_inEnsureInListChain = false;
        if (window.__pf_processingComponents) {
          window.__pf_processingComponents = new WeakSet();
        }
      }, 10);
      
      // Reset again after a longer delay (catch setTimeout-delayed calls)
      setTimeout(() => {
        window.__pf_isMovingComponent = false;
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
    
    // Skip component:update during drags to prevent rebuilds
    this.editor.on('component:update', (component) => {
      if (window.__pf_isMovingComponent) {
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
