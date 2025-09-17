class Task < ApplicationRecord
    STATUSES = %w[Scheduled Pending On-Hold Overdue Completed].freeze
  
    belongs_to :pet, optional: true
    belongs_to :organization, optional: true
    has_many :event_tasks, dependent: :destroy
    has_many :events, through: :event_tasks
  
    validates :status, inclusion: { in: STATUSES }
    validates :subject, presence: true
    validates :duration_minutes, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true
    validate :must_have_pet_or_organization



    before_save :clean_flag_list
    after_save :schedule_status_update, if: :should_schedule_update?
    after_destroy :cancel_scheduled_job
    after_save :sync_flags_with_pet
    after_destroy :cleanup_flags

    after_create do
      Rails.logger.info "Task #{id}: Created with status #{status}"
      Rails.logger.info "Task #{id}: Start time: #{start_time.in_time_zone}"
      Rails.logger.info "Task #{id}: Duration: #{duration_minutes} minutes"
    end

    def update_status!
      Rails.logger.info "Task #{id}: update_status! called"
      Rails.logger.info "Task #{id}: Current status: #{status}"
      
      return if status == 'Completed' || status == 'On-Hold'
      return unless start_time.present? && duration_minutes.present?

      end_time = start_time.in_time_zone + duration_minutes.minutes
      now = Time.current.in_time_zone

      Rails.logger.info "Task #{id}: Updating status"
      Rails.logger.info "Task #{id}: Current status: #{status}"
      Rails.logger.info "Task #{id}: Current time: #{now}"
      Rails.logger.info "Task #{id}: Start time: #{start_time.in_time_zone}"
      Rails.logger.info "Task #{id}: End time: #{end_time}"

      new_status = case status
                   when 'Scheduled'
                     if now >= start_time.in_time_zone
                       Rails.logger.info "Task #{id}: Changing from Scheduled to Pending because now (#{now}) >= start_time (#{start_time.in_time_zone})"
                       'Pending'
                     end
                   when 'Pending'
                     if now >= end_time
                       Rails.logger.info "Task #{id}: Changing from Pending to Overdue because now (#{now}) >= end_time (#{end_time})"
                       'Overdue'
                     end
                   end

      if new_status && new_status != status
        Rails.logger.info "Task #{id}: Changing status from #{status} to #{new_status}"
        
        # Update the status directly in the database to avoid callbacks
        update_column(:status, new_status)
        
        # Reload the task to get the new status
        reload
        
        # Manually trigger the sync_flags_with_pet method
        sync_flags_with_pet
        
        # If we just changed to Pending, schedule the Overdue check
        if new_status == 'Pending'
          Rails.logger.info "Task #{id}: Scheduling Overdue check for #{end_time}"
          TaskStatusUpdateWorker.perform_at(end_time, id)
        end
      else
        Rails.logger.info "Task #{id}: No status change needed"
      end
    end

    private

    def must_have_pet_or_organization
      if pet_id.blank? && organization_id.blank?
        errors.add(:base, "Task must belong to either a pet or an organization")
      end
    end

    def cleanup_flags
      Rails.logger.info "Task #{id}: cleanup_flags called after deletion"
      return unless pet.present? # Only cleanup flags for pet-related tasks
      
      # Get the pet's current flags
      current_pet_flags = Array(pet.flags)
      # Get the flags that were on this task
      task_flags = flag_list || []
      
      # For each flag that was on this task, check if it should be removed
      task_flags.each do |flag|
        # Only remove if no other active tasks have this flag
        unless pet.tasks.where.not(id: id)
                        .where(status: %w[Pending Overdue])
                        .where("flag_list @> ARRAY[?]::varchar[]", [flag])
                        .exists?
          Rails.logger.info "Task #{id}: Removing flag #{flag} from pet #{pet.id} after deletion"
          new_flags = current_pet_flags - [flag]
          pet.update_column(:flags, new_flags)
          Rails.logger.info "Task #{id}: Updated pet flags in database: #{pet.reload.flags.inspect}"
        end
      end
    end

    def clean_flag_list
      self.flag_list = Array(flag_list).reject(&:blank?)
    end

    def sync_flags_with_pet
      Rails.logger.info "Task #{id}: sync_flags_with_pet called"
      Rails.logger.info "Task #{id}: Current status: #{status}"
      Rails.logger.info "Task #{id}: Current flags: #{flag_list.inspect}"
      return unless pet.present? # Only sync flags for pet-related tasks
      
      Rails.logger.info "Task #{id}: Pet current flags: #{pet.flags.inspect}"
      Rails.logger.info "Task #{id}: Status changed? #{saved_change_to_status?}"
      Rails.logger.info "Task #{id}: Flag list changed? #{saved_change_to_flag_list?}"

      # Get the current flags for this task
      current_flags = flag_list || []

      # Check if we should add or remove flags
      if %w[Pending Overdue].include?(status)
        # Add flags to pet if they don't exist
        new_flags = (Array(pet.flags) + current_flags).uniq
        Rails.logger.info "Task #{id}: Adding flags. Current pet flags: #{pet.flags.inspect}"
        Rails.logger.info "Task #{id}: New flags to add: #{current_flags.inspect}"
        Rails.logger.info "Task #{id}: Final flags will be: #{new_flags.inspect}"
        
        # Update the pet's flags
        pet.update(flags: new_flags)
        Rails.logger.info "Task #{id}: Updated pet flags in database: #{pet.reload.flags.inspect}"
      elsif %w[Completed On-Hold Scheduled].include?(status)
        # Remove flags from pet if no other active tasks need them
        current_flags.each do |flag|
          # Only remove if no other active tasks have this flag
          unless pet.tasks.where.not(id: id)
                          .where(status: %w[Pending Overdue])
                          .where("flag_list @> ARRAY[?]::varchar[]", [flag])
                          .exists?
            Rails.logger.info "Task #{id}: Removing flag #{flag} from pet #{pet.id}"
            new_flags = Array(pet.flags) - [flag]
            pet.update(flags: new_flags)
            Rails.logger.info "Task #{id}: Updated pet flags in database: #{pet.reload.flags.inspect}"
          end
        end
      end
    end

    def should_schedule_update?
      Rails.logger.info "Task #{id}: Checking if should schedule update"
      Rails.logger.info "Task #{id}: Current status: #{status}"
      Rails.logger.info "Task #{id}: Start time: #{start_time.in_time_zone}"
      Rails.logger.info "Task #{id}: Duration: #{duration_minutes}"

      return false if status == 'Completed' || status == 'On-Hold'
      return false unless start_time.present? && duration_minutes.present?
      
      # Only schedule if the task is in the future or currently active
      end_time = start_time.in_time_zone + duration_minutes.minutes
      should_schedule = Time.current.in_time_zone <= end_time
      Rails.logger.info "Task #{id}: should_schedule_update? = #{should_schedule}"
      should_schedule
    end

    def schedule_status_update
      end_time = start_time.in_time_zone + duration_minutes.minutes
      now = Time.current.in_time_zone

      Rails.logger.info "Task #{id}: Scheduling status update"
      Rails.logger.info "Task #{id}: Current time: #{now}"
      Rails.logger.info "Task #{id}: Start time: #{start_time.in_time_zone}"
      Rails.logger.info "Task #{id}: End time: #{end_time}"
      Rails.logger.info "Task #{id}: Current status: #{status}"

      if now < start_time.in_time_zone
        # Task is in the future, schedule it to start
        Rails.logger.info "Task #{id}: Scheduling to start at #{start_time.in_time_zone}"
        TaskStatusUpdateWorker.perform_at(start_time.in_time_zone, id)
      elsif now < end_time
        # Task is currently active, schedule it to end
        Rails.logger.info "Task #{id}: Scheduling to end at #{end_time}"
        TaskStatusUpdateWorker.perform_at(end_time, id)
      else
        Rails.logger.info "Task #{id}: No scheduling needed - task is in the past"
      end
    end

    def cancel_scheduled_job
      # Cancel any pending jobs for this task
      Sidekiq::ScheduledSet.new.each do |job|
        if job.args.first.is_a?(Hash) && job.args.first['_aj_globalid']&.include?("Task/#{id}")
          job.delete
        end
      end
    end
end