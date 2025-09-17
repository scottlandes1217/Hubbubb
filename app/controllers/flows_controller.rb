class FlowsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_organization
  before_action :set_flow, only: [:show, :edit, :update, :destroy, :builder, :execute]
  before_action :ensure_user_belongs_to_organization

  def index
    @flows = @organization.flows.order(created_at: :desc)
  end

  def show
    @flow_blocks = @flow.flow_blocks.order(:position_y, :position_x)
    @recent_executions = @flow.flow_executions.recent.limit(10)
  end

  def new
    @flow = @organization.flows.build
  end

  def create
    @flow = @organization.flows.build(flow_params)
    
    if @flow.save
      redirect_to builder_organization_flow_path(@organization, @flow), 
                  notice: 'Flow was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    Rails.logger.info "Update params: #{params.inspect}"
    Rails.logger.info "Flow params: #{flow_params.inspect}"
    
    begin
      if @flow.update(flow_params)
        respond_to do |format|
          format.html { 
            redirect_to organization_flow_path(@organization, @flow), 
                        notice: 'Flow was successfully updated.'
          }
          format.json { 
            render json: { success: true, message: 'Flow saved successfully' }
          }
        end
      else
        Rails.logger.error "Update errors: #{@flow.errors.full_messages}"
        respond_to do |format|
          format.html { render :edit, status: :unprocessable_entity }
          format.json { 
            render json: { success: false, errors: @flow.errors.full_messages }, 
                   status: :unprocessable_entity 
          }
        end
      end
    rescue => e
      Rails.logger.error "Update exception: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      respond_to do |format|
        format.html { render :edit, status: :unprocessable_entity }
        format.json { 
          render json: { success: false, errors: [e.message] }, 
                 status: :unprocessable_entity 
        }
      end
    end
  end

  def destroy
    @flow.destroy
    redirect_to organization_flows_path(@organization), 
                notice: 'Flow was successfully deleted.'
  end

  def builder
    # This will render the visual builder interface
  end

  def execute
    execution = @flow.flow_executions.create!(
      user: current_user,
      execution_type: 'manual',
      status: 'pending'
    )
    
    # TODO: Queue the execution job
    # FlowExecutionJob.perform_later(execution.id)
    
    redirect_to organization_flow_path(@organization, @flow), 
                notice: 'Flow execution started.'
  end

  private

  def set_organization
    @organization = Organization.find(params[:organization_id])
  end

  def set_flow
    @flow = @organization.flows.find(params[:id])
  end

  def ensure_user_belongs_to_organization
    # Admins have access to all organizations
    return if current_user.admin?
    
    # Check if user belongs to the current organization
    unless current_user.organizations.include?(@organization)
      redirect_to root_path, alert: 'Access denied.'
    end
  end

  def flow_params
    # Handle JSON parameters for layout and connections data
    permitted_params = params.require(:flow).permit(:name, :status)
    
    # Handle layout_data and connections_data as JSON
    if params[:flow][:layout_data].present?
      # Convert to JSON if it's a string, otherwise use as-is
      layout_data = params[:flow][:layout_data]
      begin
        if layout_data.is_a?(String)
          permitted_params[:layout_data] = JSON.parse(layout_data)
        elsif layout_data.is_a?(Array)
          # Convert array of ActionController::Parameters to array of hashes
          permitted_params[:layout_data] = layout_data.map do |item|
            item.is_a?(ActionController::Parameters) ? item.to_unsafe_h : item
          end
        else
          # Convert ActionController::Parameters to hash
          permitted_params[:layout_data] = layout_data.to_unsafe_h
        end
      rescue JSON::ParserError => e
        Rails.logger.error "Invalid JSON in layout_data: #{e.message}"
        permitted_params[:layout_data] = []
      end
    end
    
    if params[:flow][:connections_data].present?
      # Convert to JSON if it's a string, otherwise use as-is
      connections_data = params[:flow][:connections_data]
      begin
        if connections_data.is_a?(String)
          permitted_params[:connections_data] = JSON.parse(connections_data)
        elsif connections_data.is_a?(Array)
          # Convert array of ActionController::Parameters to array of hashes
          permitted_params[:connections_data] = connections_data.map do |item|
            item.is_a?(ActionController::Parameters) ? item.to_unsafe_h : item
          end
        else
          # Convert ActionController::Parameters to hash
          permitted_params[:connections_data] = connections_data.to_unsafe_h
        end
      rescue JSON::ParserError => e
        Rails.logger.error "Invalid JSON in connections_data: #{e.message}"
        permitted_params[:connections_data] = []
      end
    end
    
    permitted_params
  end
end 