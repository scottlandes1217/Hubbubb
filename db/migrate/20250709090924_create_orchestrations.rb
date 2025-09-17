class CreateOrchestrations < ActiveRecord::Migration[7.1]
  def change
    create_table :orchestrations do |t|
      t.string :name, null: false
      t.string :orchestration_type, null: false
      t.string :status, null: false, default: 'draft'
      t.references :organization, null: false, foreign_key: true
      t.text :layout_data
      t.text :connections_data

      t.timestamps
    end
    
    add_index :orchestrations, [:organization_id, :orchestration_type]
    add_index :orchestrations, :status
  end
end
