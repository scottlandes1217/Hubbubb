class CreateUserAdRewards < ActiveRecord::Migration[7.1]
  def change
    create_table :user_ad_rewards do |t|
      t.references :user, null: false, foreign_key: true
      t.references :ad, null: false, foreign_key: true
      t.decimal :amount, default: 0
      t.boolean :donated, default: false
      t.string :donated_to

      t.timestamps
    end
  end
end
