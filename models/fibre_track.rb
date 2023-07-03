#
#  FibreTrack.rb
#  
#
#  Created by Dallas Hockley on 11/08/08.
#  Copyright (c) 2008 Fotech Solutions. All rights reserved.
#

# This class assumes it is going to get kml with Well Known Text GIS formats in
# the <coordinates> element (form longitude,latitude,elevation) and create 2D
# point arrays and ellipsoidal distances from them along a polygon boundary
#
# This is a preliminary class as we work out the KML/GoogleMap/GoogleEarth and
# other interactions.   It most likely will be heavily refactored or rewritten
#

require 'rubygems'
require 'rexml/document'

require 'geo_ruby'

include GeoRuby::SimpleFeatures


class FibreTrack
	attr_accessor :track_length

	def initialize		
    # These represent the actual points between each line segment on the fibre track
		@track_points = []

    # Distances between each point on the track
		@delta_distances = []

    # The length of the track
		@track_length = 0.0

    # The calibrations at each point on the track
		@calibrations = nil

    # The length in meters from the start of the fibre track
		@point_distances = []
	end

  def inspect
    @delta_distances.inspect + " :: " + @point_distances.inspect + " :: " + @calibrations.inspect
  end
  
  def has_calibrations?
      !@calibrations.empty?
  end

  def self.create_from_fibre_line(fibre_line)
		fibre_track = FibreTrack.new
    fibre_line.line_string.points.each {|point| fibre_track.add(point)}

    cal_array = fibre_line.calibrations.inject([]) {|cal_array, calibration| cal_array[calibration.parent_point] = calibration.distance; cal_array}
    fibre_track.add_calibrations(cal_array)
    fibre_track
  end
	
	def add_calibrations(calibrations)
		@calibrations = calibrations
		@point_distances = [0.0]
		@delta_distances.each_with_index do |distance, index|
		  @point_distances[index] = @point_distances[index - 1] + distance unless index == 0
	  end
	end
 
  # Calculates the raw distance along the fibre line and calibrates it to accomodate a 2 dimensional 
  # coordinate system. Imagine a fibre line running the perimmiter of a fenced-in yard. EG: The distance
  # of the fibre will likely be longer than the perimmiter due to the fibre line having to account for
  # vertical displacement up/down gates.
  def to_track_distance(fibre_distance)
  
    return nil if (fibre_distance < min_distance() or fibre_distance > max_distance())
  
    last_calibration = 0
    last_calibration_index = 0

    calibrated_distance = nil
    @calibrations.each_with_index do |calibration, i|
      # next if i == 0 or i >= @point_distances.size()
      if i == 0
        if @calibrations[0] == fibre_distance
          calibrated_distance = @point_distances[0]
          break
        end
        next
      end

      unless calibration.nil?
        if fibre_distance <= calibration
          line_segment_distance = calibration - last_calibration
          track_segment_distance = @point_distances[i] - @point_distances[last_calibration_index]
          delta_line_distance = fibre_distance - last_calibration

          calibrated_distance = (delta_line_distance * track_segment_distance / line_segment_distance) + @point_distances[last_calibration_index]
          break
        else
          last_calibration = calibration
          last_calibration_index = i
        end
      end
    end
    calibrated_distance
  end

  # converts a track distance to a fibre_line distance
  def to_fibre_distance(track_distance)
    last_calibration = 0
    last_calibration_index = 0
    
    calibrated_distance = nil
    @calibrations.each_with_index do |calibration, i|
      if i == 0 
        if @point_distances[0] == track_distance && @calibrations[0]
          calibrated_distance = @calibrations[0]
          break
        end
        next
      end

      unless calibration.nil?
        point_distance = @point_distances[i]
        last_point_distance = @point_distances[last_calibration_index]

        if track_distance <= point_distance
          line_segment_distance = calibration - last_calibration
          track_segment_distance = point_distance - last_point_distance
          delta_track_distance = track_distance - last_point_distance

          calibrated_distance = (delta_track_distance * line_segment_distance / track_segment_distance) + last_calibration
          break
        else
          last_calibration = calibration
          last_calibration_index = i
        end
      end
    end
    calibrated_distance
  end

  # Computes the lng/lat for an event
  def populate_geometry(event)
    point = to_point(event.position)
    if point.nil?
        raise "Invalid distance. Events on line #{event.fibre_line_id} must be between #{min_distance} and #{max_distance}." 
    else
      event.latitude, event.longitude = point.y, point.x
    end
    event
  end

  # This method accepts distance along the fibre track and returns a 
  # geospatial position
	def to_point(inputDistance)
		distance = 0.0
	
		unless @calibrations.nil? || @calibrations.empty?
			distance = to_track_distance(inputDistance)
		else
			distance = inputDistance
		end
		
    return nil if distance.nil?
		
		for i in 1..@delta_distances.length-1 do   #@delta_distances[0] is always 0
            if (distance == @delta_distances[i])
                return @track_points[i]
            elsif (distance < @delta_distances[i])
				# it's along this segment.   Do a straight-line interpolation for lon/lat of point
                point_a, point_b = @track_points[i-1], @track_points[i]
				
				fraction = distance/@delta_distances[i]
                return nil if fraction.nan?
                
				lonDist = (point_b.lon - point_a.lon)
				latDist = (point_b.lat - point_a.lat)
				
				newLon = point_a.lon + (lonDist * fraction)
				newLat = point_a.lat + (latDist * fraction)
				
				return Point.from_x_y(newLon, newLat)
			else
				distance = distance - @delta_distances[i]
			end
		end
		return nil   #the distance is longer than the entire length of the track!
	end


  # 
  # Calculates the start and stop position (distances) along a the fibre_track for a 
  # given line. The line is an instance of GeoRuby::SimpleFeatures::LineString
  # The code checks each point of the line against the line segments of the FibreTrack.
  # If the point intersects with with line segement, we calculate the distance between
  # the intersection point and the start of the line segement
  # The returned value is an array of postions
  #
  def end_distances_for(line)
    end_points = []
    [line.first, line.last].each do |line_point|
      @track_points.each_with_index do |fibre_point, index|
        unless index == 0
          point_a, point_b = @track_points[index - 1], @track_points[index]
           if point_between_points?(line_point, point_a, point_b)
             end_points << to_fibre_distance((distance_between(index - 1, line_point)))
             break
           end
        end
      end
    end
    end_points
  end

  def end_distances_for_geometry(geometry)
    end_distances = if geometry.instance_of? GeoRuby::SimpleFeatures::LineString
      end_distances_for(geometry.points)
    elsif geometry.instance_of? GeoRuby::SimpleFeatures::MultiLineString
      geometry.geometries.map {|line| end_distances_for(line.points)}.flatten
    end
    end_distances.in_groups_of(2)
  end

    # Adds a point to the end of the fibre track
    def add(point)
      distance = calculate_distance_to(point)
      @track_length += distance
      @delta_distances.push(distance)
      @track_points.push(point)
    end

