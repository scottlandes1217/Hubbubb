class CreatePostAttachments < ActiveRecord::Migration[7.1]
  def change
    create_table :post_attachments do |t|
      t.references :post, foreign_key: true, null: false
      t.timestamps
    end
  end
end