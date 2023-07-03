class Calibration < ApplicationRecord
  attr_accessor :latitude, :longitude
  belongs_to :fibre_line

  validate :validate_lat_long_in_range

  def validate_lat_long_in_range
    errors.add(:longitude, "Longitude '#{self.longitude}' must be between -180 <> 180") unless self.longitude.to_f.between?(-180, 180)
    errors.add(:latitude, "Latitude '#{self.latitude}' must be between -90 <> 90") unless self.latitude.to_f.between?(-90, 90)
  end

  def self.new_from_array(calibration_array)
    calibrations = []
    calibration_array.each_with_index do |item,index|
      unless item.empty?
        calibrations << Calibration.new(:parent_point => index, :distance => item.to_f)
      end
    end
    calibrations
  end

  def distance_to(other_cal)
    r = 6371 # km
    dLat = to_radians(other_cal.latitude-self.latitude)
    dLon = to_radians(other_cal.longitude-self.longitude)
    lat1 = to_radians(self.latitude)
    lat2 = to_radians(other_cal.latitude)

    a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2)
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    d = r * c
  end

  def to_radians(deg)
    deg * Math::PI / 180
  end
end
