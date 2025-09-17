class CreateForms < ActiveRecord::Migration[7.1]
  def change
    create_table :forms do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :name
      t.text :description
      t.jsonb :form_data
      t.boolean :is_active

      t.timestamps
    end
  end
end
