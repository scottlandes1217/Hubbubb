class ObjectsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_organization

  def index
    @query = params[:query]
    
    # Get all custom objects and convert them to the same format as built-in objects
    # Filter out custom objects that correspond to built-in objects to avoid duplicates
    built_in_api_names = ['pets', 'tasks', 'events']
    @custom_objects = @organization.custom_objects.order(:name)
      .where.not(api_name: built_in_api_names)
      .map do |obj|
        OpenStruct.new(
                      id: obj.id,
            name: obj.api_name,
            display_name: obj.name,
          description: obj.description,
          type: 'custom',
          record_count: obj.custom_records.count,
          has_custom_fields: true,
          custom_object: obj,
          api_name: obj.api_name,
          path: organization_custom_object_path(@organization, obj),
          view_path: organization_custom_object_path(@organization, obj),
          icon: obj.font_awesome_icon? ? obj.font_awesome_icon : 'fas fa-database',
          in_navigation: obj.add_to_navigation?
        )
      end
    
    # Define built-in objects
    @built_in_objects = get_built_in_objects
    
    # Combine all objects
    @all_objects = @custom_objects + @built_in_objects
    
    # Apply search filter if query present
    if @query.present?
      @all_objects = @all_objects.select do |object|
        object.name.downcase.include?(@query.downcase) ||
        object.name.downcase.include?(@query.downcase) ||
        (object.respond_to?(:description) && object.description&.downcase&.include?(@query.downcase))
      end
    end
  end

  private

  def set_organization
    @organization = Organization.find(params[:organization_id])
  end

  def get_built_in_objects
    # Define built-in objects (pets, tasks, events)
    [
      {
        id: 'pets',
        name: 'Pets',
        description: 'Built-in object for managing pets',
        type: 'built_in',
        record_count: @organization.pets.count,
        has_custom_fields: true,
        custom_object_id: 'pets',
        path: organization_pets_path(@organization),
        view_path: organization_pets_path(@organization),
        icon: 'fas fa-paw'
      },
      {
        id: 'tasks',
        name: 'Tasks',
        description: 'Built-in object for managing tasks',
        type: 'built_in',
        record_count: @organization.tasks.count,
        has_custom_fields: true,
        custom_object_id: 'tasks',
        path: organization_tasks_path(@organization),
        view_path: organization_tasks_path(@organization),
        icon: 'fas fa-tasks'
      },
      {
        id: 'events',
        name: 'Events',
        description: 'Built-in object for managing events',
        type: 'built_in',
        record_count: Event.where(organization: @organization).count,
        has_custom_fields: true,
        custom_object_id: 'events',
        path: organization_events_path(@organization),
        view_path: organization_events_path(@organization),
        icon: 'fas fa-calendar'
      }
    ].map do |obj|
      # Ensure the custom object exists for built-in types
      ensure_built_in_custom_object_exists(obj[:custom_object_id])
      
      # Update the object with the actual custom object for view_path
      custom_object = @organization.custom_objects.find_by(api_name: obj[:custom_object_id])
      obj[:view_path] = organization_custom_object_path(@organization, custom_object) if custom_object
      
      OpenStruct.new(obj)
    end
  end

  def ensure_built_in_custom_object_exists(object_type)
    # Create the built-in custom object if it doesn't exist
    object_config = case object_type
    when 'pets'
      {
        name: 'Pets',
        api_name: 'pets',
        description: 'Built-in object for managing pets',
        icon_type: 'font_awesome',
        font_awesome_icon: 'fas fa-paw',
        add_to_navigation: false
      }
    when 'tasks'
      {
        name: 'Tasks',
        api_name: 'tasks',
        description: 'Built-in object for managing tasks',
        icon_type: 'font_awesome',
        font_awesome_icon: 'fas fa-tasks',
        add_to_navigation: false
      }
    when 'events'
      {
        name: 'Events',
        api_name: 'events',
        description: 'Built-in object for managing events',
        icon_type: 'font_awesome',
        font_awesome_icon: 'fas fa-calendar',
        add_to_navigation: false
      }
    end

    @organization.custom_objects.find_or_create_by(api_name: object_config[:api_name]) do |obj|
      obj.assign_attributes(object_config)
    end
  end
end 