class AddImpersonationToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :impersonated_by_id, :integer
  end
end
