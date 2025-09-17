class RecordLayout < ApplicationRecord
  belongs_to :organization

  # table_type examples:
  # - 'Pet' (built-in object, applies to all pets in org when table_id is NULL)
  # - 'Task' (built-in)
  # - 'CustomObject' with table_id set to specific custom_object.id
  validates :organization, presence: true
  validates :table_type, presence: true

  # Store layout as simple HTML/CSS/JS for a single-page record view
  # Use layout_html/layout_css/layout_js columns
  def html
    layout_html.to_s
  end

  def css
    layout_css.to_s
  end

  def js
    layout_js.to_s
  end
end


