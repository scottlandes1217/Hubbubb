module RecordLayoutsHelper
  def record_layout_metadata_json(organization, table_type, table_id, layout = nil)
    fields = []
    components = []
    
    # Use provided layout or try to find existing layout
    unless layout
      begin
        layout = organization.record_layouts.find_by(table_type: table_type, table_id: table_id)
      rescue => e
        Rails.logger.warn "Could not find layout for #{table_type} #{table_id}: #{e.message}"
      end
    end

    case table_type
    when 'Pet'
      base_excludes = %w[id created_at updated_at organization_id]
      pet_attrs = Pet.attribute_names.reject { |n| base_excludes.include?(n) }
      pets_co = organization.custom_objects.find_by(api_name: 'pets')
      fields = pet_attrs.map do |name|
        # Prefer CustomField type when present
        cf = nil
        if pets_co
          cf = pets_co.custom_fields.find_by(api_name: "pet_#{name}_field") ||
               pets_co.custom_fields.find_by(api_name: "pets_#{name}_field") ||
               pets_co.custom_fields.find_by(api_name: name)
        end
        ftype = nil
        if cf
          case cf.field_type
          when 'picklist' then ftype = 'picklist'
          when 'multipicklist' then ftype = 'multipicklist'
          when 'date' then ftype = 'date'
          when 'datetime' then ftype = 'date'
          when 'checkbox' then ftype = 'checkbox'
          when 'textarea' then ftype = 'textarea'
          when 'number', 'currency', 'percent' then ftype = 'number'
          else ftype = 'text'
          end
        else
          # Fallback to model column type
          col = Pet.columns_hash[name]
          ftype = case col&.type
                  when :boolean then 'checkbox'
                  when :date, :datetime then 'date'
                  when :integer, :float, :decimal then 'number'
                  when :text then 'textarea'
                  else 'text'
                  end
        end
        # For picklists, include options in metadata for builder preview
        meta = { api_name: name, label: name.titleize, type: ftype }
        if %w[picklist multipicklist].include?(ftype)
          begin
            opts = get_custom_field_values(organization, 'pets', name)
            meta[:options] = Array(opts)
          rescue
            meta[:options] = []
          end
        else
          # If options exist but type not set as picklist, coerce based on known multi fields
          begin
            opts = get_custom_field_values(organization, 'pets', name)
            if Array(opts).any?
              multi = %w[breed color flags].include?(name)
              meta[:type] = multi ? 'multipicklist' : 'picklist'
              meta[:options] = Array(opts)
            end
          rescue
          end
        end
        meta
      end
      components = [
        { label: 'Pet Header', partial: 'pets/pet_header' },
        # Add more components here as they become supported in preview/runtime
      ]
    when 'Task'
      base_excludes = %w[id created_at updated_at pet_id organization_id]
      fields = Task.attribute_names.reject { |n| base_excludes.include?(n) }.map do |name|
        { api_name: name, label: name.titleize, type: 'text' }
      end
    when 'CustomObject'
      custom_object = organization.custom_objects.find_by(id: table_id)
      if custom_object
        fields = custom_object.custom_fields.active.visible.order(:name).map do |f|
          { api_name: f.api_name, label: f.display_name, type: f.field_type }
        end
      end
    end

    result = { 
      fields: fields, 
      components: components 
    }
    
    # Add layout data if it exists
    if layout
      result[:layout_html] = layout.layout_html || ''
      result[:layout_css] = layout.layout_css || ''
      result[:layout_id] = layout.id
      Rails.logger.info "RecordLayoutsHelper: Found layout #{layout.id} with HTML length: #{result[:layout_html].length}"
    else
      result[:layout_html] = ''
      result[:layout_css] = ''
      result[:layout_id] = nil
      Rails.logger.info "RecordLayoutsHelper: No layout found for #{table_type} #{table_id}"
      
      # Create default layout HTML if none exists
      if table_type == 'Pet'
        result[:layout_html] = '<div class="container mt-3"><h2>Pet Record Layout</h2><p>Drag and drop components from the left sidebar to build your layout.</p></div>'
        Rails.logger.info "RecordLayoutsHelper: Created default HTML for Pet layout"
      elsif table_type == 'Task'
        result[:layout_html] = '<div class="container mt-3"><h2>Task Record Layout</h2><p>Drag and drop components from the left sidebar to build your layout.</p></div>'
        Rails.logger.info "RecordLayoutsHelper: Created default HTML for Task layout"
      end
    end
    
    Rails.logger.info "RecordLayoutsHelper: Returning metadata with keys: #{result.keys}"
    result.to_json.html_safe
  end

  # Provide a simple field metadata map for runtime rendering: { api_name => { type: , options: [] } }
  def record_layout_field_meta_map(organization, table_type, table_id)
    meta = {}
    if table_type == 'Pet'
      data = JSON.parse(record_layout_metadata_json(organization, table_type, table_id)) rescue { 'fields' => [] }
      Array(data['fields']).each do |f|
        meta[f['api_name']] = { 'type' => f['type'], 'options' => f['options'] || [] }
      end
    end
    meta
  end

  # Build options map for picklist fields at runtime
  def record_layout_options_map(organization, table_type)
    options = {}
    if table_type == 'Pet'
      ensure_builtin_pets_custom_fields!(organization)
      begin
        pets_co = organization.custom_objects.find_by(api_name: 'pets')
        if pets_co
          pets_co.custom_fields.where(field_type: [:picklist, :multipicklist]).each do |cf|
            # Normalize api_name to plain field key like 'breed'
            key = cf.api_name.to_s
            key = key.sub(/^pet_/, '').sub(/^pets_/, '')
            key = key.sub(/_field$/, '')
            options[key] = Array(cf.picklist_values)
          end
        end
      rescue
      end
      # Ensure core keys are present even without CF
      %w[species breed color flags location unit coat_type sex].each do |name|
        begin
          opts = get_custom_field_values(organization, 'pets', name)
          options[name] ||= Array(opts)
        rescue
        end
      end
    end
    options
  end

  private

  # Ensure the 'pets' CustomObject and key CustomFields exist so they appear in Objects → Pets → Fields
  def ensure_builtin_pets_custom_fields!(organization)
    pets_co = organization.custom_objects.find_or_create_by!(api_name: 'pets') do |co|
      co.name = 'Pets'
      co.description = 'Built-in Pet fields'
      co.active = true
    end
    required_fields = {
      'species' => :picklist,
      'breed' => :multipicklist,
      'color' => :multipicklist,
      'flags' => :multipicklist,
      'sex' => :picklist,
      'coat_type' => :picklist,
      'location' => :picklist,
      'unit' => :picklist
    }
    required_fields.each do |api_name, ftype|
      cf = pets_co.custom_fields.find_by(api_name: "pet_#{api_name}_field") ||
           pets_co.custom_fields.find_by(api_name: "pets_#{api_name}_field") ||
           pets_co.custom_fields.find_by(api_name: api_name)
      next if cf
      pets_co.custom_fields.create!(
        api_name: api_name,
        name: api_name.titleize,
        display_name: api_name.titleize,
        field_type: CustomField.field_types[ftype],
        required: false,
        unique: false,
        active: true,
        hidden: false,
        read_only: false,
        picklist_values: (ftype == :picklist || ftype == :multipicklist ? [] : nil)
      )
    end
  rescue => _e
    # Silently ignore; rendering should continue
  end

  def record_layout_preview_json(organization, table_type, table_id)
    sample_values = {}
    partials = {}

    case table_type
    when 'Pet'
      pet = organization.pets.order(created_at: :desc).first || organization.pets.build(name: 'Sample Pet', breed: 'Mix', age: 3, species: 'Dog', description: 'Friendly')
      sample_values = pet.attributes.slice('name', 'breed', 'age', 'species', 'description', 'adopted')
      begin
        partials['pets/pet_header'] = render('pets/pet_header', pet: pet)
      rescue
      end
    when 'Task'
      task = organization.tasks.order(created_at: :desc).first || organization.tasks.build(subject: 'Follow up', description: 'Sample task', status: 'Open')
      sample_values = task.attributes.except('id', 'pet_id', 'organization_id', 'created_at', 'updated_at')
    when 'CustomObject'
      custom_object = organization.custom_objects.find_by(id: table_id)
      if custom_object
        record = custom_object.custom_records.order(created_at: :desc).first
        if record
          sample_values = record.field_values.merge('name' => record.name, 'external_id' => record.external_id)
        end
      end
    end

    { values: sample_values, partials: partials }.to_json.html_safe
  end
end


