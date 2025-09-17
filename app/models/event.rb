class Event < ApplicationRecord
  belongs_to :organizer, class_name: 'User'
  belongs_to :calendar
  belongs_to :organization
  has_many :event_participants, dependent: :destroy
  has_many :participants, through: :event_participants, source: :user
  has_many :event_tasks, dependent: :destroy
  has_many :tasks, through: :event_tasks

  validates :title, presence: true
  validates :start_time, presence: true
  validates :end_time, presence: true
  validates :calendar, presence: true
  validates :organization, presence: true
  validate :end_time_after_start_time
  validate :start_time_in_future_for_scheduled_events

  enum status: {
    scheduled: 'scheduled',
    in_progress: 'in_progress',
    completed: 'completed',
    cancelled: 'cancelled'
  }

  enum priority: {
    low: 'low',
    medium: 'medium',
    high: 'high',
    urgent: 'urgent'
  }

  enum event_type: {
    general: 'general',
    meeting: 'meeting',
    appointment: 'appointment',
    training: 'training',
    maintenance: 'maintenance',
    adoption: 'adoption',
    medical: 'medical',
    grooming: 'grooming',
    exercise: 'exercise',
    feeding: 'feeding'
  }

  scope :upcoming, -> { where('start_time >= ?', Time.current).order(:start_time) }
  scope :past, -> { where('end_time < ?', Time.current).order(start_time: :desc) }
  scope :today, -> { where(start_time: Time.current.beginning_of_day..Time.current.end_of_day) }
  scope :this_week, -> { where(start_time: Time.current.beginning_of_week..Time.current.end_of_week) }
  scope :this_month, -> { where(start_time: Time.current.beginning_of_month..Time.current.end_of_month) }

  before_save :set_default_end_time
  after_save :update_related_tasks, if: :saved_change_to_status?

  def duration_minutes
    return 0 unless start_time && end_time
    ((end_time - start_time) / 60).to_i
  end

  def duration_hours
    return 0 unless start_time && end_time
    ((end_time - start_time) / 3600).to_f.round(2)
  end

  def is_multi_day?
    return false unless start_time && end_time
    start_time.to_date != end_time.to_date
  end

  def is_today?
    start_time.to_date == Date.current
  end

  def is_past?
    end_time < Time.current
  end

  def is_future?
    start_time > Time.current
  end

  def is_ongoing?
    start_time <= Time.current && end_time >= Time.current
  end

  def add_participant(user, role: 'attendee')
    event_participants.find_or_create_by(user: user) do |ep|
      ep.role = role
    end
  end

  def remove_participant(user)
    event_participants.find_by(user: user)&.destroy
  end

  def participant?(user)
    event_participants.exists?(user: user)
  end

  def organizer?(user)
    organizer == user
  end

  def can_edit?(user)
    organizer?(user) || user.admin? || (user.shelter_staff? && user.organizations.include?(organization))
  end

  def can_delete?(user)
    organizer?(user) || user.admin? || (user.shelter_staff? && user.organizations.include?(organization))
  end

  def add_task(task)
    event_tasks.find_or_create_by(task: task)
  end

  def remove_task(task)
    event_tasks.find_by(task: task)&.destroy
  end

  def duplicate_events
    # Find events with the same title, start time, and organizer in the same organization
    Event.where(
      title: title,
      start_time: start_time,
      organizer: organizer,
      organization: organization
    ).where.not(id: id)
  end

  private

  def end_time_after_start_time
    return unless start_time && end_time
    if end_time <= start_time
      errors.add(:end_time, "must be after start time")
    end
  end

  def start_time_in_future_for_scheduled_events
    return unless start_time && status == 'scheduled'
    if start_time < Time.current
      errors.add(:start_time, "cannot be in the past for scheduled events")
    end
  end

  def set_default_end_time
    if start_time && !end_time
      self.end_time = start_time + 1.hour
    end
  end

  def update_related_tasks
    return unless status == 'completed'
    
    tasks.each do |task|
      task.update(status: 'Completed', completed_at: Time.current)
    end
  end
end 