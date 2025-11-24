// Record Layout Builder - Clean and Minimal
// Refactored to use modules for better maintainability

import { Utils } from './modules/utils.js';
import { SaveHandler } from './modules/save-handler.js';
import { ComponentRegistry } from './modules/component-registry.js';
import { ComponentLocking } from './modules/component-locking.js';
import { SidebarBuilder } from './modules/sidebar-builder.js';
import { ContentLoader } from './modules/content-loader.js';
import { CanvasDragDrop } from './modules/canvas-drag-drop.js';
import { SectionDropPrevention } from './modules/section-drop-prevention.js';
import { ModalHandlers } from './modules/modal-handlers.js';
import { EditorSetup } from './modules/editor-setup.js';

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

      this.setupEditor();
    } catch (error) {
      console.error('[PF] Error creating editor:', error);
    }
  }

  setupEditor() {
    try {
      // Initialize modules
      this.modules = {};
      this.modules.saveHandler = new SaveHandler(this);
      this.modules.componentRegistry = new ComponentRegistry(this);
      this.modules.componentLocking = new ComponentLocking(this);
      this.modules.sidebarBuilder = new SidebarBuilder(this);
      this.modules.contentLoader = new ContentLoader(this);
      this.modules.canvasDragDrop = new CanvasDragDrop(this);
      this.modules.sectionDropPrevention = new SectionDropPrevention(this);
      this.modules.modalHandlers = new ModalHandlers(this);
      this.modules.editorSetup = new EditorSetup(this);
      
      // Setup modules
      this.modules.saveHandler.setup();
      this.modules.componentRegistry.setup();
      this.modules.componentLocking.setup();
      this.modules.sidebarBuilder.setup();
      this.modules.contentLoader.setup();
      this.modules.canvasDragDrop.setup();
      this.modules.sectionDropPrevention.setup();
      this.modules.modalHandlers.setup();
      this.modules.editorSetup.setup();
    } catch (error) {
      console.error('[PF] Error in setupEditor:', error);
    }
  }

  // Delegate to EditorSetup module
  injectCanvasCSS() {
    if (this.modules && this.modules.editorSetup) {
      this.modules.editorSetup.injectCanvasCSS();
    }
  }

  // Delegate to SectionDropPrevention module
  setupSectionDropPrevention() {
    if (this.modules && this.modules.sectionDropPrevention) {
      this.modules.sectionDropPrevention.setupSectionDropPrevention();
    }
  }

  // Delegate to ModalHandlers module
  setupTabsConfigModal() {
    if (this.modules && this.modules.modalHandlers) {
      this.modules.modalHandlers.setupTabsConfigModal();
    }
  }

  setupSectionConfigModal() {
    if (this.modules && this.modules.modalHandlers) {
      this.modules.modalHandlers.setupSectionConfigModal();
    }
  }
  
  // Removed _OLD methods - code has been migrated to modules

  // Delegate to ComponentLocking module
  setupComponentLocking() {
    if (this.modules && this.modules.componentLocking) {
      this.modules.componentLocking.setup();
    }
  }

  // Delegate helper methods that other modules need
  isSection(comp) {
    if (this.modules && this.modules.componentRegistry) {
      return this.modules.componentRegistry.isSection(comp);
    }
    return false;
  }

  isInsideSectionOrTab(comp) {
    if (this.modules && this.modules.componentRegistry) {
      return this.modules.componentRegistry.isInsideSectionOrTab(comp);
    }
    return false;
  }

  addDeleteButton(comp) {
    if (this.modules && this.modules.componentLocking) {
      return this.modules.componentLocking.addDeleteButton(comp);
    }
  }

  lockTabsInnerComponents(comp) {
    if (this.modules && this.modules.componentLocking) {
      return this.modules.componentLocking.lockTabsInnerComponents(comp);
    }
  }

  lockInnerComponents(comp) {
    if (this.modules && this.modules.componentLocking) {
      return this.modules.componentLocking.lockInnerComponents(comp);
    }
  }

  // Removed all _OLD methods - code has been migrated to modules

  // Delegate to Utils module
  sanitizeLayoutHtml(html) {
    return Utils.sanitizeLayoutHtml(html);
  }

  getAssetPath(key) {
    return Utils.getAssetPath(key);
  }

  getOrganizationId() {
    return Utils.getOrganizationId();
  }

  getReturnPath() {
    return Utils.getReturnPath();
  }

  clearCanvas() {
    if (this.editor) {
      this.editor.setComponents('');
      this.editor.setStyle('');
    }
  }

  showSaveMessage(message, type) {
    return Utils.showSaveMessage(message, type);
  }

  setupTabsConfigModal() {
    if (this.modules && this.modules.modalHandlers) {
      this.modules.modalHandlers.setupTabsConfigModal();
    }
  }

  setupSectionConfigModal() {
    if (this.modules && this.modules.modalHandlers) {
      this.modules.modalHandlers.setupSectionConfigModal();
    }
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
