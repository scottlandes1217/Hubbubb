class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable,
         :registerable,
         :recoverable, :rememberable, :validatable,
         :trackable, :timeoutable

  # Associations
  has_many :owned_pets, class_name: 'Pet', foreign_key: 'owner_id'
  has_and_belongs_to_many :organizations
  has_many :comments, dependent: :destroy
  has_many :comment_reactions, dependent: :destroy
  has_many :organized_events, class_name: 'Event', foreign_key: 'organizer_id', dependent: :destroy
  has_many :event_participants, dependent: :destroy
  has_many :participating_events, through: :event_participants, source: :event
  has_many :created_calendars, class_name: 'Calendar', foreign_key: 'created_by_id', dependent: :destroy
  has_many :pinned_tabs, dependent: :destroy

  # Enums
  enum role: {
    basic_user: 0,
    shelter_staff: 1,
    admin: 2
  }

  enum gender: { male: 0, female: 1, non_binary: 2, prefer_not_to_say: 3 }

  # Validations
  validates :email, presence: true, uniqueness: true
  validates :first_name, presence: true
  validates :last_name, presence: true
  validates :role, presence: true
  validate :validate_organizations_based_on_role

  # Callbacks
  before_validation :set_default_role, on: :create
  geocoded_by :full_address
  after_validation :geocode, if: :should_geocode?

  # Scopes
  scope :search_by_name, ->(query) {
    where("CONCAT(first_name, ' ', last_name) ILIKE ?", "%#{query}%")
  }

  # Methods
  def full_name
    "#{first_name} #{last_name}"
  end

  def can_impersonate?(other_user)
    admin? && other_user != self
  end

  def impersonate!(target_user)
    return false unless can_impersonate?(target_user)
    # Set the impersonated_by_id on the target user to the current admin's ID
    target_user.update(impersonated_by_id: id)
  end

  def stop_impersonating!
    # Find and update any users being impersonated by this admin
    User.where(impersonated_by_id: id).update_all(impersonated_by_id: nil)
  end

  def impersonated?
    impersonated_by_id.present?
  end

  def true_user
    return nil unless impersonated?
    User.find_by(id: impersonated_by_id)
  end

  # Override Devise's authentication methods to add logging
  def self.find_for_authentication(conditions)
    Rails.logger.debug "=== Finding User for Authentication ==="
    Rails.logger.debug "Conditions: #{conditions.inspect}"
    Rails.logger.debug "Email from conditions: #{conditions[:email]}"
    Rails.logger.debug "Email downcased: #{conditions[:email]&.downcase}"
    Rails.logger.debug "Current database: #{connection.current_database}"
    Rails.logger.debug "Connection config: #{connection_db_config.inspect}"
    
    # Use case-insensitive email matching
    if conditions[:email].present?
      # First try a direct SQL query
      direct_result = connection.execute("SELECT * FROM users WHERE LOWER(email) = LOWER('#{conditions[:email]}')").to_a
      Rails.logger.debug "Direct SQL result: #{direct_result.inspect}"
      
      # Then try ActiveRecord
      user = where("LOWER(email) = ?", conditions[:email].downcase).first
      Rails.logger.debug "SQL Query: #{where("LOWER(email) = ?", conditions[:email].downcase).to_sql}"
      Rails.logger.debug "Found user: #{user.inspect}"
      Rails.logger.debug "User exists?: #{user.present?}"
      Rails.logger.debug "User role: #{user&.role}"
      Rails.logger.debug "User email: #{user&.email}"
      Rails.logger.debug "User encrypted password: #{user&.encrypted_password}"
    else
      Rails.logger.debug "No email provided in conditions"
      user = super
    end
    
    user
  end

  def valid_password?(password)
    Rails.logger.debug "=== Validating Password ==="
    Rails.logger.debug "User: #{email}"
    Rails.logger.debug "Current encrypted password: #{encrypted_password}"
    Rails.logger.debug "Password being validated: #{password}"
    result = super
    Rails.logger.debug "Password validation result: #{result}"
    Rails.logger.debug "Password validation errors: #{errors.full_messages.join(', ')}" if errors.any?
    result
  end

  def full_address
    [city, state, zip_code].compact.join(', ')
  end

  def should_geocode?
    city_changed? || state_changed? || zip_code_changed?
  end

  def age
    return unless birthdate
    today = Date.today
    years = today.year - birthdate.year
    years -= 1 if today < birthdate + years.years
    years
  end

  # can_post_as_organization: boolean

  private

  def set_default_role
    self.role ||= :basic_user
  end

  def validate_organizations_based_on_role
    if shelter_staff? && organizations.empty?
      errors.add(:organizations, "must be selected for shelter staff")
    end
  end
end
