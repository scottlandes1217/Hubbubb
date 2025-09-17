class CreateAds < ActiveRecord::Migration[7.1]
  def change
    create_table :ads do |t|
      t.string :title
      t.text :body
      t.integer :global_frequency
      t.integer :max_impressions_per_user
      t.integer :user_cooldown_seconds
      t.text :include_locations
      t.text :exclude_locations
      t.decimal :revenue_generated, default: 0
      t.decimal :revenue_share_percentage, default: 0
      t.integer :impressions_count, default: 0
      t.integer :clicks_count, default: 0
      t.text :pet_types
      t.string :status
      t.datetime :start_at
      t.datetime :end_at

      t.timestamps
    end
  end
end
