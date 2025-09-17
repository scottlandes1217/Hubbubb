class RemoveDisplayNameFromCustomObjects < ActiveRecord::Migration[7.1]
  def change
    remove_column :custom_objects, :display_name, :string
  end
end
