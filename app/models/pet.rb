class Pet < ApplicationRecord
  # Associations
  belongs_to :organization
  belongs_to :owner, class_name: 'User', optional: true
  has_one_attached :photo
  has_many :posts, dependent: :destroy
  has_many_attached :gallery_photos
  has_many :tasks, dependent: :destroy


  belongs_to :mother, class_name: "Pet", optional: true
  belongs_to :father, class_name: "Pet", optional: true

  # Attribute types
  attribute :status, :string
  attribute :flags, :json, default: []

  # Validations
  validates :name, presence: true
  validates :weight_lbs, :weight_oz, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  # validates :species, presence: true
  # validates :breed, presence: true
  # validates :age, presence: true, numericality: { greater_than_or_equal_to: 0 }
  # validates :description, presence: true
  # validates :status, presence: true

  # Ensure breed, color, and flags are always arrays
  def breed
    super || []
  end

  def color
    super || []
  end

  def flags
    super || []
  end

  # Get breed names from breed values
  def breed_names
    return [] if breed.blank?
    
    # Breed now stores string values directly, not IDs
    breed.map(&:titleize)
  end

  # Get color names from color IDs
  def color_names
    return [] if color.blank?
    
    # Color stores string values directly, not IDs
    color.map(&:titleize)
  end

  # Enums
  enum sex: { male: 0, female: 1, unknown: 2 }
  enum coat_type: { rough: 0, short: 1, long: 2, hairless: 3, corded: 4, curly: 5 }
  enum size: { small: 0, medium: 1, large: 2, x_large: 3 }
  enum status: {
    available: 'available',
    adopted: 'adopted',
    pending: 'pending',
    unavailable: 'unavailable'
  }

  # Age calculation
  def age
    return unless date_of_birth

    today = Date.today
    years = today.year - date_of_birth.year
    years -= 1 if today < date_of_birth + years.years # Adjust for incomplete years
    years
  end

  # Weight helpers
  def formatted_weight
    "#{weight_lbs || 0} lbs #{weight_oz || 0} oz"
  end

  def total_weight_in_lbs
    (weight_lbs || 0) + (weight_oz.to_f / 16)
  end
end