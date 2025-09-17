class OrganizationTasksController < ApplicationController
  before_action :set_organization
  before_action :set_task, only: %i[show edit update destroy]

  def index
    @query = params[:query]
    base_tasks = @organization.tasks.includes(:pet)
    
    if @query.present?
      @tasks = base_tasks.where("tasks.subject ILIKE :query OR tasks.description ILIKE :query OR pets.name ILIKE :query", query: "%#{@query}%")
    else
      @tasks = base_tasks
    end
    
    @tasks = @tasks.order('tasks.created_at DESC').page(params[:page]).per(20)
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
    params.require(:task).permit(
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
  end
end 