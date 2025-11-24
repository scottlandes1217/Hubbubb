// Editor Setup Module
// Handles GrapesJS editor initialization and basic configuration

import { Utils } from './utils.js';

export class EditorSetup {
  constructor(builder) {
    this.builder = builder;
    this.editor = builder.editor;
  }

  setup() {
    this.injectCanvasCSS();
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
        draggableComponents: true,
        canvas: {
          styles: [
            'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
            'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
            Utils.getAssetPath('application_css'),
            Utils.getAssetPath('record_builder_css')
          ]
        }
      });

      return this.editor;
    } catch (error) {
      console.error('[PF] Error creating editor:', error);
      return null;
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
}
