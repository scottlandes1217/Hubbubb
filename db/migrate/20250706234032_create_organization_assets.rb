class CreateOrganizationAssets < ActiveRecord::Migration[6.1]
  def change
    create_table :organization_assets do |t|
      t.references :organization, null: false, foreign_key: true
      t.timestamps
    end
  end
end
