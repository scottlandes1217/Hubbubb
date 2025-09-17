class CustomRecordsController < ApplicationController
  before_action :set_organization
  before_action :set_custom_object
  before_action :set_custom_record, only: [:show, :edit, :update, :destroy]

  def index
    @custom_records = @custom_object.custom_records.includes(:custom_field_values).order(:name)
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
      
      redirect_to organization_objects_path(@organization), 
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
      
      redirect_to organization_objects_path(@organization), 
                  notice: 'Record was successfully updated.'
    else
      @custom_fields = @custom_object.custom_fields.active.visible.order(:name)
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @custom_record.destroy
    redirect_to organization_objects_path(@organization), 
                notice: 'Record was successfully deleted.'
  end

  private

  def set_organization
    @organization = Organization.find(params[:organization_id])
  end

  def set_custom_object
    @custom_object = @organization.custom_objects.find(params[:custom_object_id])
  end

  def set_custom_record
    @custom_record = @custom_object.custom_records.find(params[:id])
  end

  def custom_record_params
    params.require(:custom_record).permit(:name, :external_id, :description)
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