module SearchHelper
  def get_result_icon(result)
    case result.class.name
    when 'Pet'
      'fas fa-paw'
    when 'User'
      'fas fa-user'
    when 'Task'
      'fas fa-tasks'
    when 'Event'
      'fas fa-calendar'
    when 'Post'
      'fas fa-comment'
    else
      'fas fa-file'
    end
  end

  def get_result_title(result)
    case result.class.name
    when 'Pet'
      result.name
    when 'User'
      result.full_name
    when 'Task'
      result.subject
    when 'Event'
      result.title
    when 'Post'
      result.body.truncate(50)
    else
      result.to_s
    end
  end

  def get_result_details(result)
    case result.class.name
    when 'Pet'
      details = []
      details << result.species&.value if result.species
      details << result.status&.titleize if result.status
      details << "#{result.age} years old" if result.age
      details.join(' • ')
    when 'User'
      result.email
    when 'Task'
      details = []
      details << result.pet.name if result.pet
      details << result.status if result.status
      details.join(' • ')
    when 'Event'
      details = []
      details << result.start_time.strftime('%b %d, %Y') if result.start_time
      details << result.event_type&.titleize if result.event_type
      details.join(' • ')
    when 'Post'
      "Posted by #{result.user&.full_name || 'Unknown'}"
    else
      ''
    end
  end

  def get_result_url(result)
    case result.class.name
    when 'Pet'
      organization_pet_path(result.organization, result)
    when 'User'
      edit_user_registration_path
    when 'Task'
      organization_task_path(result.pet.organization, result)
    when 'Event'
      organization_event_path(result.organization, result)
    when 'Post'
      organization_post_path(result.organization, result)
    else
      '#'
    end
  end
end 