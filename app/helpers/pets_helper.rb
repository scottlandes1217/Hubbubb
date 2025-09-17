module PetsHelper
  def get_custom_field_values(organization, table_type, field_name)
    custom_object = organization.custom_objects.find_by(api_name: table_type)
    return [] unless custom_object
    
    # Try both patterns: pet_breed_field and pets_breed_field
    custom_field = custom_object.custom_fields.find_by(api_name: "pet_#{field_name}_field") ||
                   custom_object.custom_fields.find_by(api_name: "#{table_type}_#{field_name}_field")
    return [] unless custom_field
    
    custom_field.picklist_values || []
  end

  def get_flag_icon(organization, flag_value)
    # For now, we'll return nil since we haven't implemented icon support for custom fields yet
    # This can be enhanced later to support icons for picklist values
    nil
  end

  def get_custom_field_display_name(organization, table_type, field_name)
    custom_object = organization.custom_objects.find_by(api_name: table_type)
    return field_name.titleize unless custom_object
    
    # Try both patterns: pet_breed_field and pets_breed_field
    custom_field = custom_object.custom_fields.find_by(api_name: "pet_#{field_name}_field") ||
                   custom_object.custom_fields.find_by(api_name: "#{table_type}_#{field_name}_field")
    return field_name.titleize unless custom_field
    
    custom_field.display_name
  end
end
