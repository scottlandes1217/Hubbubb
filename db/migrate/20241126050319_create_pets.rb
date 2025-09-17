class CreatePets < ActiveRecord::Migration[7.1]
  def change
    create_table :pets do |t|
      t.string :name
      t.string :breed
      t.integer :age
      t.text :description
      t.references :organization, null: false, foreign_key: true

      t.timestamps
    end
  end
end
