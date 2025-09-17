class PostsController < ApplicationController
  before_action :set_pet, only: [:new, :create]
  before_action :set_post, only: [:update, :destroy]

  def new
    @post = @pet.posts.build
  end

  def create
  Rails.logger.info "Params received: #{params.inspect}" # Log all incoming params

  @post = @pet.posts.build(post_params)
  @post.user = current_user

  Rails.logger.info "Creating post for pet ID: #{@pet.id} with params: #{post_params}"

  # Attach gallery images
  if params[:gallery_image_ids].present?
    params[:gallery_image_ids].each do |id|
      Rails.logger.info "Processing gallery image ID: #{id}"
      gallery_photo = ActiveStorage::Blob.find_signed(id) rescue nil
      if gallery_photo
        @post.images.attach(gallery_photo)
        Rails.logger.info "Attached gallery image: #{gallery_photo.filename}"
      else
        Rails.logger.error "Failed to find gallery image for ID: #{id}"
      end
    end
  else
    Rails.logger.info "No gallery images selected."
  end

  # Attach uploaded images
  if params[:post][:images].present?
    Rails.logger.info "Uploaded images detected: #{params[:post][:images].map(&:original_filename).join(', ')}"

    params[:post][:images].each do |uploaded_file|
      Rails.logger.info "Processing uploaded file: #{uploaded_file.original_filename}"
      @post.images.attach(uploaded_file)

      # Add to pet's gallery if checkbox is checked
      if params[:add_to_gallery].present?
        @pet.gallery_photos.attach(uploaded_file)
        Rails.logger.info "Added image to pet's gallery: #{uploaded_file.original_filename}"
      end
    end
  else
    Rails.logger.info "No uploaded images detected."
  end

  if @post.save
    Rails.logger.info "Post created successfully with ID: #{@post.id}"
    redirect_to organization_pet_path(@pet.organization, @pet), notice: "Post created successfully!"
  else
    Rails.logger.error "Failed to create post: #{@post.errors.full_messages.join(', ')}"
    render :new, status: :unprocessable_entity
  end
end

  def update
    if @post.update(post_params)
      redirect_to organization_pet_path(@post.pet.organization, @post.pet), notice: "Post updated successfully."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @post.destroy
    if @post.pet.present? && @post.pet.organization.present?
      redirect_to organization_pet_path(@post.pet.organization, @post.pet), notice: "Post was successfully deleted."
    else
      redirect_to feed_index_path, notice: "Post was successfully deleted."
    end
  end

  def react
    @post = Post.find(params[:id])
    reaction_type = params[:reaction_type]
  
    reaction = @post.reactions.find_or_initialize_by(user: current_user)
  
    if reaction.persisted? && reaction.reaction_type == reaction_type
      # The user clicked the same reaction; remove it
      reaction.destroy
      # Return updated post partial
      updated_post_html = render_to_string(partial: "posts/post", locals: { post: @post })
      render json: { updated_html: updated_post_html }, status: :ok
    else
      # User either has no reaction yet or clicked a different one
      reaction.reaction_type = reaction_type
      if reaction.save
        updated_post_html = render_to_string(partial: "posts/post", locals: { post: @post })
        render json: { updated_html: updated_post_html }, status: :ok
      else
        render json: { error: "Unable to set reaction", errors: reaction.errors.full_messages }, status: :unprocessable_entity
      end
    end
  end

  private

  def set_pet
    @pet = Pet.find(params[:pet_id])
    @organization = @pet.organization
  end

  def set_post
    @post = Post.find(params[:id])
  end

  def post_params
    params.require(:post).permit(:body, :organization_id, images: [])
  end
end
