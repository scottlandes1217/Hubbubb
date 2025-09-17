class CustomObjectsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_organization
  before_action :set_custom_object, only: [:show, :edit, :update, :destroy]

  def index
    redirect_to organization_objects_path(@organization)
  end

  def show
    @custom_fields = @custom_object.custom_fields.order(:name)
    @custom_records = @custom_object.custom_records.order(:created_at)
  end

  def new
    @custom_object = @organization.custom_objects.build
  end

  def create
    @custom_object = @organization.custom_objects.build(custom_object_params)
    
    if @custom_object.save
      redirect_to organization_objects_path(@organization), 
                  notice: 'Custom object was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @custom_object.update(custom_object_params)
      redirect_to organization_objects_path(@organization), 
                  notice: 'Custom object was successfully updated.'
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @custom_object.destroy
    redirect_to organization_objects_path(@organization), 
                notice: 'Custom object was successfully deleted.'
  end

  private

  def set_organization
    @organization = Organization.find(params[:organization_id])
  end

  def set_custom_object
    @custom_object = @organization.custom_objects.find(params[:id])
  end

  def custom_object_params
    params.require(:custom_object).permit(
      :name, :description, :icon_type, :font_awesome_icon, :icon, :add_to_navigation
    )
  end
end 