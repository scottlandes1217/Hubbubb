class CustomFieldsController < ApplicationController
  before_action :set_organization
  before_action :set_custom_object
  before_action :set_custom_field, only: [:show, :edit, :update, :destroy]

  def index
    # Redirect to the unified fields page instead of showing individual custom object fields
    redirect_to organization_organization_object_fields_path(@organization, @custom_object.api_name)
  end

  def show
  end

  def new
    @custom_field = @custom_object.custom_fields.build
  end

  def create
    @custom_field = @custom_object.custom_fields.build(custom_field_params)
    
    if @custom_field.save
      redirect_to organization_organization_object_fields_path(@organization, @custom_object.api_name), 
                  notice: 'Custom field was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    # For built-in fields, only allow updating certain attributes
    if built_in_field?(@custom_field)
      allowed_params = custom_field_params.slice(:description, :picklist_values)
      if @custom_field.update(allowed_params)
        redirect_to organization_organization_object_fields_path(@organization, @custom_object.api_name), 
                    notice: 'Built-in field was successfully updated.'
      else
        render :edit, status: :unprocessable_entity
      end
    else
      if @custom_field.update(custom_field_params)
        redirect_to organization_organization_object_fields_path(@organization, @custom_object.api_name), 
                    notice: 'Custom field was successfully updated.'
      else
        render :edit, status: :unprocessable_entity
      end
    end
  end

  def destroy
    if built_in_field?(@custom_field)
      redirect_to organization_organization_object_fields_path(@organization, @custom_object.api_name), 
                  alert: 'Built-in fields cannot be deleted.'
    else
      @custom_field.destroy
      redirect_to organization_organization_object_fields_path(@organization, @custom_object.api_name), 
                  notice: 'Custom field was successfully deleted.'
    end
  end

  private

  def set_organization
    @organization = Organization.find(params[:organization_id])
  end

  def set_custom_object
    # Check if this is a built-in object (pets, tasks, events)
    built_in_objects = ['pets', 'tasks', 'events']
    
    if built_in_objects.include?(params[:custom_object_id])
      # For built-in objects, ensure the custom object exists
      @custom_object = ensure_built_in_custom_object_exists(params[:custom_object_id])
    else
      # For regular custom objects
      @custom_object = @organization.custom_objects.find(params[:custom_object_id])
    end
  end

  def set_custom_field
    @custom_field = @custom_object.custom_fields.find(params[:id])
  end

  def custom_field_params
    params.require(:custom_field).permit(
      :name, :display_name, :api_name, :field_type, :required, :unique, 
      :active, :hidden, :read_only, :description, :formula, :lookup_table_id,
      picklist_values: []
    )
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

  def built_in_field?(custom_field)
    # Built-in fields are those that correspond to core pet/task/event attributes
    built_in_api_names = [
      'pet_species_field',
      'pet_breed_field', 
      'pet_color_field',
      'pet_flags_field',
      'pet_location_field',
      'pet_unit_field',
      'task_unit_field',
      'task_location_field'
    ]
    
    built_in_api_names.include?(custom_field.api_name)
  end
end 