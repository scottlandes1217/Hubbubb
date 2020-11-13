class FavoriteRoomsController < ApplicationController
  before_action :set_room
  
  def create
    if Favorite.create(favorited: @room, user: current_user)
      redirect_to @room, notice: 'Room has been favorited'
    else
      redirect_to @room, alert: 'Something went wrong...*sad panda*'
    end
  end
  
  def destroy
    Favorite.where(favorited_id: @room.id, user_id: current_user.id).first.destroy
    redirect_to @room, notice: 'Room is no longer in favorites'
  end
  
  private
  
  def set_room
    @room = Room.find(params[:room_id] || params[:id])
  end
end