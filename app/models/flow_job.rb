class FlowJob < ApplicationRecord
  belongs_to :flow
  belongs_to :organization
  belongs_to :trigger_record, polymorphic: true, optional: true
  
  validates :status, presence: true, inclusion: { in: %w[pending queued running completed failed cancelled] }
  validates :organization_id, presence: true
  
  serialize :trigger_data, coder: JSON
  
  scope :recent, -> { order(created_at: :desc) }
  scope :pending, -> { where(status: 'pending') }
  scope :queued, -> { where(status: 'queued') }
  scope :running, -> { where(status: 'running') }
  scope :completed, -> { where(status: 'completed') }
  scope :failed, -> { where(status: 'failed') }
  scope :by_organization, ->(org) { where(organization: org) }
  
  def pending?
    status == 'pending'
  end
  
  def queued?
    status == 'queued'
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
  
  def duration
    return nil unless started_at && completed_at
    completed_at - started_at
  end
  
  def mark_as_queued!(job_id)
    update!(status: 'queued', job_id: job_id)
  end
  
  def mark_as_running!
    update!(status: 'running', started_at: Time.current)
  end
  
  def mark_as_completed!
    update!(status: 'completed', completed_at: Time.current)
  end
  
  def mark_as_failed!(error_message)
    update!(
      status: 'failed',
      error_message: error_message,
      completed_at: Time.current
    )
  end
  
  def increment_retry!
    update!(retry_count: retry_count + 1)
  end
end

