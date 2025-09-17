class AddBudgetAndCapToAds < ActiveRecord::Migration[7.1]
  def change
    add_column :ads, :impression_cap, :integer
    add_column :ads, :click_cap, :integer
    add_column :ads, :budget_cents, :integer
  end
end
