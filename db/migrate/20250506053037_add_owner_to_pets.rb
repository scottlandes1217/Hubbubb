class AddOwnerToPets < ActiveRecord::Migration[7.1]
  def change
    add_reference :pets, :owner, null: true, foreign_key: { to_table: :users }
  end
end
