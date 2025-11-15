class FlowExecutor
  def initialize(flow, execution, trigger_record = nil)
    @flow = flow
    @execution = execution
    @trigger_record = trigger_record
    @context = {
      trigger_record: trigger_record,
      variables: {}
    }
  end
  
  def execute
    # Get the starting point (trigger block)
    trigger_block = @flow.flow_blocks.find_by(block_type: 'trigger')
    return { success: false, message: 'No trigger block found' } unless trigger_block
    
    # Execute blocks starting from trigger
    execute_block(trigger_block)
    
    { success: true, completed_at: Time.current }
  rescue => e
    Rails.logger.error "Flow execution error: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    raise
  end
  
  private
  
  def execute_block(block)
    Rails.logger.info "Executing block: #{block.block_type} (#{block.name})"
    
    case block.block_type
    when 'trigger'
      # Trigger block - just continue to next blocks
      execute_next_blocks(block)
      
    when 'decision'
      execute_decision_block(block)
      
    when 'assignment'
      execute_assignment_block(block)
      
    when 'create_record'
      execute_create_record_block(block)
      
    when 'update_record'
      execute_update_record_block(block)
      
    when 'delete_record'
      execute_delete_record_block(block)
      
    when 'email'
      execute_email_block(block)
      
    when 'notification'
      execute_notification_block(block)
      
    when 'wait'
      execute_wait_block(block)
      
    when 'loop'
      execute_loop_block(block)
      
    when 'screen'
      # Screen blocks are for manual input, skip in automated flows
      execute_next_blocks(block)
      
    when 'api_call'
      execute_api_call_block(block)
      
    else
      Rails.logger.warn "Unknown block type: #{block.block_type}"
      execute_next_blocks(block)
    end
  end
  
  def execute_next_blocks(block)
    # Find connected blocks from this block's output port
    connections = @flow.connections_data || []
    
    # Find connections starting from this block
    next_blocks = connections.select { |conn| conn['from'] == block.id }
    
    next_blocks.each do |connection|
      next_block = @flow.flow_blocks.find_by(id: connection['to'])
      execute_block(next_block) if next_block
    end
  end
  
  def execute_decision_block(block)
    config = block.config_data || {}
    outcomes = config['outcomes'] || []
    
    # Evaluate outcomes in order
    outcomes.each do |outcome|
      conditions = outcome['conditions'] || []
      
      # Evaluate all conditions for this outcome (AND logic)
      if conditions.all? { |condition| evaluate_condition(condition) }
        # This outcome matches - execute it
        if outcome['label']
          # Find blocks connected to this outcome
          execute_outcome_blocks(block, outcome['label'])
        end
        return
      end
    end
    
    # No outcome matched - execute default path (if any)
    execute_next_blocks(block)
  end
  
  def execute_outcome_blocks(block, outcome_label)
    connections = @flow.connections_data || []
    
    # Find connections from this block with the outcome label
    connections.select do |conn|
      conn['from'] == block.id && conn['label'] == outcome_label
    end.each do |connection|
      next_block = @flow.flow_blocks.find_by(id: connection['to'])
      execute_block(next_block) if next_block
    end
  end
  
  def execute_assignment_block(block)
    config = block.config_data || {}
    assignments = config['assignments'] || []
    
    assignments.each do |assignment|
      variable = assignment['variable']
      value = resolve_value(assignment['value'])
      @context[:variables][variable] = value
    end
    
    execute_next_blocks(block)
  end
  
  def execute_create_record_block(block)
    config = block.config_data || {}
    object_api_name = config['object_api_name']
    field_mappings = config['field_mappings'] || {}
    
    # Create the record based on object type
    if object_api_name == 'pets'
      # Create pet
      pet = Pet.new(organization: @flow.organization)
      field_mappings.each do |field_api_name, value|
        pet.send("#{field_api_name}=", resolve_value(value)) if pet.respond_to?("#{field_api_name}=")
      end
      pet.save!
    elsif object_api_name == 'tasks'
      # Create task
      task = Task.new(organization: @flow.organization)
      field_mappings.each do |field_api_name, value|
        task.send("#{field_api_name}=", resolve_value(value)) if task.respond_to?("#{field_api_name}=")
      end
      task.save!
    elsif object_api_name == 'events'
      # Create event
      event = Event.new(organization: @flow.organization)
      field_mappings.each do |field_api_name, value|
        event.send("#{field_api_name}=", resolve_value(value)) if event.respond_to?("#{field_api_name}=")
      end
      event.save!
    else
      # Custom object
      custom_object = @flow.organization.custom_objects.find_by(api_name: object_api_name)
      if custom_object
        record = custom_object.custom_records.build
        field_mappings.each do |field_api_name, value|
          record.set_field_value(field_api_name, resolve_value(value))
        end
        record.save!
      end
    end
    
    execute_next_blocks(block)
  end
  
  def execute_update_record_block(block)
    config = block.config_data || {}
    object_api_name = config['object_api_name']
    record_id = resolve_value(config['record_id'])
    field_mappings = config['field_mappings'] || {}
    
    # Update the record
    record = find_record(object_api_name, record_id)
    return unless record
    
    field_mappings.each do |field_api_name, value|
      if record.is_a?(CustomRecord)
        record.set_field_value(field_api_name, resolve_value(value))
      else
        record.send("#{field_api_name}=", resolve_value(value)) if record.respond_to?("#{field_api_name}=")
      end
    end
    record.save!
    
    execute_next_blocks(block)
  end
  
  def execute_delete_record_block(block)
    config = block.config_data || {}
    object_api_name = config['object_api_name']
    record_id = resolve_value(config['record_id'])
    
    # Delete the record
    record = find_record(object_api_name, record_id)
    record&.destroy
    
    execute_next_blocks(block)
  end
  
  def execute_email_block(block)
    config = block.config_data || {}
    # TODO: Implement email sending
    Rails.logger.info "Email block executed: #{config.inspect}"
    execute_next_blocks(block)
  end
  
  def execute_notification_block(block)
    config = block.config_data || {}
    # TODO: Implement notification sending
    Rails.logger.info "Notification block executed: #{config.inspect}"
    execute_next_blocks(block)
  end
  
  def execute_wait_block(block)
    config = block.config_data || {}
    wait_time = config['wait_time'] || 0
    
    # In a background job, we can't actually wait
    # Instead, schedule a follow-up job or use Sidekiq's perform_in
    Rails.logger.info "Wait block executed: waiting #{wait_time} seconds"
    execute_next_blocks(block)
  end
  
  def execute_loop_block(block)
    config = block.config_data || {}
    # TODO: Implement loop logic
    Rails.logger.info "Loop block executed: #{config.inspect}"
    execute_next_blocks(block)
  end
  
  def execute_api_call_block(block)
    config = block.config_data || {}
    # TODO: Implement API call
    Rails.logger.info "API call block executed: #{config.inspect}"
    execute_next_blocks(block)
  end
  
  def evaluate_condition(condition)
    field_api_name = condition['field']
    operator = condition['operator']
    value = condition['value']
    
    return false unless field_api_name && operator
    
    # Get field value from trigger record or context
    field_value = get_field_value(field_api_name)
    
    # Compare based on operator (similar to FlowTriggerService)
    case operator
    when 'equals'
      field_value == resolve_value(value)
    when 'not_equals'
      field_value != resolve_value(value)
    when 'greater_than'
      compare_values(field_value, resolve_value(value)) > 0
    when 'less_than'
      compare_values(field_value, resolve_value(value)) < 0
    else
      false
    end
  end
  
  def get_field_value(field_api_name)
    if @trigger_record
      if @trigger_record.is_a?(CustomRecord)
        @trigger_record.field_value(field_api_name)
      else
        @trigger_record.send(field_api_name) if @trigger_record.respond_to?(field_api_name)
      end
    elsif @context[:variables].key?(field_api_name)
      @context[:variables][field_api_name]
    else
      nil
    end
  end
  
  def resolve_value(value)
    # If value is a variable reference (starts with $), resolve it
    if value.is_a?(String) && value.start_with?('$')
      var_name = value[1..-1]
      @context[:variables][var_name] || value
    else
      value
    end
  end
  
  def compare_values(val1, val2)
    if val1.is_a?(Numeric) && val2.is_a?(Numeric)
      val1 <=> val2
    else
      val1.to_s <=> val2.to_s
    end
  end
  
  def find_record(object_api_name, record_id)
    case object_api_name
    when 'pets'
      Pet.find_by(id: record_id)
    when 'tasks'
      Task.find_by(id: record_id)
    when 'events'
      Event.find_by(id: record_id)
    else
      # Custom object
      custom_object = @flow.organization.custom_objects.find_by(api_name: object_api_name)
      custom_object&.custom_records&.find_by(id: record_id)
    end
  end
end

