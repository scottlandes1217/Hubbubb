class CalendarShare < ApplicationRecord
  belongs_to :calendar
  belongs_to :user, optional: true

  validates :permission, presence: true, inclusion: { in: %w[view edit manage] }
  validates :status, presence: true, inclusion: { in: %w[pending accepted declined] }
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }, unless: :user_id?
  validates :user_id, uniqueness: { scope: :calendar_id }, allow_nil: true
  validates :email, uniqueness: { scope: :calendar_id }, allow_nil: true

  before_create :generate_invitation_token

  enum permission: {
    view: 'view',
    edit: 'edit',
    manage: 'manage'
  }

  enum status: {
    pending: 'pending',
    accepted: 'accepted',
    declined: 'declined'
  }

  scope :pending, -> { where(status: 'pending') }
  scope :accepted, -> { where(status: 'accepted') }
  scope :declined, -> { where(status: 'declined') }

  def can_edit?
    %w[edit manage].include?(permission)
  end

  def can_manage?
    permission == 'manage'
  end

  def accepted?
    status == 'accepted'
  end

  def pending?
    status == 'pending'
  end

  def declined?
    status == 'declined'
  end

  def accept!
    update(status: 'accepted', accepted_at: Time.current)
  end

  def decline!
    update(status: 'declined')
  end

  def send_invitation_email
    # This would be implemented with a mailer
    # CalendarShareMailer.invitation(self).deliver_later
  end

  private

  def generate_invitation_token
    self.invitation_token = SecureRandom.urlsafe_base64(32)
  end
end 