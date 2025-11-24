// Save Handler Module
// Handles saving layouts to the database

import { Utils } from './utils.js';

export class SaveHandler {
  constructor(builder) {
    this.builder = builder;
    this.editor = builder.editor;
  }

  setup() {
    this.addSaveCommand();
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
        
        const sanitizedHtml = Utils.sanitizeLayoutHtml(html);
        this.saveLayoutToDatabase(sanitizedHtml, css, js);
      }
    });
  }

  saveLayoutToDatabase(html, css, js = '') {
    try {
      const metadataScript = document.getElementById('record-layout-metadata');
      if (!metadataScript) {
        Utils.showSaveMessage('Save failed: Missing metadata', 'error');
        return;
      }
      
      const meta = JSON.parse(metadataScript.textContent);
      const orgId = meta.organization_id;
      const tableType = meta.table_type;
      const tableId = meta.table_id;
      
      if (!orgId || !tableType) {
        Utils.showSaveMessage('Save failed: Missing organization or table type', 'error');
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
          Utils.showSaveMessage('Layout saved successfully!', 'success');
        } else {
          Utils.showSaveMessage('Save failed: ' + (data.errors || 'Unknown error'), 'error');
        }
      })
      .catch(error => {
        console.error('[PF] Save error:', error);
        Utils.showSaveMessage('Save failed: ' + error.message, 'error');
      });
    } catch (error) {
      console.error('[PF] Save error:', error);
      Utils.showSaveMessage('Save failed: ' + error.message, 'error');
    }
  }
}
