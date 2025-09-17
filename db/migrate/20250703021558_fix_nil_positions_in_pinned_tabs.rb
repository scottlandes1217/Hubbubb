class FixNilPositionsInPinnedTabs < ActiveRecord::Migration[7.1]
  def up
    # Get all users who have pinned tabs
    user_ids = PinnedTab.distinct.pluck(:user_id)
    
    user_ids.each do |user_id|
      # Get all tabs for this user, ordered by created_at
      tabs = PinnedTab.where(user_id: user_id).order(:created_at)
      
      # Find the maximum position for this user
      max_position = tabs.where.not(position: nil).maximum(:position) || -1
      
      # Update tabs with nil positions
      tabs.where(position: nil).each_with_index do |tab, index|
        new_position = max_position + 1 + index
        tab.update!(position: new_position)
        puts "Updated tab #{tab.id} (user #{user_id}) to position #{new_position}"
      end
    end
  end

  def down
    # This migration is not reversible as we don't want to set positions back to nil
  end
end
