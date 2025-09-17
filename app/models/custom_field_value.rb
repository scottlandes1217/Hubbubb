class CustomFieldValue < ApplicationRecord
  belongs_to :custom_record
  belongs_to :custom_field

  validates :custom_record, presence: true
  validates :custom_field, presence: true
  validates :value, presence: true, if: :field_required?
  validates :value, uniqueness: { scope: :custom_field_id }, if: :field_unique?

  # Validate value based on field type
  validate :validate_value_type
  validate :validate_picklist_value, if: :picklist_field?

  private

  def field_required?
    custom_field&.required?
  end

  def field_unique?
    custom_field&.unique?
  end

  def picklist_field?
    custom_field&.picklist? || custom_field&.multipicklist?
  end

  def validate_value_type
    return unless custom_field && value.present?

    case custom_field.field_type
    when 'number', 'currency', 'percent'
      unless value.to_s.match?(/\A-?\d+(\.\d+)?\z/)
        errors.add(:value, "must be a valid number")
      end
    when 'date'
      begin
        Date.parse(value.to_s)
      rescue ArgumentError
        errors.add(:value, "must be a valid date")
      end
    when 'datetime'
      begin
        DateTime.parse(value.to_s)
      rescue ArgumentError
        errors.add(:value, "must be a valid date and time")
      end
    when 'email'
      unless value.to_s.match?(URI::MailTo::EMAIL_REGEXP)
        errors.add(:value, "must be a valid email address")
      end
    when 'url'
      begin
        URI.parse(value.to_s)
      rescue URI::InvalidURIError
        errors.add(:value, "must be a valid URL")
      end
    when 'checkbox'
      unless [true, false, 'true', 'false', '1', '0', 1, 0].include?(value)
        errors.add(:value, "must be true or false")
      end
    end
  end

  def validate_picklist_value
    return unless custom_field && value.present?

    allowed_values = custom_field.picklist_values
    if custom_field.multipicklist?
      # For multipicklist, value should be an array
      if value.is_a?(Array)
        invalid_values = value - allowed_values
        if invalid_values.any?
          errors.add(:value, "contains invalid values: #{invalid_values.join(', ')}")
        end
      else
        errors.add(:value, "must be an array for multipicklist fields")
      end
    else
      # For single picklist, value should be a string
      unless allowed_values.include?(value.to_s)
        errors.add(:value, "must be one of: #{allowed_values.join(', ')}")
      end
    end
  end
end 