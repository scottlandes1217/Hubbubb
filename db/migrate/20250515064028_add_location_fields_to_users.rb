class AddLocationFieldsToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :state, :string
    add_column :users, :county, :string
    add_column :users, :city, :string
    add_column :users, :zip_code, :string
    add_column :users, :latitude, :float
    add_column :users, :longitude, :float
  end
end
