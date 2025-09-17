// OrchestrationBuilder: Salesforce Flow-like Orchestration Builder
// Modern, modular, and maintainable

export class OrchestrationBuilder {
  constructor(config) {
    this.config = config;
    this.canvas = document.getElementById(config.canvasId);
    this.palette = document.getElementById(config.paletteId);
    this.modal = document.getElementById(config.modalId);
    this.saveBtn = document.getElementById(config.saveBtnId);
    this.testBtn = document.getElementById(config.testBtnId);
    this.zoomInBtn = document.getElementById(config.zoomInId);
    this.zoomOutBtn = document.getElementById(config.zoomOutId);
    this.multiSelectBtn = document.getElementById(config.multiSelectId);
    this.saveUrl = config.saveUrl;
    this.csrfToken = config.csrfToken;
    this.blocks = [];
    this.connections = [];
    this.selectedBlocks = new Set();
    this.isMultiSelecting = false;
    this.selectionBox = null;
    this.currentZoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.isDraggingBlock = false;
    this.dragOffset = { x: 0, y: 0 };
    this.connectionPreview = null;
    this.connectingPort = null;
    this.blockCounter = 1;
    this.init();
  }

  init() {
    this.setupSVG();
    this.setupPalette();
    this.setupCanvasEvents();
    this.setupControls();
    this.setupModal();
    this.loadBlocks(this.config.orchestrationData || []);
    this.loadConnections(this.config.connectionData || []);
    this.setupKeyboardShortcuts();
  }

  setupSVG() {
    // SVG for connections
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('id', 'connection-svg');
    this.svg.style.position = 'absolute';
    this.svg.style.top = '0';
    this.svg.style.left = '0';
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';
    this.svg.style.pointerEvents = 'none';
    this.svg.style.zIndex = '5';
    this.canvas.parentNode.insertBefore(this.svg, this.canvas);
  }

