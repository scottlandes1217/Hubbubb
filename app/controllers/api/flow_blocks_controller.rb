class Api::FlowBlocksController < ApplicationController
  before_action :authenticate_user!
  before_action :set_organization
  before_action :set_flow
  before_action :set_block, only: [:show, :update, :destroy]
  before_action :ensure_user_belongs_to_organization
  skip_before_action :verify_authenticity_token, only: [:create, :update, :destroy]

  def index
    @blocks = @flow.flow_blocks.order(:position_y, :position_x)
    Rails.logger.info "Found #{@blocks.count} blocks for flow #{@flow.id}"
    @blocks.each do |block|
      Rails.logger.info "Block: #{block.inspect}"
    end
    render json: @blocks.map { |block| block_json(block) }
  end

  def show
    render json: block_json(@block)
  end

  def create
    @block = @flow.flow_blocks.build(block_params)
    
    if @block.save
      render json: block_json(@block), status: :created
    else
      render json: { errors: @block.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @block.update(block_params)
      render json: block_json(@block)
    else
      render json: { errors: @block.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @block.destroy
    render json: { message: 'Block deleted successfully' }
  end

  def reorder
    params[:blocks].each_with_index do |block_id, index|
      block = @flow.flow_blocks.find(block_id)
      block.update(position_x: index * 200, position_y: 100)
    end
    render json: { message: 'Blocks reordered successfully' }
  end

  private

  def set_organization
    @organization = Organization.find(params[:organization_id])
  end

  def ensure_user_belongs_to_organization
    # Admins have access to all organizations
    return if current_user.admin?
    
    # Check if user belongs to the current organization
    unless current_user.organizations.include?(@organization)
      redirect_to root_path, alert: 'Access denied.'
    end
  end

  def set_flow
    # Find the flow within the current organization context
    @flow = @organization.flows.find(params[:flow_id])
  end

  def set_block
    @block = @flow.flow_blocks.find(params[:id])
  end

  def block_params
    params.require(:flow_block).permit(:block_type, :name, :position_x, :position_y, config_data: {})
  end

  def block_json(block)
    {
      id: block.id,
      block_type: block.block_type,
      name: block.name,
      position_x: block.position_x,
      position_y: block.position_y,
      config_data: block.config_data,
      created_at: block.created_at,
      updated_at: block.updated_at
    }
  end
end 