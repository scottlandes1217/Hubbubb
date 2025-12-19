# Constraint to match routes that should be handled by custom objects
# This ensures we don't conflict with built-in routes like pets, tasks, events
class CustomObjectRouteConstraint
  BUILT_IN_ROUTES = %w[pets tasks events calendars sites posts flows flow_jobs organization_assets custom_objects objects search record_layout].freeze

  def matches?(request)
    # Extract api_name from the path
    api_name = extract_api_name(request.path)
    return false if api_name.blank?
    
    # Don't match built-in routes
    return false if BUILT_IN_ROUTES.include?(api_name)
    
    # The controller will verify it's actually a custom_object
    # This constraint just filters out obvious conflicts
    true
  end

  private

  def extract_api_name(path)
    # Extract api_name from paths like /organizations/1/my_custom_object or /organizations/1/my_custom_object/123
    match = path.match(%r{/organizations/\d+/([^/]+)})
    match ? match[1] : nil
  end
end