# 	private
    # Calculates the distance between a given point_on_line and a point on the track
    def distance_between(point_index, point_on_line)
      point_on_fibre = @track_points[point_index]
      distance = point_on_fibre.ellipsoidal_distance(point_on_line)

      distance_on_fibre = @point_distances[point_index]
      distance_on_fibre + distance
    end

    # Returns true if point c rests between a and b
    def point_between_points?(c, a, b)
      cross_product = (c.y - a.y) * (b.x - a.x) - (c.x - a.x) * (b.y - a.y)
      if cross_product.abs > 0.0000000001
        return false
      end

      dot_product = (c.x - a.x) * (b.x - a.x) + (c.y - a.y)*(b.y - a.y)
      if dot_product < 0
        return false
      end

      squared_length_a_b = (b.x - a.x)*(b.x - a.x) + (b.y - a.y)*(b.y - a.y)
      if dot_product > squared_length_a_b
        return false
      end

      return true
    end

    # Calculates the distance to the last point added, if there was one.
    def calculate_distance_to(point)
      @track_points.empty? ? 0 : point.ellipsoidal_distance(@track_points.last)
    end
    
  
    # Returns the minimum allowable distance for this track.
    def min_distance()
        0.upto(@point_distances.size()-1) do |i|
            if @calibrations[i]
                return @calibrations[i]
            end
        end
        return nil
    end
    
    # Returns the maximum allowable distance for this track.
    def max_distance()
        (@point_distances.size()-1).downto(0) do |i|
            if @calibrations[i]
                return @calibrations[i]
            end
        end
        return nil
    end
    
end
