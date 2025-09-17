class TaskStatusUpdateWorker
  include Sidekiq::Worker

  def perform(task_id)
    Rails.logger.info "TaskStatusUpdateWorker: Starting update for task #{task_id}"
    task = Task.find_by(id: task_id)
    
    if task.nil?
      Rails.logger.error "TaskStatusUpdateWorker: Task #{task_id} not found"
      return
    end

    Rails.logger.info "TaskStatusUpdateWorker: Found task #{task_id}"
    Rails.logger.info "TaskStatusUpdateWorker: Current status: #{task.status}"
    Rails.logger.info "TaskStatusUpdateWorker: Start time: #{task.start_time.in_time_zone}"
    Rails.logger.info "TaskStatusUpdateWorker: Duration: #{task.duration_minutes} minutes"
    
    # Update the task status
    task.update_status!
    
    # Broadcast the task status update
    Rails.logger.info "TaskStatusUpdateWorker: Broadcasting task status update"
    Rails.logger.info "TaskStatusUpdateWorker: Target: task_status_#{task_id}"
    Turbo::StreamsChannel.broadcast_replace_to(
      "pet_#{task.pet_id}",
      target: "task_status_#{task_id}",
      partial: "tasks/task_status",
      locals: { task: task }
    )

    # Broadcast the pet flags update
    Rails.logger.info "TaskStatusUpdateWorker: Broadcasting pet flags update"
    Rails.logger.info "TaskStatusUpdateWorker: Target: pet_header_#{task.pet_id}"
    Turbo::StreamsChannel.broadcast_replace_to(
      "pet_#{task.pet_id}",
      target: "pet_header_#{task.pet_id}",
      partial: "pets/pet_header",
      locals: { pet: task.pet }
    )
    
    # Schedule next update if needed
    if task.should_schedule_update?
      end_time = task.start_time.in_time_zone + task.duration_minutes.minutes
      Rails.logger.info "TaskStatusUpdateWorker: Scheduling next update for #{end_time}"
      TaskStatusUpdateWorker.perform_at(end_time, task_id)
    end
  end
end 