  setupPalette() {
    // Drag and drop from palette
    this.palette.querySelectorAll('.block-item').forEach(item => {
      item.addEventListener('dragstart', e => {
        e.dataTransfer.setData('block-type', item.dataset.blockType);
      });
    });
    this.canvas.addEventListener('dragover', e => {
      e.preventDefault();
    });
    this.canvas.addEventListener('drop', e => {
      e.preventDefault();
      const blockType = e.dataTransfer.getData('block-type');
      if (blockType) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.panX) / this.currentZoom;
        const y = (e.clientY - rect.top - this.panY) / this.currentZoom;
        this.createBlock(blockType, x, y);
      }
    });
  }

  setupCanvasEvents() {
    // Pan/zoom
    this.canvas.addEventListener('mousedown', e => {
      if (e.target === this.canvas) {
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY, panX: this.panX, panY: this.panY };
        this.canvas.style.cursor = 'grabbing';
      }
    });
    document.addEventListener('mousemove', e => {
      if (this.isPanning) {
        this.panX = this.panStart.panX + (e.clientX - this.panStart.x);
        this.panY = this.panStart.panY + (e.clientY - this.panStart.y);
        this.updateTransform();
      }
    });
    document.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.canvas.style.cursor = 'grab';
      }
    });
    // Zoom with wheel
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.2, Math.min(2.5, this.currentZoom * zoomFactor));
      if (newZoom !== this.currentZoom) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - this.panX) / this.currentZoom;
        const mouseY = (e.clientY - rect.top - this.panY) / this.currentZoom;
        this.panX -= mouseX * (newZoom - this.currentZoom);
        this.panY -= mouseY * (newZoom - this.currentZoom);
        this.currentZoom = newZoom;
        this.updateTransform();
      }
    });
    // Multi-select box
    this.canvas.addEventListener('mousedown', e => {
      if (e.shiftKey && e.target === this.canvas) {
        this.isMultiSelecting = true;
        this.selectionStart = { x: e.offsetX, y: e.offsetY };
        this.showSelectionBox(e.offsetX, e.offsetY);
      }
    });
    this.canvas.addEventListener('mousemove', e => {
      if (this.isMultiSelecting) {
        this.updateSelectionBox(e.offsetX, e.offsetY);
      }
    });
    this.canvas.addEventListener('mouseup', e => {
      if (this.isMultiSelecting) {
        this.isMultiSelecting = false;
        this.selectBlocksInBox();
        this.hideSelectionBox();
      }
    });
  }

  setupControls() {
    this.zoomInBtn.addEventListener('click', () => {
      this.currentZoom = Math.min(2.5, this.currentZoom * 1.1);
      this.updateTransform();
    });
    this.zoomOutBtn.addEventListener('click', () => {
      this.currentZoom = Math.max(0.2, this.currentZoom * 0.9);
      this.updateTransform();
    });
    this.multiSelectBtn.addEventListener('click', () => {
      // Toggle multi-select mode (future: visual feedback)
    });
    this.saveBtn.addEventListener('click', () => this.saveOrchestration());
    this.testBtn.addEventListener('click', () => this.showNotification('Orchestration test started!', 'success'));
  }

  setupModal() {
    // Use Bootstrap modal events
    this.modal.addEventListener('show.bs.modal', () => {
      // Populate modal fields
    });
    document.getElementById('save-block-properties').addEventListener('click', () => {
      // Save block properties
      this.hideModal();
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        this.deleteSelectedBlocks();
      }
      if (e.key === 'Escape') {
        this.cancelConnection();
      }
    });
  }

  updateTransform() {
    this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.currentZoom})`;
    this.svg.style.transform = this.canvas.style.transform;
    this.blocks.forEach(block => {
      block.el.style.transform = '';
    });
    this.redrawConnections();
  }

  showSelectionBox(x, y) {
    if (!this.selectionBox) {
      this.selectionBox = document.createElement('div');
      this.selectionBox.id = 'selection-box';
      this.canvas.appendChild(this.selectionBox);
    }
    this.selectionBox.style.display = 'block';
    this.selectionBox.style.left = `${x}px`;
    this.selectionBox.style.top = `${y}px`;
    this.selectionBox.style.width = '1px';
    this.selectionBox.style.height = '1px';
    this.selectionBox.startX = x;
    this.selectionBox.startY = y;
  }
  updateSelectionBox(x, y) {
    if (!this.selectionBox) return;
    const minX = Math.min(this.selectionBox.startX, x);
    const minY = Math.min(this.selectionBox.startY, y);
    const width = Math.abs(x - this.selectionBox.startX);
    const height = Math.abs(y - this.selectionBox.startY);
    this.selectionBox.style.left = `${minX}px`;
    this.selectionBox.style.top = `${minY}px`;
    this.selectionBox.style.width = `${width}px`;
    this.selectionBox.style.height = `${height}px`;
  }
  hideSelectionBox() {
    if (this.selectionBox) this.selectionBox.style.display = 'none';
  }
  selectBlocksInBox() {
    if (!this.selectionBox) return;
    const box = this.selectionBox.getBoundingClientRect();
    this.blocks.forEach(block => {
      const rect = block.el.getBoundingClientRect();
      if (
        rect.left < box.right &&
        rect.right > box.left &&
        rect.top < box.bottom &&
        rect.bottom > box.top
      ) {
        this.selectBlock(block, true);
      }
    });
  }

  createBlock(type, x, y) {
    const id = `block_${this.blockCounter++}`;
    const el = document.createElement('div');
    el.className = `orchestration-block block-${type}`;
    el.id = id;
    el.dataset.blockType = type;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.innerHTML = this.blockHTML(type, id);
    this.canvas.appendChild(el);
    const block = { id, type, el, x, y, name: this.getBlockName(type), config: {} };
    this.blocks.push(block);
    this.makeBlockDraggable(block);
    this.setupBlockPorts(block);
    el.addEventListener('click', e => {
      if (!e.shiftKey) this.clearSelection();
      this.selectBlock(block, true);
      e.stopPropagation();
    });
    el.addEventListener('dblclick', e => {
      this.openModal(block);
      e.stopPropagation();
    });
    return block;
  }

  blockHTML(type, id) {
    return `
      <div class="block-header">
        <h6 class="block-title">${this.getBlockName(type)}</h6>
        <span class="block-type">${type}</span>
      </div>
      <div class="block-content">${this.getBlockDescription(type)}</div>
      <div class="port-input block-ports" data-port-type="input"></div>
      ${type === 'decision' ? `
        <div class="port-decision-yes block-ports" data-port-type="yes"></div>
        <div class="port-decision-no block-ports" data-port-type="no"></div>
      ` : `<div class="port-output block-ports" data-port-type="output"></div>`}
    `;
  }

  getBlockName(type) {
    const names = {
      trigger: 'New Trigger', screen: 'New Screen', decision: 'New Decision',
      create_record: 'Create Record', update_record: 'Update Record', delete_record: 'Delete Record',
      assignment: 'New Assignment', loop: 'New Loop', email: 'Send Email', notification: 'Send Notification',
      api_call: 'API Call', wait: 'Wait'
    };
    return names[type] || 'New Block';
  }
  getBlockDescription(type) {
    const desc = {
      trigger: 'Starts the orchestration', screen: 'User interface for data input', decision: 'Conditional logic branching',
      create_record: 'Create new database record', update_record: 'Update existing record', delete_record: 'Delete database record',
      assignment: 'Set variable values', loop: 'Repeat actions', email: 'Send email notification', notification: 'Send system notification',
      api_call: 'External API request', wait: 'Pause execution'
    };
    return desc[type] || 'Block configuration';
  }

  makeBlockDraggable(block) {
    let isDragging = false;
    let offset = { x: 0, y: 0 };
    block.el.addEventListener('mousedown', e => {
      if (e.target.classList.contains('block-ports')) return;
      isDragging = true;
      offset.x = e.clientX - block.el.offsetLeft;
      offset.y = e.clientY - block.el.offsetTop;
      this.isDraggingBlock = true;
      document.body.style.userSelect = 'none';
      e.stopPropagation();
    });
    document.addEventListener('mousemove', e => {
      if (isDragging) {
        const x = (e.clientX - offset.x);
        const y = (e.clientY - offset.y);
        block.el.style.left = `${x}px`;
        block.el.style.top = `${y}px`;
        block.x = x;
        block.y = y;
        this.redrawConnections();
      }
    });
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        this.isDraggingBlock = false;
        document.body.style.userSelect = '';
      }
    });
  }

  setupBlockPorts(block) {
    block.el.querySelectorAll('.block-ports').forEach(port => {
      port.addEventListener('mousedown', e => {
        e.stopPropagation();
        this.startConnection(block, port);
      });
    });
  }

  startConnection(block, port) {
    this.connectingPort = { block, port };
    this.connectionPreview = this.createSVGPath('preview');
    this.svg.appendChild(this.connectionPreview);
    document.addEventListener('mousemove', this.updateConnectionPreview);
    document.addEventListener('mouseup', this.finishConnection);
  }

  updateConnectionPreview = (e) => {
    if (!this.connectingPort) return;
    const { x, y } = this.getPortCenter(this.connectingPort.port);
    const canvasRect = this.canvas.getBoundingClientRect();
    const endX = e.clientX - canvasRect.left;
    const endY = e.clientY - canvasRect.top;
    this.connectionPreview.setAttribute('d', `M ${x} ${y} L ${endX} ${endY}`);
  }

  finishConnection = (e) => {
    if (!this.connectingPort) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (target && target.classList.contains('block-ports')) {
      const targetBlock = this.blocks.find(b => b.el.contains(target));
      if (targetBlock && this.canConnect(this.connectingPort, { block: targetBlock, port: target })) {
        this.createConnection(this.connectingPort, { block: targetBlock, port: target });
      } else {
        this.showNotification('Invalid connection', 'error');
      }
    }
    this.svg.removeChild(this.connectionPreview);
    this.connectionPreview = null;
    this.connectingPort = null;
    document.removeEventListener('mousemove', this.updateConnectionPreview);
    document.removeEventListener('mouseup', this.finishConnection);
  }

  canConnect(from, to) {
    if (from.block === to.block) return false;
    const fromType = from.port.dataset.portType;
    const toType = to.port.dataset.portType;
    if (fromType === toType) return false;
    if (!["output", "yes", "no"].includes(fromType)) return false;
    if (toType !== 'input') return false;
    // Only one outgoing connection per block (except decision)
    if (from.block.type !== 'decision') {
      if (this.connections.some(c => c.from.block === from.block && c.from.port.dataset.portType === fromType)) {
        return false;
      }
    }
    // Only one incoming per input port
    if (this.connections.some(c => c.to.block === to.block && c.to.port.dataset.portType === toType)) {
      return false;
    }
    return true;
  }

  createConnection(from, to) {
    const conn = { from, to };
    conn.path = this.createSVGPath();
    this.connections.push(conn);
    this.svg.appendChild(conn.path);
    this.redrawConnections();
  }

  createSVGPath(cls = '') {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', `connection-path${cls ? ' ' + cls : ''}`);
    path.setAttribute('stroke', cls === 'preview' ? '#2196f3' : '#2196f3');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    return path;
  }

  redrawConnections() {
    this.connections.forEach(conn => {
      const { x: x1, y: y1 } = this.getPortCenter(conn.from.port);
      const { x: x2, y: y2 } = this.getPortCenter(conn.to.port);
      conn.path.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
    });
  }

  getPortCenter(port) {
    const rect = port.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - canvasRect.left,
      y: rect.top + rect.height / 2 - canvasRect.top
    };
  }

  clearSelection() {
    this.selectedBlocks.forEach(b => b.el.classList.remove('selected'));
    this.selectedBlocks.clear();
  }
  selectBlock(block, add = false) {
    if (!add) this.clearSelection();
    block.el.classList.add('selected');
    this.selectedBlocks.add(block);
  }
  deleteSelectedBlocks() {
    this.selectedBlocks.forEach(block => {
      this.canvas.removeChild(block.el);
      this.blocks = this.blocks.filter(b => b !== block);
      // Remove connections
      this.connections = this.connections.filter(conn => {
        if (conn.from.block === block || conn.to.block === block) {
          this.svg.removeChild(conn.path);
          return false;
        }
        return true;
      });
    });
    this.selectedBlocks.clear();
  }
  cancelConnection() {
    if (this.connectionPreview) {
      this.svg.removeChild(this.connectionPreview);
      this.connectionPreview = null;
      this.connectingPort = null;
    }
  }
  openModal(block) {
    // Populate modal fields
    document.getElementById('block-modal-title').textContent = this.getBlockName(block.type);
    document.getElementById('block-modal-body').innerHTML = `
      <div class="mb-3">
        <label class="form-label">Block Name</label>
        <input type="text" class="form-control" id="modal-block-name" value="${block.name}">
      </div>
      <div class="mb-3">
        <label class="form-label">Configuration</label>
        <textarea class="form-control" id="modal-block-config" rows="3">${block.config.text || ''}</textarea>
      </div>
    `;
    this.modal.block = block;
    const modal = new bootstrap.Modal(this.modal);
    modal.show();
  }
  hideModal() {
    const modal = bootstrap.Modal.getInstance(this.modal);
    if (modal) modal.hide();
    if (this.modal.block) {
      const name = document.getElementById('modal-block-name').value;
      const config = document.getElementById('modal-block-config').value;
      this.modal.block.name = name;
      this.modal.block.config.text = config;
      this.modal.block.el.querySelector('.block-title').textContent = name;
    }
    this.modal.block = null;
  }
  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-' + (type === 'success' ? 'success' : 'danger') + ' position-fixed';
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }
  saveOrchestration() {
    const blocks = this.blocks.map(block => ({
      id: block.id,
      block_type: block.type,
      name: block.name,
      position_x: parseInt(block.el.style.left),
      position_y: parseInt(block.el.style.top),
      config: block.config
    }));
    const connections = this.connections.map(conn => ({
      from: { block: conn.from.block.id, port: conn.from.port.dataset.portType },
      to: { block: conn.to.block.id, port: conn.to.port.dataset.portType }
    }));
    fetch(this.saveUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-Token': this.csrfToken
      },
      body: JSON.stringify({
        orchestration: {
          layout_data: blocks,
          connections_data: connections
        }
      })
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) this.showNotification('Orchestration saved!', 'success');
      else this.showNotification('Error saving orchestration', 'error');
    })
    .catch(() => this.showNotification('Error saving orchestration', 'error'));
  }
  loadBlocks(data) {
    data.forEach(b => {
      const block = this.createBlock(b.block_type, b.position_x, b.position_y);
      block.id = b.id;
      block.name = b.name;
      block.config = b.config || {};
      block.el.querySelector('.block-title').textContent = b.name;
    });
  }
  loadConnections(data) {
    data.forEach(conn => {
      const fromBlock = this.blocks.find(b => b.id === conn.from.block);
      const toBlock = this.blocks.find(b => b.id === conn.to.block);
      if (fromBlock && toBlock) {
        const fromPort = fromBlock.el.querySelector(`[data-port-type="${conn.from.port}"]`);
        const toPort = toBlock.el.querySelector(`[data-port-type="${conn.to.port}"]`);
        if (fromPort && toPort) {
          this.createConnection({ block: fromBlock, port: fromPort }, { block: toBlock, port: toPort });
        }
      }
    });
  }
} 