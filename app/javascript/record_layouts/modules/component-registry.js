// Component Registry Module
// Manages registration and setup of custom component types

export class ComponentRegistry {
  constructor(builder) {
    this.builder = builder;
    this.editor = builder.editor;
  }

  setup() {
    this.setupComponentTypes();
    this.setupTabsComponent();
    this.setupSectionComponent();
  }

  setupComponentTypes() {
    // Record Field Component
    // ROOT CAUSE FIX: Fields should NEVER accept drops (can't nest fields inside fields)
    // This prevents invalid structures that trigger ensureInList recursion
    this.editor.DomComponents.addType('record-field', {
      model: {
        defaults: {
          tagName: 'div',
          attributes: { class: 'record-field-placeholder pf-interactive rounded p-2 mb-2 bg-white' },
          draggable: true,
          droppable: false, // Never accept drops
          accept: [], // Explicitly reject all component types
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
    // ROOT CAUSE FIX: Partials should NEVER accept drops (can't nest components inside partials)
    // This prevents invalid structures that trigger ensureInList recursion
    this.editor.DomComponents.addType('record-partial', {
      model: {
        defaults: {
          tagName: 'div',
          attributes: { class: 'record-partial-placeholder pf-interactive rounded p-2 mb-2 bg-light' },
          draggable: true,
          droppable: false, // Never accept drops
          accept: [], // Explicitly reject all component types
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
}
