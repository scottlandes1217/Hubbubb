class EventTask < ApplicationRecord
  belongs_to :event
  belongs_to :task

  validates :event_id, uniqueness: { scope: :task_id, message: "Task is already associated with this event" }
end 