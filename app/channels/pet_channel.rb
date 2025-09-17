class PetChannel < ApplicationCable::Channel
  def subscribed
    stream_from "pet_#{params[:pet_id]}"
  end

  def unsubscribed
    # Any cleanup needed when channel is unsubscribed
  end
end
