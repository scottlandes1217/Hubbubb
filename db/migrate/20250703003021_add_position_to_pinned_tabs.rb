class AddPositionToPinnedTabs < ActiveRecord::Migration[7.1]
  def change
    add_column :pinned_tabs, :position, :integer
  end
end
