class PetsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_organization
  before_action :set_pet, only: [:show, :edit, :update, :destroy, :gallery]
  before_action :authorize_staff_or_admin!, except: [:index, :show]

  def index
    @query = params[:query]
    @pets = if @query.present?
              @organization.pets.where("name ILIKE :query OR breed ILIKE :query OR description ILIKE :query", query: "%#{@query}%")
            else
              @organization.pets
            end
    @pets = @pets.order(:name).page(params[:page]).per(10)
    
    # Get pinned status for all pets
    @pinned_pet_ids = current_user.pinned_tabs.where(tabable_type: 'Pet', tab_type: 'pet').pluck(:tabable_id)
  end

  def show
    @posts = @pet.posts.includes(images_attachments: :blob)
    @is_pinned = current_user.pinned_tabs.exists?(tabable: @pet, tab_type: 'pet')
    @record_layout = RecordLayout.find_by(organization: @organization, table_type: 'Pet')
    Rails.logger.info "[Pet show] id=#{@pet.id} name=\"#{@pet.name}\""
  end

  def new
    @pet = @organization.pets.build
  end

  def create
    @pet = @organization.pets.build(pet_params)
    if @pet.save
      respond_to do |format|
        format.html { redirect_to organization_pets_path(@organization), notice: 'Pet was successfully added.' }
        format.json { render json: { message: 'Pet was successfully added.', pet: @pet }, status: :created }
      end
    else
      respond_to do |format|
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: { error: 'Failed to create pet', errors: @pet.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def edit
    Rails.logger.info "Editing pet for organization: #{@organization.inspect}"
    Rails.logger.info "Pet being edited: #{@pet.inspect}"
  end

  def update
    Rails.logger.info "Params received for update: #{params.inspect}"

    # 1) Handle new photo upload for main header
    if params[:pet] && params[:pet][:photo]
      uploaded_photo = params[:pet][:photo]
      @pet.photo.attach(uploaded_photo)
      @pet.gallery_photos.attach(uploaded_photo)  # Add to gallery if desired

      if @pet.photo.attached?
        render json: {
          photo_url: url_for(@pet.photo),
          success_message: "Photo updated successfully!"
        }, status: :ok
      else
        render json: { error: "Failed to attach photo" }, status: :unprocessable_entity
      end
      return
    end

    # 2) Handle selecting an existing gallery image as main header
    if params[:gallery_image_id]
      gallery_photo = ActiveStorage::Blob.find_signed(params[:gallery_image_id]) rescue nil
      if gallery_photo
        @pet.photo.attach(gallery_photo)
        render json: {
          photo_url: url_for(@pet.photo),
          success_message: "Photo updated successfully!"
        }, status: :ok
      else
        render json: { error: "Invalid gallery image" }, status: :unprocessable_entity
      end
      return
    end

    # 3) Handle normal field updates (dob_estimated, breed, location, etc.)
    if @pet.update(pet_params)
      @pet.reload
      Rails.logger.info "Pet updated successfully: #{@pet.inspect}"
      # Broadcast live header refresh so any open views (and tabs) show the latest name immediately
      begin
        Turbo::StreamsChannel.broadcast_replace_to(
          "pet_#{@pet.id}",
          target: "pet_header_#{@pet.id}",
          partial: "pets/pet_header",
          locals: { pet: @pet }
        )
      rescue => e
        Rails.logger.warn("Pet header broadcast failed: #{e.message}")
      end
      respond_to do |format|
        format.html do
          redirect_to organization_pet_path(@organization, @pet), notice: 'Pet was successfully updated.'
        end
        format.json do
          render json: { success_message: "Pet updated successfully!", pet: @pet.slice(:id, :name, :species, :description) }, status: :ok
        end
      end
    else
      Rails.logger.error "Failed to update pet: #{@pet.errors.full_messages}"
      respond_to do |format|
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: { error: @pet.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @pet.destroy
    Rails.logger.info "Pet deleted successfully: #{@pet.inspect}"
    respond_to do |format|
      format.html { redirect_to organization_pets_path(@organization), notice: 'Pet was successfully deleted.' }
      format.json { render json: { message: 'Pet was successfully deleted.' }, status: :ok }
    end
  end

  def gallery
    # POST => Upload new gallery photos
    if request.post?
      if params[:pet] && params[:pet][:gallery_photos]
        newly_uploaded_ids = []
  
        # Attach each photo & record the signed ID
        params[:pet][:gallery_photos].each do |photo|
          attached = @pet.gallery_photos.attach(photo)
          if attached.last
            newly_uploaded_ids << attached.last.blob.signed_id
          end
        end
  
        # Re-render partials
        main_html = render_to_string(
          partial: "pets/gallery_items",
          locals: { pet: @pet, organization: @organization }
        )
        modal_html = render_to_string(
          partial: "pets/gallery_items_modal",
          locals: { pet: @pet, organization: @organization }
        )
  
        render json: {
          message: "Photos uploaded successfully.",
          html: main_html,
          modal_html: modal_html,
          newly_uploaded_ids: newly_uploaded_ids
        }, status: :ok
      else
        render json: { error: "No photos were selected." }, status: :unprocessable_entity
      end
  
    # DELETE => Remove a gallery photo
    elsif request.delete?
      photo = @pet.gallery_photos.find_by(id: params[:photo_id])
      if photo
        photo.purge
  
        main_html = render_to_string(
          partial: "pets/gallery_items",
          locals: { pet: @pet, organization: @organization }
        )
        modal_html = render_to_string(
          partial: "pets/gallery_items_modal",
          locals: { pet: @pet, organization: @organization }
        )
  
        render json: {
          message: "Photo removed successfully",
          html: main_html,
          modal_html: modal_html
        }, status: :ok
      else
        render json: { error: "Photo not found" }, status: :unprocessable_entity
      end
  
    else
      head :method_not_allowed
    end
  end

  def feed
    render partial: 'feed'
  end

  def tasks
    render partial: 'tasks'
  end

  private

  def pet_params
    params.require(:pet).permit(
      :name,
      :age,
      :description,
      :sex,
      :weight_lbs,
      :weight_oz,
      :date_of_birth,
      :entered_shelter,
      :left_shelter,
      :microchip,
      :dod,
      :species,
      :unit,
      :location,
      :mother_id,
      :father_id,
      :photo,
      :coat_type,
      :size,
      gallery_photos: [],
      breed: [],
      color: [],
      flags: []
    ).tap do |whitelisted|
      whitelisted[:dob_estimated] = params[:pet][:dob_estimated].present? ? true : false
      whitelisted[:breed]  = Array(params[:pet][:breed])
      whitelisted[:color]  = Array(params[:pet][:color])
      whitelisted[:flags]  = Array(params[:pet][:flags])
    end
  end

  def set_organization
    @organization = Organization.find_by(id: params[:organization_id])
    unless @organization
      redirect_to root_path, alert: "Organization not found"
    end
  end

  def set_pet
    @pet = @organization.pets.find_by(id: params[:id])
    unless @pet
      redirect_to organization_pets_path(@organization), alert: "Pet not found"
    end
  end

  def authorize_staff_or_admin!
    unless current_user.admin? || (current_user.shelter_staff? && current_user.organizations.include?(@organization))
      redirect_to root_path, alert: 'Not authorized to perform this action.'
    end
  end
end