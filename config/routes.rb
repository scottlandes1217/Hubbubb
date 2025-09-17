Rails.application.routes.draw do
  
  
  get 'calendar_shares/create'
  get 'calendar_shares/destroy'
  get 'events/index'
  get 'events/show'
  get 'events/new'
  get 'events/create'
  get 'events/edit'
  get 'events/update'
  get 'events/destroy'
  get 'calendars/index'
  get 'calendars/show'
  get 'calendars/new'
  get 'calendars/create'
  get 'calendars/edit'
  get 'calendars/update'
  get 'calendars/destroy'
  get 'ad_impressions/create'

  # SINGLE admin namespace block for all admin routes
  namespace :admin do
    get 'ads/index'
    get 'ads/new'
    get 'ads/create'
    get 'ads/edit'
    get 'ads/update'
    get 'ads/destroy'
    resources :ads do
      member do
        post :create_variant
      end
    end
    get 'search', to: 'search#index', as: :search
    get 'search/quick', to: 'search#quick_search', as: :quick_search
    get 'home', to: 'home#index' # Admin home page
    resources :users, only: [:index, :new, :create, :edit, :update] do
      collection do
        get :search
      end
      member do
        post :impersonate
        delete :stop_impersonating
      end
    end
  end

  require 'sidekiq/web'
  
  # Mount Action Cable
  mount ActionCable.server => '/cable'
  
  authenticate :user, lambda { |u| u.admin? } do
    mount Sidekiq::Web => '/sidekiq'
  end


  get 'feed/index'
  
  # Devise routes for user authentication
  devise_for :users, controllers: { 
    sessions: 'users/sessions',
    registrations: 'users/registrations'
  }

  # Root route for public landing page
  root 'home#index' # Public landing page for unauthenticated users

# Organizations and nested pets
resources :organizations do
  resources :pets do
    member do
      get :feed
      post :gallery
      delete :gallery
      get :tasks
    end
    resources :posts, only: [:new, :create, :index, :show, :destroy]
    resources :tasks, only: [:index, :new, :create, :edit, :update, :destroy, :show]
  end

  
                  # Objects (both custom and built-in)
  get 'objects', to: 'objects#index'
  
  # Custom Objects and Fields
  resources :custom_objects do
    resources :custom_fields, only: [:index, :show, :new, :create, :edit, :update, :destroy]
    resources :custom_records, only: [:index, :show, :new, :create, :edit, :update, :destroy]
  end
  
  # Built-in Object Fields
  resources :pets do
    resources :custom_fields, only: [:index, :show, :new, :create, :edit, :update, :destroy], controller: 'custom_fields'
  end
  resources :tasks, only: [:index, :new, :create, :edit, :update, :destroy, :show], controller: 'organization_tasks' do
    resources :custom_fields, only: [:index, :show, :new, :create, :edit, :update, :destroy], controller: 'custom_fields'
  end
  resources :events, only: [:index, :show, :edit, :update, :destroy] do
    resources :custom_fields, only: [:index, :show, :new, :create, :edit, :update, :destroy], controller: 'custom_fields'
  end
  
  # Organization-level custom fields for built-in objects
  get 'pets/custom_fields', to: 'custom_fields#organization_index', as: :organization_pets_custom_fields
  get 'tasks/custom_fields', to: 'custom_fields#organization_index', as: :organization_tasks_custom_fields
  get 'events/custom_fields', to: 'custom_fields#organization_index', as: :organization_events_custom_fields
  
  # Unified object fields view
  get 'objects/:object_type/fields', to: 'object_fields#index', as: :organization_object_fields
  
  # Record Layouts (builder per table)
  resource :record_layout, only: [:update], controller: 'record_layouts' do
    get :builder
  end
  
  resources :sites do
    member do
      get :builder
      get :display
      post :submit
    end
  end
  resources :posts do
    resources :comments, only: [:create, :destroy]
  end
  resources :calendars, only: [:index, :show, :new, :create, :edit, :update, :destroy] do
    resources :events, only: [:new, :create]
    resources :calendar_shares, only: [:create, :destroy]
  end
  resources :events, only: [:index, :show, :edit, :update, :destroy]
  resources :tasks, only: [:index, :new, :create, :edit, :update, :destroy, :show], controller: 'organization_tasks'
  resources :organization_assets, only: [:index, :create]
  
  # Flows
  resources :flows do
    member do
      get :builder
      post :execute
    end
    resources :flow_blocks, only: [:index, :show, :create, :update, :destroy], controller: 'api/flow_blocks' do
      collection do
        post :reorder
      end
    end
  end
  
  # Search routes
  get 'search', to: 'search#index'
  get 'search/quick', to: 'search#quick_search'
end


  # Feed page
  resources :feed, only: [:index]
  
  # Pinned tabs
  resources :pinned_tabs, only: [:index, :create, :destroy] do
    collection do
      delete :unpin_pet
      delete :unpin_task
      post :update_order
    end
  end

  # Shelter staff namespace for shelter-staff-specific home page
  namespace :shelter_staff do
    get 'home', to: 'home#index' # Shelter staff home page
  end

  # User namespace for normal user home page
  namespace :user_home do
    get 'home', to: 'home#index' # Normal user home page
  end

  # Posts namespace for feed and reactions
  resources :posts do
    resources :reactions, only: [:create, :destroy]
    resources :comments, only: [:create, :destroy]
    post :react, on: :member
  end

  resources :ad_impressions, only: [:create]

  resources :comments do
    resources :comment_reactions, only: [:create, :destroy]
  end
end