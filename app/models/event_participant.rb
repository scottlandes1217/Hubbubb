class EventParticipant < ApplicationRecord
  belongs_to :event
  belongs_to :user

  validates :event_id, uniqueness: { scope: :user_id, message: "User is already a participant" }
  validates :role, presence: true, inclusion: { in: %w[attendee organizer assistant] }
  validates :status, presence: true, inclusion: { in: %w[pending accepted declined tentative] }
  validates :response, presence: true, inclusion: { in: %w[no_response accepted declined tentative] }

  scope :accepted, -> { where(status: 'accepted') }
  scope :pending, -> { where(status: 'pending') }
  scope :declined, -> { where(status: 'declined') }
  scope :tentative, -> { where(status: 'tentative') }

  def accept!
    update(status: 'accepted', response: 'accepted')
  end

  def decline!
    update(status: 'declined', response: 'declined')
  end

  def tentative!
    update(status: 'tentative', response: 'tentative')
  end

  def responded?
    response != 'no_response'
  end
end 