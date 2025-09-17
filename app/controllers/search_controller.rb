class SearchController < ApplicationController
  before_action :authenticate_user!
  before_action :set_organization, if: :organization_context?

  def index
    @query = params[:q]&.strip
    @record_type = params[:record_type]
    @filters = params[:filters] || {}
    
    if @query.present?
      @results = perform_search(@query, @record_type, @filters)
    else
      @results = []
    end
  end

  def quick_search
    query = params[:q]&.strip
    return render json: { results: [] } if query.blank?

    # Set organization from params if not already set
    @organization ||= current_user.organizations.find(params[:organization_id]) if params[:organization_id]
    return render json: { results: [] } unless @organization

    results = perform_quick_search(query)
    render json: { results: results }
  end

  private

  def set_organization
    @organization = Organization.find_by(id: params[:organization_id])
    head :not_found unless @organization
    # Optionally, add authorization here if needed
  end

  def organization_context?
    params[:organization_id].present?
  end

  def perform_quick_search(query)
    results = []
    
    # Search pets
    pets = search_pets(query).limit(5)
    pets.each do |pet|
      results << {
        id: pet.id,
        type: 'pet',
        title: pet.name,
        subtitle: "#{pet.species&.value || 'Unknown'} • #{pet.status&.titleize}",
        icon: 'fas fa-paw',
        url: organization_pet_path(@organization, pet),
        recent: pet.updated_at > 1.day.ago
      }
    end

    # Search users
    users = search_users(query).limit(5)
    users.each do |user|
      results << {
        id: user.id,
        type: 'user',
        title: user.full_name,
        subtitle: user.email,
        icon: 'fas fa-user',
        url: edit_user_registration_path,
        recent: user.updated_at > 1.day.ago
      }
    end

    # Search tasks
    tasks = search_tasks(query).limit(5)
    tasks.each do |task|
      results << {
        id: task.id,
        type: 'task',
        title: task.subject,
        subtitle: "#{task.pet&.name || 'Unknown Pet'} • #{task.status}",
        icon: 'fas fa-tasks',
        url: organization_task_path(@organization, task),
        recent: task.updated_at > 1.day.ago
      }
    end

    # Search events
    events = search_events(query).limit(5)
    events.each do |event|
      results << {
        id: event.id,
        type: 'event',
        title: event.title,
        subtitle: "#{event.start_time&.strftime('%b %d, %Y') || 'No Date'} • #{event.event_type&.titleize || 'General'}",
        icon: 'fas fa-calendar',
        url: organization_event_path(@organization, event),
        recent: event.updated_at > 1.day.ago
      }
    end

    # Search posts
    posts = search_posts(query).limit(5)
    posts.each do |post|
      results << {
        id: post.id,
        type: 'post',
        title: post.body.truncate(50),
        subtitle: "Posted by #{post.user&.full_name || 'Unknown'}",
        icon: 'fas fa-comment',
        url: organization_post_path(@organization, post),
        recent: post.updated_at > 1.day.ago
      }
    end

    # Sort by recent first, then by relevance
    results.sort_by { |r| [r[:recent] ? 0 : 1, r[:title].downcase] }
  end

  def perform_search(query, record_type = nil, filters = {})
    return [] unless @organization
    
    results = []
    
    case record_type
    when 'pets'
      results = search_pets(query, filters)
    when 'users'
      results = search_users(query, filters)
    when 'tasks'
      results = search_tasks(query, filters)
    when 'events'
      results = search_events(query, filters)
    when 'posts'
      results = search_posts(query, filters)
    else
      # Search all types
      results = search_pets(query, filters) + 
                search_users(query, filters) + 
                search_tasks(query, filters) + 
                search_events(query, filters) + 
                search_posts(query, filters)
    end

    results
  end

  def search_pets(query, filters = {})
    return [] unless @organization
    
    pets = @organization.pets.includes(:species, :unit, :location, :owner)
    
    if query.present?
      pets = pets.where(
        "pets.name ILIKE ? OR pets.description ILIKE ? OR pets.breed::text ILIKE ? OR pets.color::text ILIKE ?",
        "%#{query}%", "%#{query}%", "%#{query}%", "%#{query}%"
      )
    end

    # Apply filters
    pets = pets.where(status: filters[:status]) if filters[:status].present?
    pets = pets.where(sex: filters[:sex]) if filters[:sex].present?
    pets = pets.where(size: filters[:size]) if filters[:size].present?
    pets = pets.joins(:species).where(organization_fields: { value: filters[:species] }) if filters[:species].present?

    pets.order(updated_at: :desc)
  end

  def search_users(query, filters = {})
    return [] unless @organization
    
    users = User.joins(:organizations).where(organizations: { id: @organization.id })
    
    if query.present?
      users = users.where(
        "users.first_name ILIKE ? OR users.last_name ILIKE ? OR users.email ILIKE ?",
        "%#{query}%", "%#{query}%", "%#{query}%"
      )
    end

    # Apply filters
    users = users.where(role: filters[:role]) if filters[:role].present?

    users.order(updated_at: :desc)
  end

  def search_tasks(query, filters = {})
    return [] unless @organization
    
    tasks = Task.joins(pet: :organization).where(organizations: { id: @organization.id }).includes(:pet)
    
    if query.present?
      tasks = tasks.where(
        "tasks.subject ILIKE ? OR tasks.description ILIKE ?",
        "%#{query}%", "%#{query}%"
      )
    end

    # Apply filters
    tasks = tasks.where(status: filters[:status]) if filters[:status].present?

    tasks.order(updated_at: :desc)
  end

  def search_events(query, filters = {})
    return [] unless @organization
    
    events = @organization.events.includes(:organizer, :calendar)
    
    if query.present?
      events = events.where(
        "events.title ILIKE ? OR events.description ILIKE ?",
        "%#{query}%", "%#{query}%"
      )
    end

    # Apply filters
    events = events.where(event_type: filters[:event_type]) if filters[:event_type].present?
    events = events.where(status: filters[:status]) if filters[:status].present?
    events = events.where(priority: filters[:priority]) if filters[:priority].present?

    events.order(updated_at: :desc)
  end

  def search_posts(query, filters = {})
    return [] unless @organization
    
    posts = @organization.posts.includes(:user, :pet)
    
    if query.present?
      posts = posts.where("posts.body ILIKE ?", "%#{query}%")
    end

    # Apply filters
    posts = posts.where(user_id: filters[:user_id]) if filters[:user_id].present?

    posts.order(updated_at: :desc)
  end
end 