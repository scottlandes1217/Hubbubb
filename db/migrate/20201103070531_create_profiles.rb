class CreateProfiles < ActiveRecord::Migration[5.2]
  
  def up
    create_table :profiles do |t|
        t.string "name", :limit => 50, :default => '', :null => false

      t.timestamps
    end
  end

  def down
      drop_table :profiles
end

end
