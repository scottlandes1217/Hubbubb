class ListView < ApplicationRecord
  belongs_to :organization
  belongs_to :user, optional: true
  belongs_to :custom_object, optional: true, foreign_key: :object_id
  
  validates :name, presence: true
  validates :object_type, presence: true
  
  scope :for_object_type, ->(object_type, object_id = nil) {
    where(object_type: object_type, object_id: object_id)
  }
  
  scope :for_organization, ->(organization) {
    where(organization: organization)
  }
  
  scope :public_or_user, ->(user) {
    where("is_public = true OR user_id = ?", user&.id)
  }
  
  scope :default_view, -> {
    where(is_default: true)
  }
  
  # Get available columns for a given object type
  def self.available_columns_for(object_type, organization, object_id = nil)
    case object_type
    when 'Pet'
      [
        { api_name: 'photo', display_name: 'Image', type: 'image' },
        { api_name: 'name', display_name: 'Name', type: 'string' },
        { api_name: 'breed', display_name: 'Breed', type: 'string' },
        { api_name: 'age', display_name: 'Age', type: 'integer' },
        { api_name: 'description', display_name: 'Description', type: 'text' },
        { api_name: 'species', display_name: 'Species', type: 'string' },
        { api_name: 'location', display_name: 'Location', type: 'string' },
        { api_name: 'created_at', display_name: 'Created', type: 'datetime' }
      ]
    when 'Task'
      [
        { api_name: 'subject', display_name: 'Subject', type: 'string' },
        { api_name: 'pet', display_name: 'Pet', type: 'association' },
        { api_name: 'status', display_name: 'Status', type: 'string' },
        { api_name: 'start_time', display_name: 'Start Time', type: 'datetime' },
        { api_name: 'duration_minutes', display_name: 'Duration (min)', type: 'integer' },
        { api_name: 'description', display_name: 'Description', type: 'text' },
        { api_name: 'created_at', display_name: 'Created', type: 'datetime' }
      ]
    when 'CustomObject'
      custom_object = organization.custom_objects.find_by(id: object_id)
      return [] unless custom_object
      
      columns = [
        { api_name: 'name', display_name: 'Name', type: 'string' },
        { api_name: 'created_at', display_name: 'Created', type: 'datetime' }
      ]
      
      # Add custom fields
      custom_object.custom_fields.active.visible.each do |field|
        columns << {
          api_name: field.api_name,
          display_name: field.display_name,
          type: field.field_type
        }
      end
      
      columns
    else
      []
    end
  end
  
  # Apply filters to a relation
  def apply_filters(relation)
    return relation if filters.blank?
    
    filters.each do |filter|
      field = filter['field']
      operator = filter['operator']
      value = filter['value']
      
      next if field.blank? || operator.blank?
      
      case operator
      when 'equals'
        relation = relation.where("#{field} = ?", value)
      when 'not_equals'
        relation = relation.where.not("#{field} = ?", value)
      when 'contains'
        relation = relation.where("#{field} ILIKE ?", "%#{value}%")
      when 'not_contains'
        relation = relation.where.not("#{field} ILIKE ?", "%#{value}%")
      when 'starts_with'
        relation = relation.where("#{field} ILIKE ?", "#{value}%")
      when 'greater_than'
        relation = relation.where("#{field} > ?", value)
      when 'less_than'
        relation = relation.where("#{field} < ?", value)
      when 'is_null'
        relation = relation.where("#{field} IS NULL")
      when 'is_not_null'
        relation = relation.where.not("#{field} IS NULL")
      end
    end
    
    relation
  end
  
  # Apply sorting to a relation
  def apply_sorting(relation)
    return relation unless sort_by.present?
    
    direction = sort_direction == 'desc' ? 'desc' : 'asc'
    relation.order("#{sort_by} #{direction}")
  end
end
