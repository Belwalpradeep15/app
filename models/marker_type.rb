class MarkerType < ApplicationRecord
    has_many  :markers_marker_types
    has_many  :markers, through: :markers_marker_types, dependent: :destroy
    
  def self.sort_by_name(markerTypes)
      markerTypes.sort! { |a,b| a.name <=> b.name }
  end
  
  
  def image_path(size = '')
    image_file = self.image_file || "#{self.name}.png"
    
    base = "/images/marker_type_icons/"
    base + image_file
  end
end
