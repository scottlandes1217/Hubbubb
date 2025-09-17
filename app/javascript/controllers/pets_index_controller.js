import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  handlePetPinned = (event) => {
    const { petId } = event.detail;
    const button = document.querySelector(`.pin-pet-btn[data-pet-id="${petId}"]`);
    if (button) {
      button.classList.add('pinned');
      button.title = 'Unpin from navigation';
      button.querySelector('i').classList.add('text-warning');
    }
  }

  handlePetUnpinned = (event) => {
    const { petId } = event.detail;
    const button = document.querySelector(`.pin-pet-btn[data-pet-id="${petId}"]`);
    console.log(`[DEBUG] handlePetUnpinned called for petId=${petId}, button found:`, !!button);
    if (button) {
      button.classList.remove('pinned');
      button.title = 'Pin to navigation';
      button.querySelector('i').classList.remove('text-warning');
    }
  }

  connect() {
    console.log("Pets index controller connected", this.element);
    window.addEventListener('pet:opened', this.handlePetPinned);
    window.addEventListener('pet:unpinned', this.handlePetUnpinned);
    window.addEventListener('pet:pinned', this.handlePetPinned);
    window.addEventListener('pet:unpinned_ui', this.handlePetUnpinned);
  }

  disconnect() {
    console.log("Pets index controller disconnected");
    window.removeEventListener('pet:opened', this.handlePetPinned);
    window.removeEventListener('pet:unpinned', this.handlePetUnpinned);
    window.removeEventListener('pet:pinned', this.handlePetPinned);
    window.removeEventListener('pet:unpinned_ui', this.handlePetUnpinned);
  }

  async togglePin(event) {
    const button = event.currentTarget.closest('.pin-pet-btn');
    const petId = button.dataset.petId;
    const isPinned = button.classList.contains('pinned');
    const petName = button.closest('tr').querySelector('td:nth-child(2) a')?.textContent || '';
    const petUrl = button.closest('tr').querySelector('td:nth-child(2) a')?.href || '';

    console.log(`[DEBUG] togglePin: petId=${petId}, isPinned=${isPinned}, class=${button.className}`);

    if (isPinned) {
      // Unpin: persist to backend first
      try {
        await fetch(`/pinned_tabs/unpin_pet?pet_id=${petId}`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        // Then update UI
        const event = new CustomEvent('pet:unpinned', {
          detail: { petId: petId }
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Failed to unpin pet:', error);
      }
    } else {
      // Pin: persist to backend first
      try {
        await fetch('/pinned_tabs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({ pet_id: petId })
        });
        // Then update UI
        const event = new CustomEvent('pet:opened', {
          detail: { petId: petId, petName: petName, petUrl: petUrl, fromPinButton: true }
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Failed to pin pet:', error);
      }
    }
  }
} 