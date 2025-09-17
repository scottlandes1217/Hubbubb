class CreatePinnedTabs < ActiveRecord::Migration[7.1]
  def change
    create_table :pinned_tabs do |t|
      t.references :user, null: false, foreign_key: true
      t.references :tabable, polymorphic: true, null: false
      t.string :title
      t.string :url
      t.string :tab_type

      t.timestamps
    end
  end
end
