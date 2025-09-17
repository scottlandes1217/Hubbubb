import { Controller } from "@hotwired/stimulus";

console.log("Task controller file loaded");

export default class extends Controller {
  static targets = [];
  static values = { editUrl: String };

  connect() {
    console.log("=== TASK CONTROLLER CONNECTED ===");
    console.log("Task controller element:", this.element);
    console.log("Task controller dataset:", this.element.dataset);
    
    // Always dispatch task:opened event - let the tabbed navigation controller handle the logic
    const taskId = this.element.dataset.taskId;
    const taskSubject = this.element.dataset.taskSubject;
    const taskUrl = window.location.href;
    
    if (taskId && taskSubject) {
      console.log(`Task page loaded, dispatching task:opened for task: ${taskSubject} (ID: ${taskId})`);
      const event = new CustomEvent('task:opened', {
        detail: { taskId: taskId, taskSubject: taskSubject, taskUrl: taskUrl, fromPinButton: false }
      });
      window.dispatchEvent(event);
      console.log("task:opened event dispatched successfully");
    } else {
      console.log("Missing taskId or taskSubject:", { taskId, taskSubject });
    }
  }

  disconnect() {
    // Clean up any event listeners if needed
  }
} 