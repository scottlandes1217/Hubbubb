class CustomObject < ApplicationRecord
  belongs_to :organization
  has_many :custom_fields, dependent: :destroy
  has_many :custom_records, dependent: :destroy

  # Active Storage for icon uploads
  has_one_attached :icon

  validates :name, presence: true, uniqueness: { scope: :organization_id }
  validates :api_name, presence: true, uniqueness: { scope: :organization_id }
  validates :icon_type, inclusion: { in: %w[font_awesome uploaded] }
  validates :font_awesome_icon, presence: true, if: :font_awesome_icon?
  validates :icon, presence: true, if: :uploaded_icon?
  validates :add_to_navigation, inclusion: { in: [true, false] }
  
  before_validation :generate_api_name, if: :name_changed?
  before_validation :ensure_api_name_format

  scope :active, -> { where(active: true) }
  scope :in_navigation, -> { where(add_to_navigation: true) }

  def font_awesome_icon?
    icon_type == 'font_awesome'
  end

  def uploaded_icon?
    icon_type == 'uploaded'
  end

  def display_icon
    if font_awesome_icon?
      font_awesome_icon
    elsif uploaded_icon? && icon.attached?
      icon
    else
      'fas fa-database' # fallback
    end
  end

  private

  def generate_api_name
    return if api_name.present?
    
    base_name = name.parameterize.underscore
    counter = 1
    new_api_name = base_name
    
    while self.class.where(organization: organization, api_name: new_api_name).exists?
      new_api_name = "#{base_name}_#{counter}"
      counter += 1
    end
    
    self.api_name = new_api_name
  end

  def ensure_api_name_format
    return unless api_name.present?
    
    # Ensure it starts with a letter and contains only valid characters
    self.api_name = api_name.gsub(/[^a-zA-Z0-9_]/, '_')
    self.api_name = "object_#{api_name}" unless api_name.match?(/\A[a-zA-Z]/)
  end
end 