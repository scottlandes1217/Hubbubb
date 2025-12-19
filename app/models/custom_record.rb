class CustomRecord < ApplicationRecord
  belongs_to :custom_object
  has_many :custom_field_values, dependent: :destroy
  has_many :custom_fields, through: :custom_object

  validates :name, presence: true
  validates :external_id, presence: true, uniqueness: true

  before_validation :generate_external_id, if: -> { external_id.blank? }

  # Dynamic field value accessors
  def field_value(field_api_name)
    field = custom_fields.find_by(api_name: field_api_name)
    return nil unless field
    
    field_value = custom_field_values.find_by(custom_field: field)
    field_value&.value
  end

  def set_field_value(field_api_name, value)
    field = custom_fields.find_by(api_name: field_api_name)
    return false unless field
    
    field_value = custom_field_values.find_or_initialize_by(custom_field: field)
    field_value.value = value
    field_value.save
  end

  # Get all field values as a hash
  def field_values
    values = {}
    custom_fields.each do |field|
      field_value = custom_field_values.find_by(custom_field: field)
      values[field.api_name] = field_value&.value
    end
    values
  end

  # Set multiple field values at once
  def set_field_values(values_hash)
    values_hash.each do |field_api_name, value|
      set_field_value(field_api_name, value)
    end
  end

  private

  def generate_external_id
    return if external_id.present?
    
    # Generate a web-safe, URL-friendly external ID that's globally unique
    # Using urlsafe_base64 for web-safe characters (A-Z, a-z, 0-9, -, _)
    # Length of 12 gives us ~72 bits of entropy (good balance between uniqueness and brevity)
    loop do
      self.external_id = SecureRandom.urlsafe_base64(12).tr('=', '').tr('+', '-').tr('/', '_')
      break unless self.class.exists?(external_id: external_id)
    end
  end
  
  # Flow triggers
  after_create :trigger_flows
  after_update :trigger_flows
  
  def trigger_flows
    FlowTriggerService.check_and_trigger(self, custom_object.organization)
  end
end 