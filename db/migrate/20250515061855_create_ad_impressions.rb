class CreateAdImpressions < ActiveRecord::Migration[7.1]
  def change
    create_table :ad_impressions do |t|
      t.references :ad, null: false, foreign_key: true
      t.references :user, null: true, foreign_key: true
      t.string :impression_type

      t.timestamps
    end
  end
end
