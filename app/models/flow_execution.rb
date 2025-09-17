class FlowExecution < ApplicationRecord
  belongs_to :flow
  belongs_to :user, optional: true
  
  validates :status, presence: true, inclusion: { in: %w[pending running completed failed cancelled] }
  validates :execution_type, presence: true, inclusion: { in: %w[manual scheduled trigger] }
  
  # Store execution data and results as JSON
  serialize :input_data, JSON
  serialize :output_data, JSON
  serialize :error_data, JSON
  
  scope :recent, -> { order(created_at: :desc).limit(50) }
  scope :completed, -> { where(status: 'completed') }
  scope :failed, -> { where(status: 'failed') }
  scope :running, -> { where(status: 'running') }
  
  def pending?
    status == 'pending'
  end
  
  def running?
    status == 'running'
  end
  
  def completed?
    status == 'completed'
  end
  
  def failed?
    status == 'failed'
  end
  
  def cancelled?
    status == 'cancelled'
  end
  
  def manual?
    execution_type == 'manual'
  end
  
  def scheduled?
    execution_type == 'scheduled'
  end
  
  def trigger?
    execution_type == 'trigger'
  end
  
  def duration
    return nil unless completed_at
    completed_at - started_at
  end
end 