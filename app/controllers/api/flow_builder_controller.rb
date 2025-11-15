class Api::FlowBuilderController < ApplicationController
  before_action :authenticate_user!
  before_action :set_organization
  before_action :set_flow
  before_action :ensure_user_belongs_to_organization
  skip_before_action :verify_authenticity_token, only: [:objects, :fields]

  # GET /organizations/:organization_id/flows/:flow_id/objects
  # Returns list of available objects (standard + custom) for flow builder
  def objects
    objects = []
    
    # Standard object api_names - these will be extended with custom fields
    standard_object_api_names = ['pets', 'tasks', 'events']
    
    # Add standard objects
    objects << {
      id: 'pets',
      api_name: 'pets',
      name: 'Pets',
      type: 'standard',
      display_name: 'Pet',
      icon: 'fas fa-paw'
    }
    
    objects << {
      id: 'tasks',
      api_name: 'tasks',
      name: 'Tasks',
      type: 'standard',
      display_name: 'Task',
      icon: 'fas fa-tasks'
    }
    
    objects << {
      id: 'events',
      api_name: 'events',
      name: 'Events',
      type: 'standard',
      display_name: 'Event',
      icon: 'fas fa-calendar'
    }
    
    # Add custom objects (excluding those that match standard object api_names)
    # Standard objects (pets, tasks, events) are extended with custom fields
    # but should only appear once in the list
    @organization.custom_objects.active.each do |custom_obj|
      # Skip custom objects that match standard object api_names
      # These are used for custom fields on standard objects, not separate objects
      next if standard_object_api_names.include?(custom_obj.api_name)
      
      objects << {
        id: custom_obj.id.to_s,
        api_name: custom_obj.api_name,
        name: custom_obj.name,
        type: 'custom',
        display_name: custom_obj.name,
        icon: custom_obj.font_awesome_icon || 'fas fa-database'
      }
    end
    
    render json: { objects: objects }
  end

  # GET /organizations/:organization_id/flows/:flow_id/fields?object_api_name=pets
  # Returns list of fields for a given object
  def fields
    object_api_name = params[:object_api_name]
    return render json: { error: 'object_api_name parameter required' }, status: :bad_request unless object_api_name
    
    fields = []
    
    # Check if it's a standard object
    if ['pets', 'tasks', 'events'].include?(object_api_name)
      fields = get_standard_object_fields(object_api_name)
    else
      # It's a custom object
      custom_object = @organization.custom_objects.find_by(api_name: object_api_name)
      return render json: { error: 'Object not found' }, status: :not_found unless custom_object
      
      fields = get_custom_object_fields(custom_object)
    end
    
    render json: { fields: fields }
  end

  private

  def set_organization
    @organization = Organization.find(params[:organization_id])
  end

  def set_flow
    @flow = @organization.flows.find(params[:id])
  end

  def ensure_user_belongs_to_organization
    return if current_user.admin?
    unless current_user.organizations.include?(@organization)
      render json: { error: 'Access denied' }, status: :forbidden
    end
  end

  def get_standard_object_fields(object_api_name)
    fields = []
    
    case object_api_name
    when 'pets'
      # Pet model fields
      fields = [
        { api_name: 'name', name: 'Name', type: 'text', required: true },
        { api_name: 'status', name: 'Status', type: 'picklist', required: false },
        { api_name: 'species', name: 'Species', type: 'picklist', required: false },
        { api_name: 'breed', name: 'Breed', type: 'multipicklist', required: false },
        { api_name: 'color', name: 'Color', type: 'multipicklist', required: false },
        { api_name: 'sex', name: 'Sex', type: 'picklist', required: false },
        { api_name: 'date_of_birth', name: 'Date of Birth', type: 'date', required: false },
        { api_name: 'weight_lbs', name: 'Weight (lbs)', type: 'number', required: false },
        { api_name: 'weight_oz', name: 'Weight (oz)', type: 'number', required: false },
        { api_name: 'location', name: 'Location', type: 'picklist', required: false },
        { api_name: 'description', name: 'Description', type: 'textarea', required: false },
        { api_name: 'coat_type', name: 'Coat Type', type: 'picklist', required: false },
        { api_name: 'entered_shelter', name: 'Entered Shelter', type: 'date', required: false },
        { api_name: 'left_shelter', name: 'Left Shelter', type: 'date', required: false },
        { api_name: 'microchip', name: 'Microchip', type: 'text', required: false }
      ]
      
      # Add organization-specific custom fields for pets
      custom_object = @organization.custom_objects.find_by(api_name: 'pets')
      if custom_object
        custom_object.custom_fields.active.visible.each do |cf|
          fields << {
            api_name: cf.api_name,
            name: cf.display_name,
            type: cf.field_type,
            required: cf.required,
            picklist_values: cf.picklist_values
          }
        end
      end
      
    when 'tasks'
      # Task model fields
      fields = [
        { api_name: 'title', name: 'Title', type: 'text', required: true },
        { api_name: 'description', name: 'Description', type: 'textarea', required: false },
        { api_name: 'status', name: 'Status', type: 'picklist', required: false },
        { api_name: 'due_date', name: 'Due Date', type: 'date', required: false },
        { api_name: 'priority', name: 'Priority', type: 'picklist', required: false }
      ]
      
      # Add organization-specific custom fields for tasks
      custom_object = @organization.custom_objects.find_by(api_name: 'tasks')
      if custom_object
        custom_object.custom_fields.active.visible.each do |cf|
          fields << {
            api_name: cf.api_name,
            name: cf.display_name,
            type: cf.field_type,
            required: cf.required,
            picklist_values: cf.picklist_values
          }
        end
      end
      
    when 'events'
      # Event model fields
      fields = [
        { api_name: 'title', name: 'Title', type: 'text', required: true },
        { api_name: 'description', name: 'Description', type: 'textarea', required: false },
        { api_name: 'start_time', name: 'Start Time', type: 'datetime', required: true },
        { api_name: 'end_time', name: 'End Time', type: 'datetime', required: false },
        { api_name: 'location', name: 'Location', type: 'text', required: false }
      ]
      
      # Add organization-specific custom fields for events
      custom_object = @organization.custom_objects.find_by(api_name: 'events')
      if custom_object
        custom_object.custom_fields.active.visible.each do |cf|
          fields << {
            api_name: cf.api_name,
            name: cf.display_name,
            type: cf.field_type,
            required: cf.required,
            picklist_values: cf.picklist_values
          }
        end
      end
    end
    
    fields
  end

  def get_custom_object_fields(custom_object)
    fields = [
      { api_name: 'name', name: 'Name', type: 'text', required: true }
    ]
    
    custom_object.custom_fields.active.visible.order(:name).each do |cf|
      fields << {
        api_name: cf.api_name,
        name: cf.display_name,
        type: cf.field_type,
        required: cf.required,
        picklist_values: cf.picklist_values
      }
    end
    
    fields
  end
end

