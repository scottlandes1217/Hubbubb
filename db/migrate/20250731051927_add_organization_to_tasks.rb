class AddOrganizationToTasks < ActiveRecord::Migration[7.1]
  def change
    add_reference :tasks, :organization, null: true, foreign_key: true
    
    # Make pet optional (it was previously required)
    change_column_null :tasks, :pet_id, true
  end
end
