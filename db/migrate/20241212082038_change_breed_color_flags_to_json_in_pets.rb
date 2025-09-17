class ChangeBreedColorFlagsToJsonInPets < ActiveRecord::Migration[7.1]
  def change
    change_column :pets, :breed, :json, using: 'to_json(breed)'
    change_column :pets, :color, :json, using: 'to_json(color)'
    change_column :pets, :flags, :json, using: 'to_json(flags)'
  end
end