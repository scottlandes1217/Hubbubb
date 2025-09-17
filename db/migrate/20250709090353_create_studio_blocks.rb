class CreateStudioBlocks < ActiveRecord::Migration[7.1]
  def change
    create_table :studio_blocks do |t|
      t.references :studio, null: false, foreign_key: true
      t.string :block_type, null: false
      t.string :name, null: false
      t.integer :position_x, null: false
      t.integer :position_y, null: false
      t.text :config_data

      t.timestamps
    end
    
    add_index :studio_blocks, [:studio_id, :block_type]
    add_index :studio_blocks, [:position_x, :position_y]
  end
end
