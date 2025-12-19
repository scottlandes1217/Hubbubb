class ListViewsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_organization
  before_action :set_list_view, only: [:show, :edit, :update, :destroy]
  
  def index
    @object_type = params[:object_type]
    @object_id = params[:object_id]
    
    @list_views = @organization.list_views
      .for_object_type(@object_type, @object_id)
      .public_or_user(current_user)
      .order(:name)
    
    respond_to do |format|
      format.html
      format.json do
        render json: {
          views: @list_views.map do |view|
            {
              id: view.id,
              name: view.name,
              is_default: view.is_default,
              is_public: view.is_public
            }
          end
        }
      end
    end
  end
  
  def show
    redirect_to edit_list_view_path(@organization, @list_view)
  end
  
  def new
    @list_view = @organization.list_views.build(
      object_type: params[:object_type],
      object_id: params[:object_id],
      user: current_user,
      columns: [],
      filters: {},
      sort_direction: 'asc'
    )
    @available_columns = ListView.available_columns_for(
      @list_view.object_type,
      @organization,
      @list_view.object_id
    )
  end
  
  def create
    @list_view = @organization.list_views.build(list_view_params)
    @list_view.user = current_user unless params[:list_view][:is_public] == 'true'
    
    # Ensure only one default view per object type
    if @list_view.is_default?
      @organization.list_views
        .for_object_type(@list_view.object_type, @list_view.object_id)
        .where.not(id: @list_view.id)
        .update_all(is_default: false)
    end
    
    if @list_view.save
      redirect_to list_views_path(@organization, object_type: @list_view.object_type, object_id: @list_view.object_id),
                  notice: 'List view was successfully created.'
    else
      @available_columns = ListView.available_columns_for(
        @list_view.object_type,
        @organization,
        @list_view.object_id
      )
      render :new, status: :unprocessable_entity
    end
  end
  
  def edit
    @available_columns = ListView.available_columns_for(
      @list_view.object_type,
      @organization,
      @list_view.object_id
    )
  end
  
  def update
    # Ensure only one default view per object type
    if list_view_params[:is_default] == 'true' || list_view_params[:is_default] == true
      @organization.list_views
        .for_object_type(@list_view.object_type, @list_view.object_id)
        .where.not(id: @list_view.id)
        .update_all(is_default: false)
    end
    
    if @list_view.update(list_view_params)
      redirect_to list_views_path(@organization, object_type: @list_view.object_type, object_id: @list_view.object_id),
                  notice: 'List view was successfully updated.'
    else
      @available_columns = ListView.available_columns_for(
        @list_view.object_type,
        @organization,
        @list_view.object_id
      )
      render :edit, status: :unprocessable_entity
    end
  end
  
  def destroy
    @list_view.destroy
    redirect_to list_views_path(@organization, object_type: @list_view.object_type, object_id: @list_view.object_id),
                notice: 'List view was successfully deleted.'
  end
  
  private
  
  def set_organization
    @organization = Organization.find(params[:organization_id])
  end
  
  def set_list_view
    @list_view = @organization.list_views.find(params[:id])
    unless @list_view.is_public? || @list_view.user == current_user
      redirect_to root_path, alert: 'Not authorized to access this list view.'
    end
  end
  
  def list_view_params
    permitted = params.require(:list_view).permit(
      :name,
      :object_type,
      :object_id,
      :sort_by,
      :sort_direction,
      :is_default,
      :is_public,
      columns: [],
      filters: {}
    )
    
    # Convert filters hash to array format
    if params[:list_view][:filters].is_a?(Hash)
      filters_array = []
      params[:list_view][:filters].each do |key, filter|
        next unless filter.is_a?(Hash) && filter['field'].present?
        filters_array << {
          'field' => filter['field'],
          'operator' => filter['operator'],
          'value' => filter['value']
        }
      end
      permitted[:filters] = filters_array
    end
    
    # Ensure columns is an array
    permitted[:columns] = Array(permitted[:columns]).reject(&:blank?)
    
    permitted
  end
end

