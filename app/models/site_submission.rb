class SiteSubmission < ApplicationRecord
  belongs_to :site
  
  # Validations
  validates :data, presence: true
  validates :submitted_at, presence: true
  
  # Default values
  attribute :submitted_at, :datetime, default: -> { Time.current }
  attribute :data, :json, default: {}
  
  # Scopes
  scope :recent, -> { order(submitted_at: :desc) }
  
  # Methods
  def to_s
    "Submission for #{site.name} on #{submitted_at.strftime('%B %d, %Y at %I:%M %p')}"
  end
end
