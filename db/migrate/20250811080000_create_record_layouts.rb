class CreateRecordLayouts < ActiveRecord::Migration[7.1]
  def change
    create_table :record_layouts do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :table_type, null: false
      t.bigint :table_id
      t.text :layout_html
      t.text :layout_css
      t.text :layout_js
      t.jsonb :metadata, default: {}
      t.timestamps
    end
    add_index :record_layouts, [:organization_id, :table_type, :table_id], unique: true, name: 'index_record_layouts_on_org_and_table'
  end
end


