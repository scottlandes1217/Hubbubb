class ChangeFlagsToJsonInPets < ActiveRecord::Migration[7.1]
  def change
    change_column :pets, :flags, :json, using: 'flags::json'
  end
end