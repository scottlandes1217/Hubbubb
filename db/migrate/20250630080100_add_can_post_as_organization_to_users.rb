class AddCanPostAsOrganizationToUsers < ActiveRecord::Migration[6.1]
  def change
    add_column :users, :can_post_as_organization, :boolean, default: false, null: false
  end
end 