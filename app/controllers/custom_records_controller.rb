class CustomRecordsController < ApplicationController
  before_action :set_organization
  before_action :set_custom_object
  before_action :set_custom_record, only: [:show, :edit, :update, :destroy]

  def index
    # Get or create default list view
    @current_view = if params[:view_id].present?
      @organization.list_views.find_by(id: params[:view_id])
    else
      @organization.list_views.for_object_type('CustomObject', @custom_object.id).default_view.first ||
      @organization.list_views.for_object_type('CustomObject', @custom_object.id).public_or_user(current_user).first
    end
    
    # Start with base query
    @custom_records = @custom_object.custom_records.includes(:custom_field_values)
    
    # Apply list view filters if present
    if @current_view.present?
      @custom_records = @current_view.apply_filters(@custom_records)
      @custom_records = @current_view.apply_sorting(@custom_records)
    else
      @custom_records = @custom_records.order(:name)
    end
    
    @custom_records = @custom_records.page(params[:page]).per(20)
    
    # Define columns for the list view
    @columns = if @current_view&.columns&.any?
      # Use columns from the view
      available_columns = ListView.available_columns_for('CustomObject', @organization, @custom_object.id)
      available_columns.select { |col| @current_view.columns.include?(col[:api_name]) }
    else
      # Default columns
      ListView.available_columns_for('CustomObject', @organization, @custom_object.id).select { |col| 
        ['name', 'created_at'].include?(col[:api_name])
      }
    end
  end

  def show
    @custom_fields = @custom_object.custom_fields.active.visible.order(:name)
    @record_layout = RecordLayout.find_by(organization: @organization, table_type: 'CustomObject', table_id: @custom_object.id)
  end

  def new
    @custom_record = @custom_object.custom_records.build
    @custom_fields = @custom_object.custom_fields.active.visible.order(:name)
  end

  def create
    @custom_record = @custom_object.custom_records.build(custom_record_params)
    
    if @custom_record.save
      # Set field values
      set_field_values
      
      # Redirect to the index page using api_name
      redirect_to "/organizations/#{@organization.id}/#{@custom_object.api_name}", 
                  notice: 'Record was successfully created.'
    else
      @custom_fields = @custom_object.custom_fields.active.visible.order(:name)
      render :new, status: :unprocessable_entity
    end
  end

  def edit
    @custom_fields = @custom_object.custom_fields.active.visible.order(:name)
  end

  def update
    if @custom_record.update(custom_record_params)
      # Update field values
      update_field_values
      
      # Redirect to the show page using api_name and external_id
      redirect_to "/organizations/#{@organization.id}/#{@custom_object.api_name}/#{@custom_record.external_id}", 
                  notice: 'Record was successfully updated.'
    else
      @custom_fields = @custom_object.custom_fields.active.visible.order(:name)
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @custom_record.destroy
    # Redirect to the index page using api_name
    redirect_to "/organizations/#{@organization.id}/#{@custom_object.api_name}", 
                notice: 'Record was successfully deleted.'
  end

  private

  def set_organization
    @organization = Organization.find(params[:organization_id])
  end

  def set_custom_object
    # Support both api_name (new routes) and custom_object_id (old routes)
    if params[:api_name].present?
      @custom_object = @organization.custom_objects.find_by!(api_name: params[:api_name])
    else
      @custom_object = @organization.custom_objects.find(params[:custom_object_id])
    end
  end

  def set_custom_record
    # Find by external_id instead of internal id
    @custom_record = @custom_object.custom_records.find_by!(external_id: params[:external_id] || params[:id])
  end

  def custom_record_params
    params.require(:custom_record).permit(:name)
  end

  def set_field_values
    return unless params[:field_values]

    params[:field_values].each do |field_api_name, value|
      @custom_record.set_field_value(field_api_name, value)
    end
  end

  def update_field_values
    return unless params[:field_values]

    params[:field_values].each do |field_api_name, value|
      @custom_record.set_field_value(field_api_name, value)
    end
  end
end 