class CreateListViews < ActiveRecord::Migration[7.1]
  def change
    create_table :list_views do |t|
      t.string :name, null: false
      t.references :organization, null: false, foreign_key: true
      t.string :object_type, null: false
      t.integer :object_id
      t.references :user, null: true, foreign_key: true
      t.jsonb :filters, default: {}
      t.jsonb :columns, default: []
      t.string :sort_by
      t.string :sort_direction, default: 'asc'
      t.boolean :is_default, default: false
      t.boolean :is_public, default: false

      t.timestamps
    end
    
    add_index :list_views, [:organization_id, :object_type, :object_id]
    add_index :list_views, [:user_id, :object_type, :object_id]
    add_index :list_views, [:organization_id, :is_default]
  end
end
