class FlowExecutionJob < ApplicationJob
  queue_as :default
  
  retry_on StandardError, wait: :exponentially_longer, attempts: 3
  
  def perform(flow_job_id)
    flow_job = FlowJob.find(flow_job_id)
    flow = flow_job.flow
    
    # Mark as running
    flow_job.mark_as_running!
    
    # Create a FlowExecution record for tracking
    execution = flow.flow_executions.create!(
      user: nil, # Triggered flows don't have a user
      execution_type: 'trigger',
      status: 'running',
      started_at: Time.current,
      input_data: {
        trigger_record_type: flow_job.trigger_record_type,
        trigger_record_id: flow_job.trigger_record_id,
        trigger_data: flow_job.trigger_data
      }
    )
    
    begin
      # Load the trigger record if it exists
      trigger_record = nil
      if flow_job.trigger_record_type && flow_job.trigger_record_id
        begin
          trigger_record = flow_job.trigger_record_type.constantize.find_by(id: flow_job.trigger_record_id)
        rescue => e
          Rails.logger.warn "Could not load trigger record: #{e.message}"
        end
      end
      
      # Execute the flow
      result = FlowExecutor.new(flow, execution, trigger_record).execute
      
      # Mark as completed
      flow_job.mark_as_completed!
      execution.update!(
        status: 'completed',
        completed_at: Time.current,
        output_data: result
      )
      
    rescue => e
      error_message = "#{e.class.name}: #{e.message}\n#{e.backtrace.first(10).join("\n")}"
      
      # Mark as failed
      flow_job.mark_as_failed!(error_message)
      execution.update!(
        status: 'failed',
        completed_at: Time.current,
        error_data: {
          message: e.message,
          class: e.class.name,
          backtrace: e.backtrace.first(20)
        }
      )
      
      # Re-raise to trigger retry mechanism
      raise
    end
  end
end

