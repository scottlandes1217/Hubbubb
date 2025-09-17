class AddPetFieldsToPets < ActiveRecord::Migration[7.1]
  def change
    add_column :pets, :sex, :integer, null: false, default: 2 # Enum: 0 = Male, 1 = Female, 2 = Unknown
    add_column :pets, :species_id, :integer # Foreign key to OrganizationField
    add_column :pets, :color, :string
    add_column :pets, :coat_type, :integer # Enum: 0 = Rough, 1 = Short, etc.
    add_column :pets, :size, :integer # Enum: 0 = Small, 1 = Medium, etc.
    add_column :pets, :weight_lbs, :float
    add_column :pets, :weight_oz, :float
    add_column :pets, :entered_shelter, :date
    add_column :pets, :left_shelter, :date
    add_column :pets, :unit_id, :integer # Foreign key to OrganizationField
    add_column :pets, :location_id, :integer # Foreign key to OrganizationField
    add_column :pets, :date_of_birth, :date
    add_column :pets, :dob_estimated, :boolean, default: false
    add_column :pets, :microchip, :string
    add_column :pets, :dod, :date
    add_column :pets, :mother_id, :integer # Self-referential to Pet
    add_column :pets, :father_id, :integer # Self-referential to Pet
    add_column :pets, :flags, :text # Serialized array
  end
end
