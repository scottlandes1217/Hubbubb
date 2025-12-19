class OrganizationTasksController < ApplicationController
  before_action :set_organization
  before_action :set_task, only: %i[show edit update destroy]

  def index
    @query = params[:query]
    
    # Get or create default list view
    @current_view = if params[:view_id].present?
      @organization.list_views.find_by(id: params[:view_id])
    else
      @organization.list_views.for_object_type('Task').default_view.first ||
      @organization.list_views.for_object_type('Task').public_or_user(current_user).first
    end
    
    # Start with base query
    base_tasks = @organization.tasks.includes(:pet)
    
    # Apply list view filters if present
    if @current_view.present?
      base_tasks = @current_view.apply_filters(base_tasks)
      base_tasks = @current_view.apply_sorting(base_tasks)
    else
      base_tasks = base_tasks.order('tasks.created_at DESC')
    end
    
    # Apply search query if present
    if @query.present?
      @tasks = base_tasks.where("tasks.subject ILIKE :query OR tasks.description ILIKE :query OR pets.name ILIKE :query", query: "%#{@query}%")
    else
      @tasks = base_tasks
    end
    
    @tasks = @tasks.page(params[:page]).per(20)
    
    # Define columns for the list view
    @columns = if @current_view&.columns&.any?
      # Use columns from the view
      available_columns = ListView.available_columns_for('Task', @organization)
      available_columns.select { |col| @current_view.columns.include?(col[:api_name]) }
    else
      # Default columns
      ListView.available_columns_for('Task', @organization).select { |col| 
        ['subject', 'pet', 'status', 'start_time', 'duration_minutes', 'description'].include?(col[:api_name])
      }
    end
  end

  def new
    @task = Task.new
    @pets = @organization.pets
  end

  def show
    redirect_to edit_organization_task_path(@organization, @task)
  end

  def create
    @task = Task.new(task_params)
    @task.organization = @organization
    
    if params[:task][:pet_id].present?
      @task.pet = @organization.pets.find(params[:task][:pet_id])
    end
    
    if @task.save
      redirect_to organization_tasks_path(@organization), notice: "Task created successfully."
    else
      @pets = @organization.pets
      render :new, status: :unprocessable_entity
    end
  end

  def edit
    @pets = @organization.pets
  end

  def update
    if params[:task][:pet_id].present?
      @task.pet = @organization.pets.find(params[:task][:pet_id])
    end
    
    if @task.update(task_params)
      redirect_to organization_tasks_path(@organization), notice: "Task updated successfully."
    else
      @pets = @organization.pets
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @task.destroy
    redirect_to organization_tasks_path(@organization), notice: "Task deleted successfully."
  end

  private

  def set_organization
    @organization = Organization.find(params[:organization_id])
  end

  def set_task
    @task = @organization.tasks.find(params[:id])
    unless @task
      redirect_to organization_tasks_path(@organization), alert: "Task not found"
    end
  end

  def task_params
    permitted = params.require(:task).permit(
      :status,
      :subject,
      :description,
      :start_time,
      :completed_at,
      :duration_minutes,
      :task_type,
      :pet_id,
      flag_list: []
    )
    
    # Handle flag_list - convert string to array if needed
    if permitted[:flag_list].is_a?(String)
      permitted[:flag_list] = permitted[:flag_list].split(',').map(&:strip).reject(&:blank?)
    elsif permitted[:flag_list].is_a?(Array)
      permitted[:flag_list] = permitted[:flag_list].reject(&:blank?)
    end
    
    permitted
  end
end 