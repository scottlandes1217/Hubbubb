class FlowTriggerService
  def self.check_and_trigger(record, organization)
    # Find all active flows for this organization that have triggers
    flows = organization.flows.active.joins(:flow_blocks)
                        .where(flow_blocks: { block_type: 'trigger' })
                        .distinct
    
    flows.each do |flow|
      # Find the trigger block for this flow
      trigger_block = flow.flow_blocks.find_by(block_type: 'trigger')
      next unless trigger_block
      
      # Evaluate trigger conditions
      if evaluate_trigger(trigger_block, record)
        # Create flow job and queue it
        create_flow_job(flow, record, organization)
      end
    end
  end
  
  private
  
  def self.evaluate_trigger(trigger_block, record)
    config = trigger_block.config_data || {}
    conditions = config['conditions'] || []
    
    # If no conditions, trigger always fires
    return true if conditions.empty?
    
    # Get the object API name from trigger config
    object_api_name = config['object_api_name']
    return false unless object_api_name
    
    # Check if this record matches the trigger object
    unless record_matches_object?(record, object_api_name)
      return false
    end
    
    # Evaluate all conditions (AND logic by default)
    conditions.all? do |condition|
      evaluate_condition(condition, record)
    end
  end
  
  def self.record_matches_object?(record, object_api_name)
    case object_api_name
    when 'pets'
      record.is_a?(Pet)
    when 'tasks'
      record.is_a?(Task)
    when 'events'
      record.is_a?(Event)
    else
      # Check if it's a custom object
      if record.is_a?(CustomRecord)
        record.custom_object.api_name == object_api_name
      else
        false
      end
    end
  end
  
  def self.evaluate_condition(condition, record)
    field_api_name = condition['field']
    operator = condition['operator']
    value = condition['value']
    
    return false unless field_api_name && operator
    
    # Get field value from record
    field_value = get_field_value(record, field_api_name)
    
    # Compare based on operator
    case operator
    when 'equals'
      field_value == value
    when 'not_equals'
      field_value != value
    when 'greater_than'
      compare_values(field_value, value) > 0
    when 'less_than'
      compare_values(field_value, value) < 0
    when 'greater_than_or_equal'
      compare_values(field_value, value) >= 0
    when 'less_than_or_equal'
      compare_values(field_value, value) <= 0
    when 'contains'
      field_value.to_s.downcase.include?(value.to_s.downcase)
    when 'not_contains'
      !field_value.to_s.downcase.include?(value.to_s.downcase)
    when 'starts_with'
      field_value.to_s.downcase.start_with?(value.to_s.downcase)
    when 'ends_with'
      field_value.to_s.downcase.end_with?(value.to_s.downcase)
    when 'is_empty'
      field_value.blank?
    when 'is_not_empty'
      field_value.present?
    else
      false
    end
  end
  
  def self.get_field_value(record, field_api_name)
    # Handle standard object fields
    if record.is_a?(Pet) || record.is_a?(Task) || record.is_a?(Event)
      # Use send if the method exists, otherwise try custom fields
      if record.respond_to?(field_api_name)
        record.send(field_api_name)
      else
        # Try custom fields for standard objects
        get_custom_field_value(record, field_api_name)
      end
    elsif record.is_a?(CustomRecord)
      # Use the custom record's field_value method
      record.field_value(field_api_name)
    else
      nil
    end
  end
  
  def self.get_custom_field_value(record, field_api_name)
    # Try to find a custom field value for this record
    # This would require custom_field_values association on standard objects
    # For now, return nil - can be enhanced later
    nil
  end
  
  def self.compare_values(val1, val2)
    # Try numeric comparison first
    if val1.is_a?(Numeric) && val2.is_a?(Numeric)
      val1 <=> val2
    elsif val1.is_a?(Date) || val1.is_a?(Time) || val1.is_a?(DateTime)
      val1 <=> (val2.is_a?(String) ? Date.parse(val2) : val2)
    else
      # String comparison
      val1.to_s <=> val2.to_s
    end
  end
  
  def self.create_flow_job(flow, record, organization)
    # Create flow job
    flow_job = FlowJob.create!(
      flow: flow,
      organization: organization,
      status: 'pending',
      trigger_record_type: record.class.name,
      trigger_record_id: record.id,
      trigger_data: {
        record_id: record.id,
        record_type: record.class.name,
        triggered_at: Time.current
      }
    )
    
    # Queue the job
    job = FlowExecutionJob.perform_later(flow_job.id)
    # Get the job ID from the ActiveJob job object
    # For Sidekiq adapter, we use provider_job_id
    job_id = job.provider_job_id rescue job.job_id rescue nil
    flow_job.mark_as_queued!(job_id) if job_id
    
    flow_job
  end
end

