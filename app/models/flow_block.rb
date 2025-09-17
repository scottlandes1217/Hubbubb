class FlowBlock < ApplicationRecord
  belongs_to :flow
  
  validates :block_type, presence: true, inclusion: { 
    in: %w[trigger screen decision create_record update_record delete_record assignment loop wait email notification api_call] 
  }
  validates :name, presence: true
  validates :position_x, presence: true, numericality: { only_integer: true }
  validates :position_y, presence: true, numericality: { only_integer: true }
  
  # Store block-specific configuration as JSON
  serialize :config_data, coder: JSON
  
  # Block type categories
  def self.trigger_blocks
    %w[trigger]
  end
  
  def self.input_blocks
    %w[screen]
  end
  
  def self.logic_blocks
    %w[decision assignment loop]
  end
  
  def self.data_blocks
    %w[create_record update_record delete_record]
  end
  
  def self.action_blocks
    %w[email notification api_call wait]
  end
  
  def trigger_block?
    self.class.trigger_blocks.include?(block_type)
  end
  
  def input_block?
    self.class.input_blocks.include?(block_type)
  end
  
  def logic_block?
    self.class.logic_blocks.include?(block_type)
  end
  
  def data_block?
    self.class.data_blocks.include?(block_type)
  end
  
  def action_block?
    self.class.action_blocks.include?(block_type)
  end
  
  def screen_block?
    block_type == 'screen'
  end
  
  def decision_block?
    block_type == 'decision'
  end
  
  def create_record_block?
    block_type == 'create_record'
  end
  
  def update_record_block?
    block_type == 'update_record'
  end
  
  def delete_record_block?
    block_type == 'delete_record'
  end
end 