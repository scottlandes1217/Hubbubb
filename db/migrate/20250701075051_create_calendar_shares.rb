class CreateCalendarShares < ActiveRecord::Migration[7.1]
  def change
    create_table :calendar_shares do |t|
      t.references :calendar, null: false, foreign_key: true
      t.references :user, foreign_key: true
      t.string :permission, default: "view"
      t.string :email
      t.string :status, default: "pending"
      t.string :invitation_token
      t.datetime :accepted_at
      t.timestamps
    end

    add_index :calendar_shares, [:calendar_id, :user_id], unique: true, where: "user_id IS NOT NULL"
    add_index :calendar_shares, [:calendar_id, :email], unique: true, where: "email IS NOT NULL"
    add_index :calendar_shares, :invitation_token, unique: true
    add_index :calendar_shares, :status
  end
end
