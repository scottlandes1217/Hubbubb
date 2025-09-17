module FlowsHelper
  def get_block_type_color(block_type)
    case block_type
    when 'trigger'
      'bg-danger'
    when 'screen'
      'bg-primary'
    when 'decision'
      'bg-warning'
    when 'create_record', 'update_record', 'delete_record'
      'bg-info'
    when 'assignment', 'loop'
      'bg-secondary'
    when 'email', 'notification', 'api_call', 'wait'
      'bg-success'
    else
      'bg-secondary'
    end
  end

  def get_execution_status_color(status)
    case status
    when 'completed'
      'bg-success'
    when 'running'
      'bg-primary'
    when 'failed'
      'bg-danger'
    when 'cancelled'
      'bg-warning'
    else
      'bg-secondary'
    end
  end

  def get_block_icon(block_type)
    case block_type
    when 'trigger'
      'fas fa-bolt'
    when 'screen'
      'fas fa-desktop'
    when 'decision'
      'fas fa-question-circle'
    when 'create_record'
      'fas fa-plus-circle'
    when 'update_record'
      'fas fa-edit'
    when 'delete_record'
      'fas fa-trash'
    when 'assignment'
      'fas fa-equals'
    when 'loop'
      'fas fa-redo'
    when 'email'
      'fas fa-envelope'
    when 'notification'
      'fas fa-bell'
    when 'api_call'
      'fas fa-plug'
    when 'wait'
      'fas fa-clock'
    else
      'fas fa-cube'
    end
  end

  def get_block_description(block_type)
    case block_type
    when 'trigger'
      'Event that starts the flow'
    when 'screen'
      'User interface for data input and display'
    when 'decision'
      'Conditional logic with branching paths'
    when 'create_record'
      'Create new database records'
    when 'update_record'
      'Modify existing database records'
    when 'delete_record'
      'Remove database records'
    when 'assignment'
      'Set variable values and calculations'
    when 'loop'
      'Repeat actions for collections'
    when 'email'
      'Send email notifications'
    when 'notification'
      'Send system notifications'
    when 'api_call'
      'Make external API requests'
    when 'wait'
      'Pause execution for specified time'
    else
      'Block configuration'
    end
  end
end 