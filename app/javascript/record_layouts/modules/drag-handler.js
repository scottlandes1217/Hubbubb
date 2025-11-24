// Drag Handler Module
// Handles all drag and drop operations, including recursion prevention

export class DragHandler {
  constructor(builder) {
    this.builder = builder;
    this.editor = builder.editor;
    this.isMovingComponent = false;
    this.draggedComponentForFlags = null;
  }

  setup() {
    this.setupDragStart();
    this.setupDragEnd();
    this.patchGrapesJSMethods();
  }

  setupDragStart() {
    this.editor.on('component:drag:start', (component) => {
      this.isMovingComponent = true;
      window.__pf_isMovingComponent = true;
      this.draggedComponentForFlags = component;
      
      this.setFlagsOnSections(component);
    });
  }

  setupDragEnd() {
    this.editor.on('component:drag:end', () => {
      setTimeout(() => {
        this.restoreGrapesJSMethods();
        setTimeout(() => {
          this.clearFlags();
        }, 300);
      }, 200);
    });
  }

  setFlagsOnSections(component) {
    if (component && typeof component.get === 'function') {
      try {
        const compAttrs = component.getAttributes ? component.getAttributes() : {};
        const compType = component.get('type');
        const isSection = compType === 'record-section' || compAttrs['data-comp-kind'] === 'record-section';
        
        if (isSection && component.addAttributes) {
          component.addAttributes({ '_moving-component': 'true' });
        }
        
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
        // Ignore errors
      }
    }
  }

  clearFlags() {
    this.isMovingComponent = false;
    window.__pf_isMovingComponent = false;
    
    if (this.draggedComponentForFlags && typeof this.draggedComponentForFlags.removeAttributes === 'function') {
      try {
        this.draggedComponentForFlags.removeAttributes('_moving-component');
        
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
  }

  patchGrapesJSMethods() {
    // Patch toJSON and ensureInList to prevent recursion
    // Implementation from builder.js
  }

  restoreGrapesJSMethods() {
    // Restore original methods
    // Implementation from builder.js
  }
}

