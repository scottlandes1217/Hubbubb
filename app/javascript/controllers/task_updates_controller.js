import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["status", "notes"]

  connect() {
    console.log("Task updates controller connected")
  }

  updateStatus(event) {
    const status = event.target.value
    this.statusTarget.textContent = status
  }

  updateNotes(event) {
    const notes = event.target.value
    this.notesTarget.textContent = notes
  }
} 