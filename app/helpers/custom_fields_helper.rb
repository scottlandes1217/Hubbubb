module CustomFieldsHelper
  def built_in_field?(custom_field)
    # Built-in fields are those that correspond to core pet/task/event attributes
    built_in_api_names = %w[
      pet_species_field pets_species_field species
      pet_breed_field pets_breed_field breed
      pet_color_field pets_color_field color
      pet_flags_field pets_flags_field flags
      pet_location_field pets_location_field location
      pet_unit_field pets_unit_field unit
      pet_sex_field pets_sex_field sex
      pet_coat_type_field pets_coat_type_field coat_type
    ]
    built_in_api_names.include?(custom_field.api_name)
  end
end 