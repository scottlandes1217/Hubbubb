class CreateReactions < ActiveRecord::Migration[6.1]
  def change
    create_table :reactions do |t|
      t.string :reaction_type, null: false # Stores the type (e.g., "like", "thumbs_up", "😂")
      t.references :user, null: false, foreign_key: true
      t.references :post, null: false, foreign_key: true

      t.timestamps
    end

    # Optional: Add a unique index to prevent duplicate reactions of the same type by the same user
    add_index :reactions, [:user_id, :post_id, :reaction_type], unique: true
  end
end