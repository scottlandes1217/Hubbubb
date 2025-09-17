class AddBirthdateAndGenderToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :birthdate, :date
    add_column :users, :gender, :integer
  end
end
