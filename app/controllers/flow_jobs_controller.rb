class FlowJobsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_organization
  before_action :ensure_user_belongs_to_organization

  def index
    @flow_jobs = @organization.flow_jobs
                              .includes(:flow, :trigger_record)
                              .recent
                              .page(params[:page]).per(50)
    
    # Filter by status if provided
    @flow_jobs = @flow_jobs.where(status: params[:status]) if params[:status].present?
    
    # Filter by flow if provided
    @flow_jobs = @flow_jobs.where(flow_id: params[:flow_id]) if params[:flow_id].present?
  end

  def show
    @flow_job = @organization.flow_jobs.find(params[:id])
    @flow_execution = @flow_job.flow.flow_executions
                                .where(execution_type: 'trigger')
                                .where("input_data->>'trigger_record_id' = ?", @flow_job.trigger_record_id.to_s)
                                .order(created_at: :desc)
                                .first
  end

  private

  def set_organization
    @organization = Organization.find(params[:organization_id])
  end

  def ensure_user_belongs_to_organization
    return if current_user.admin?
    
    unless current_user.organizations.include?(@organization)
      redirect_to root_path, alert: 'Access denied.'
    end
  end
end

