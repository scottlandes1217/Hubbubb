class AddCreatorToRoom < ActiveRecord::Migration[5.2]
  def change
    add_column :rooms, :creator_id, :integer
  end
end
