class UpdatePetFieldsToUseStrings < ActiveRecord::Migration[7.1]
  def change
    # Change species_id to species (string)
    change_column :pets, :species_id, :string
    rename_column :pets, :species_id, :species
    
    # Change unit_id to unit (string)
    change_column :pets, :unit_id, :string
    rename_column :pets, :unit_id, :unit
    
    # Change location_id to location (string)
    change_column :pets, :location_id, :string
    rename_column :pets, :location_id, :location
  end
end
