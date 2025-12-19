// Content Loader Module
// Handles loading initial content from saved layouts

export class ContentLoader {
  constructor(builder) {
    this.builder = builder;
    this.editor = builder.editor;
  }

  setup() {
    this.loadInitialContent();
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
                    this.builder.addDeleteButton(field);
                  }
                } else {
                  // Element not ready, add button with delay
                  setTimeout(() => this.builder.addDeleteButton(field), 50);
                }
                
                // Ensure field is not droppable (can't drop components into it)
                field.set({ droppable: false });
                
                // Check if field is inside a section/tab - if so, keep it draggable
                const isInsideSection = this.builder.isInsideSectionOrTab(field);
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
                this.builder.lockInnerComponents(field);
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
                        // Just set the new content directly - GrapesJS will handle clearing
                        // Don't try to clear first as it can cause errors if component structure is incomplete
                        // ROOT CAUSE FIX: Skip if dragging - comp.components() triggers ensureInList recursion
                        if (window.__pf_isMovingComponent) {
                          return; // Don't modify components during drags
                        }
                        try {
                          partial.components(html);
                        } catch(setErr) {
                          // If setting fails, try clearing first then setting
                          // ROOT CAUSE FIX: Double-check flag - comp.components() triggers ensureInList recursion
                          if (window.__pf_isMovingComponent) {
                            return; // Don't modify components during drags
                          }
                          try {
                            // Only try to clear if setting failed
                            if (partial.components && typeof partial.components === 'function') {
                              const comps = partial.components();
                              if (comps && comps.models && comps.models.length > 0) {
                                // Remove children one by one
                                const models = [...comps.models]; // Copy array to avoid modification during iteration
                                models.forEach(child => {
                                  try {
                                    child.remove();
                                  } catch(_) {}
                                });
                              }
                            }
                            // Try setting again after clearing
                            partial.components(html);
                          } catch(clearErr) {
                            console.warn('[PF] Error setting components after clearing:', clearErr);
                          }
                        }
                        
                        // Add delete button and lock components - same as drag behavior
                        setTimeout(() => {
                          this.builder.addDeleteButton(partial);
                          this.builder.lockInnerComponents(partial);
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
                    this.builder.addDeleteButton(partial);
                  }
                } else {
                  setTimeout(() => this.builder.addDeleteButton(partial), 50);
                }
                
                // Ensure partial is not droppable (can't drop components into it)
                partial.set({ droppable: false });
                
                // Check if partial is inside a section/tab - if so, keep it draggable
                const isInsideSection = this.builder.isInsideSectionOrTab(partial);
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
                this.builder.lockInnerComponents(partial);
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
                            this.builder.lockInnerComponents(child);
                            this.builder.addDeleteButton(child);
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
                          this.builder.lockInnerComponents(child);
                          this.builder.addDeleteButton(child);
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
                this.builder.lockTabsInnerComponents(tab);
                
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
                          // Native builder handles deletion through its own system
                          if (tab && typeof tab.remove === 'function') {
                            tab.remove();
                          } else {
                            console.warn('[PF] Could not remove tabs component - no remove method available', { tab });
                          }
                        } catch (err) {
                          console.error('[PF] Error removing tabs component:', err);
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
                          // Native builder handles deletion through its own system
                          if (tab && typeof tab.remove === 'function') {
                            tab.remove();
                          } else {
                            console.warn('[PF] Could not remove tabs component - no remove method available', { tab });
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
                        // Native builder handles deletion through its own system
                        if (tab && typeof tab.remove === 'function') {
                          tab.remove();
                        } else {
                          console.warn('[PF] Could not remove tabs component - no remove method available', { tab });
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
}

