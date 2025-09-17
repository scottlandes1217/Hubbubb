class Calendar < ApplicationRecord
  belongs_to :organization
  belongs_to :created_by, class_name: 'User'
  has_many :events, dependent: :destroy
  has_many :calendar_shares, dependent: :destroy
  has_many :shared_users, through: :calendar_shares, source: :user

  validates :name, presence: true, uniqueness: { scope: :organization_id }
  validates :color, presence: true, format: { with: /\A#[0-9A-Fa-f]{6}\z/, message: "must be a valid hex color" }

  scope :public_calendars, -> { where(is_public: true) }
  scope :private_calendars, -> { where(is_public: false) }

  def display_name
    name
  end

  def events_for_date_range(start_date, end_date)
    events.where(start_time: start_date.beginning_of_day..end_date.end_of_day)
  end

  def events_for_date(date)
    events.where(start_time: date.beginning_of_day..date.end_of_day)
  end

  def can_edit?(user)
    user.admin? || 
    (user.shelter_staff? && user.organizations.include?(organization)) ||
    created_by == user ||
    calendar_shares.accepted.exists?(user: user, permission: ['edit', 'manage'])
  end

  def can_view?(user)
    is_public || can_edit?(user) || calendar_shares.accepted.exists?(user: user)
  end

  def can_manage?(user)
    user.admin? || 
    (user.shelter_staff? && user.organizations.include?(organization)) ||
    created_by == user ||
    calendar_shares.accepted.exists?(user: user, permission: 'manage')
  end

  def share_with_user(user, permission: 'view')
    calendar_shares.find_or_create_by(user: user) do |share|
      share.permission = permission
      share.status = 'accepted'
    end
  end

  def share_with_email(email, permission: 'view')
    calendar_shares.create!(
      email: email,
      permission: permission,
      status: 'pending'
    )
  end

  def remove_share(user_or_email)
    if user_or_email.is_a?(User)
      calendar_shares.find_by(user: user_or_email)&.destroy
    else
      calendar_shares.find_by(email: user_or_email)&.destroy
    end
  end

  def system_calendar?
    name == organization.name || (name == 'Personal' && created_by.present?)
  end

  def custom_calendar?
    !system_calendar?
  end
end 