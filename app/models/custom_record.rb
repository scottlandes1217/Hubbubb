class CustomRecord < ApplicationRecord
  belongs_to :custom_object
  has_many :custom_field_values, dependent: :destroy
  has_many :custom_fields, through: :custom_object

  validates :name, presence: true
  validates :external_id, uniqueness: { scope: :custom_object_id }, allow_nil: true

  before_create :generate_external_id

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
    
    # Generate a unique external ID based on table name and record ID
    counter = 1
    base_id = "#{custom_object.api_name}_#{id || 'new'}"
    generated_id = base_id
    
          while self.class.exists?(external_id: generated_id, custom_object_id: custom_object_id)
      generated_id = "#{base_id}_#{counter}"
      counter += 1
    end
    
    self.external_id = generated_id
  end
end 