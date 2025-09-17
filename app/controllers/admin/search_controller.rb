class Admin::SearchController < Admin::ApplicationController
  before_action :authenticate_user!
  layout 'admin' # Use admin layout if you have one

  def index
    @query = params[:q] || params[:query]
    @results = []
    # TODO: Implement full search logic for users, organizations, pets, etc.
  end

  def quick_search
    query = params[:q]&.strip
    return render json: { results: [] } if query.blank?

    results = []

    # Search organizations
    organizations = Organization.where("name ILIKE ?", "%#{query}%").limit(5)
    organizations.each do |org|
      results << {
        id: org.id,
        type: 'organization',
        title: org.name,
        subtitle: 'Organization',
        icon: 'fas fa-building',
        url: Rails.application.routes.url_helpers.organization_path(org),
        recent: org.updated_at > 1.day.ago
      }
    end

    # Search users
    users = User.where("first_name ILIKE :q OR last_name ILIKE :q OR email ILIKE :q", q: "%#{query}%").limit(5)
    users.each do |user|
      results << {
        id: user.id,
        type: 'user',
        title: user.full_name,
        subtitle: user.email,
        icon: 'fas fa-user',
        url: Rails.application.routes.url_helpers.edit_user_registration_path,
        recent: user.updated_at > 1.day.ago
      }
    end

    # Search pets
    pets = Pet.where("name ILIKE ? OR description ILIKE ?", "%#{query}%", "%#{query}%").limit(5)
    pets.each do |pet|
      results << {
        id: pet.id,
        type: 'pet',
        title: pet.name,
        subtitle: pet.description,
        icon: 'fas fa-paw',
        url: Rails.application.routes.url_helpers.organization_pet_path(pet.organization_id, pet),
        recent: pet.updated_at > 1.day.ago
      }
    end

    results.sort_by! { |r| [r[:recent] ? 0 : 1, r[:title].downcase] }
    render json: { results: results }
  end
end 