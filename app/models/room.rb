class Room < ApplicationRecord

	validates :name, uniqueness: true, presence: true
	
	has_many :room_messages, dependent: :destroy, inverse_of: :room
end
