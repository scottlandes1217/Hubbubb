class PinnedTab < ApplicationRecord
  belongs_to :user
  belongs_to :tabable, polymorphic: true
  
  validates :title, presence: true
  validates :url, presence: true
  validates :tab_type, presence: true
  
  scope :for_user, ->(user) { where(user: user) }
  scope :ordered, -> { order(Arel.sql('COALESCE(position, 999999), created_at ASC')) }
  
  def self.pin_pet(user, pet)
    find_or_create_by(
      user: user,
      tabable: pet,
      tab_type: 'pet'
    ) do |tab|
      tab.title = pet.name
      tab.url = Rails.application.routes.url_helpers.organization_pet_path(pet.organization, pet)
      # Assign position at the end of existing tabs
      max_position = user.pinned_tabs.maximum(:position) || -1
      tab.position = max_position + 1
    end
  end
  
  def self.unpin_pet(user, pet)
    where(user: user, tabable: pet, tab_type: 'pet').destroy_all
  end

  def self.pin_task(user, task)
    Rails.logger.info "Pinning task #{task.id} for user #{user.id}"
    Rails.logger.info "Current max position: #{user.pinned_tabs.maximum(:position)}"
    
    find_or_create_by(
      user: user,
      tabable: task,
      tab_type: 'task'
    ) do |tab|
      tab.title = task.subject
      tab.url = Rails.application.routes.url_helpers.edit_organization_task_path(task.pet.organization, task)
      # Assign position at the end of existing tabs
      max_position = user.pinned_tabs.maximum(:position) || -1
      tab.position = max_position + 1
      Rails.logger.info "Created new task tab with position: #{tab.position}"
    end.tap do |tab|
      Rails.logger.info "Final task tab: id=#{tab.id}, position=#{tab.position}, title=#{tab.title}"
    end
  end
  
  def self.unpin_task(user, task)
    where(user: user, tabable: task, tab_type: 'task').destroy_all
  end
end 