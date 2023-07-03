# FILENAME:     event.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2008-12-23
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2008 by Fotech Solutions. All rights
# reserved.

require 'FotechXML'
require 'FotechDB'


class Event < FotechActiveRecord
  attr_accessor :application
  belongs_to :fibre_line, -> { select "*, AsText(geom) as geom_as_text" }
  belongs_to :event_type
  belongs_to :event_track
  has_many   :event_tags

  validates_numericality_of :fibre_line_id, :only_integer => true
  validates_numericality_of :event_type_id, :only_integer => true
  validates_numericality_of :position
  validates_numericality_of :confidence, :greater_than_or_equal_to => 0.0, :less_than_or_equal_to => 1.0, :message => 'Confidence must be between 0.0 and 1.0'
  validates_numericality_of :amplitude, :greater_than_or_equal_to => 0.0, :message => 'Amplitude cannot be negative.'

  # Use this scope when you want to add the text version of the geometry.
  scope :with_geometry, -> { select "events.*, AsText(events.location) AS location_as_text" }
  scope :after, ->(time) { where("updated_at > ?", time) }

    # Return the value of the tag with the given key.
    def tag(key)
        self.event_tags.each { |et| return et.value if et.key == key }
        return nil
    end

  # Provide public access to writing the latitude.
  def latitude=(lat)
    write_attribute(:latitude, lat)
  end

  # Provide public access to reading the latitude.
  def latitude
    read_attribute(:latitude)
  end

  # Provide public access to writing the longitude.
  def longitude=(lng)
    write_attribute(:longitude, lng)
  end

  # Provide public access to reading the longitude.
  def longitude
    read_attribute(:longitude)
  end

  # Helper method that takes the position, velocity and width to determine the head of the event
  def head
    direction = self.velocity > 0 ? 1 : -1
    self.position + (self.width/2 * direction)
  end

  # Helper method that takes the position, velocity and width to determine the tail of the event
  def tail
    direction = self.velocity > 0 ? 1 : -1
    self.position - (self.width/2 * direction)
  end


  def self.new_from_xml(xml, fibre_line = nil)
    xml_doc = (xml.is_a? String) ? XmlSupport::XmlDocument.create(xml) : xml

    event = Event.new do |event|
      event.time          = xml_doc.time
      event.position      = xml_doc.distance_on_line.to_f
      event.width         = (xml_doc.width ? xml_doc.width.to_f : 1.0)
      event.velocity      = (xml_doc.velocity ? xml_doc.velocity.to_f : 0.0)
      event.acceleration  = (xml_doc.acceleration ? xml_doc.acceleration.to_f : 0.0)
      event.amplitude     = xml_doc.magnitude.to_f
      event.event_type_id = EventType.find_by_name(xml_doc.event_type["name"]).id
      event.confidence    = xml_doc.event_type["confidence"].to_f
      event.fibre_line_id = xml_doc.source['fibre-line-id'].to_i
      event.application   = xml_doc.source['application']
    end

    if fibre_line.nil?
        fibre_line = FibreLine.verify_fibre_line_from_doc(xml_doc)
    else
        raise "Invalid fibre_line.id!" if event.fibre_line_id != fibre_line.id
    end
#    raise "The fibre line #{fibre_line.id} is not valid with the event type  #{event.event_type_id}." unless fibre_line.accepts_event_type?(event.event_type_id)

    track = fibre_line.fibre_track
    track.populate_geometry(event)
    event
  end

  # Render the event as xml.
  def to_xml(options = {})
    # Setup the xml witer.
    xml = options[:builder] ||= Builder::XmlMarkup.new(options)

    # Write out the event.
    xml.Event("event-id" => id) do
        atts = { "fibre-line-id" => fibre_line_id }
        atts["application"] = self[:application] if !self[:application].nil?
        xml.Source atts
        xml.EventType "type-id"=>event_type_id, "confidence"=>confidence
        xml.Time FotechDB::formatTime(time)
        xml.Magnitude amplitude
        xml.Location do
            xml.DistanceOnLine position
            xml.Width width
            xml.Velocity velocity
            xml.Acceleration acceleration
            xml.Latitude latitude if latitude
            xml.Longitude longitude if longitude
        end
        xml.TagInfoString tag_info_string
    end
  end

    def to_json(options={})
        options[:include] ||= []
        options[:include] = [options[:include]] if options[:include].is_a?(Symbol)
        options[:include] << :event_tags unless options[:include].include? :tag_info_string
        super(options)
    end

    # Returns the mapping from XML field names to DB settings.
    def self.field_mappings
      @@FIELD_MAPPING
    end

    # Returns the necessary XML field joins.
    def self.field_joins
      @@FIELD_JOINS
    end

    # Implement the find for our XML searches.
    def self.do_find(conditions, options, joins)
        opts = {}
        opts[:conditions] = conditions

        # The following options should be automatically set for all searchable types. I'll add
        # them here for now just so I can get the demo working.
        opts[:order] = options.order if !options.order.nil?
        opts[:limit] = options.limit if !options.limit.nil?
        opts[:joins] = joins

        select = "events.*"
        select.concat(", ST_Y(events.location) AS latitude") if !options.suppress? 'Latitude'
        select.concat(", ST_X(events.location) AS longitude") if !options.suppress? 'Longitude'
        opts[:select] = select

        find(:all, opts)
    end

    # Purge events and event related data older than the given number of days. Returns
    # the number of events that were removed.
    def self.purge_historical_data(days)
        cutoff = Time.now - (days * 24 * 60 * 60)
        cutoffSql = FotechDB::formatTime(cutoff)

        conn = connection()
        numDeleted = conn.execute( " DELETE FROM event_tags WHERE event_id IN (SELECT id FROM events WHERE time < '#{cutoffSql}');" ).cmd_tuples

        conn.execute <<-SQL
            DELETE FROM event_tracks 
            WHERE id NOT IN ( 
                SELECT event_track_id FROM events
            );
        SQL

        return numDeleted
    end

  private

    @@FIELD_JOINS = {
        "OwnerId" => "INNER JOIN fibre_lines fl ON fl.id = events.fibre_line_id",
        "EventType" => "INNER JOIN event_types et ON et.id = events.event_type_id"
    }

    @@FIELD_MAPPING = {
      "FibreLineId" => { :field => 'events.fibre_line_id' },
      "EventId" => { :field => 'events.id' },
      "Time" => { :field => 'events.time', :quoted => true, :isTime => true },
      "EventTypeId" => { :field => 'events.event_type_id' },
      "Magnitude" => { :field => 'events.amplitude' },
      "DistanceOnLine" => { :field => 'events.position' },
      "Width" => { :field => 'events.width' },
      "Velocity" => { :field => 'events.velocity' },
      "Acceleration" => { :field => 'events.acceleration' },
      "Confidence" => { :field => 'events.confidence' },
      "OwnerId" => { :field => 'fl.owner_id' },
      "Location" => { :field => 'events.location', :isSpatial => true },
      "Position" => { :field => 'events.position' },
      "EventType" => { :field => 'et.name', :quoted => true }
    }
end
