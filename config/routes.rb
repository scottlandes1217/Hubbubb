Rails.application.routes.draw do

	devise_for :users

	root controller: :rooms, action: :index

	resources :room_messages
	
	resources :rooms do
	  member do
	    get :delete
	  end
	end

	resources :profiles do
	  member do
	    get :delete
	  end
	end

	resources :favorite_rooms, only: [:create, :destroy]
	
end