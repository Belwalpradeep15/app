# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2008 by Fotech Solutions. All rights
# reserved.

class EventType < FotechActiveRecord
  belongs_to :event_category
  has_one :threat_configuration
  has_many :events

  def self.get_active
    where("name in ('fibre_break', 'unknown') OR exists (select * from threat_configurations where event_types.id = threat_configurations.event_type_id)")
  end

  def self.do_find(conditions, options, joins)
    find(:all, :conditions => conditions, :joins => joins, :order => options.order, :limit => options.limit)
  end

  def is_active?
    (['fibre_break', 'unknown','wheel_sensor'].include? self.name) || !threat_configuration.nil?
  end

  def in_use?
    !!(is_active? && self.events.count)
  end
  def description
    read_attribute(:description) || I18n.t("model.event_type.description.#{ self.name }")
  end

  def image_path(size = '')
    image_file = self.image_file || "#{self.name}.png"

    base = "/images/fotech/fibre/"
    base += "#{size}_" if ['small', 'large'].include? size
    base + "event_markers/" + image_file
  end

  def to_xml(options = {})
    options[:indent] ||= 2
    xml = options[:builder] ||= Builder::XmlMarkup.new(:indent => options[:indent])

    xml.EventType("event-type-id" => id) do
      xml.Name(name)
      xml.Description(self.description, :locale => :en)
      xml.Category("event-category-id" => event_category_id)
    end
  end

    # Add the internationalized descriptions to any event types in the array and sort
    # the array by description. Note that this adds a :description field to each event
    # type.
    def self.sort_by_description(eventTypes)
        eventTypes.sort { |a,b| a.description <=> b.description }
    end

    # Find the event types that are valid for a given set of fibre lines.
    def self.find_by_fibre_line_ids(fibreLineIds)
        return [] if fibreLineIds.empty?

        return find(:all,
            :select => "DISTINCT event_types.*",
            :conditions => "ecfl.fibre_line_id IN (#{fibreLineIds.join(',')})",
            :joins => "INNER JOIN event_categories_fibre_lines ecfl ON ecfl.event_category_id = event_types.event_category_id")
    end

    def self.get_event_type_description(event_types)
      event_types_hash = {}
      event_types.each{|event_type|
        event_types_hash["#{event_type.name}_alert"] = event_type.description
      }
      event_types_hash
    end

    # Remove all references to this event type in any events and event tracks. This will be done
    # by changing the event type of those events to be 'unknown' and adding an event tag to each
    # such event that records what the previous event type was.
    def remove_event_references
      ActiveRecord::Base.connection.execute <<-SQL
            INSERT INTO event_tags(event_id, key, value, visible, created_at)
              SELECT id, 'previous_event_type', '#{name}', true, now() at time zone 'UTC'
              FROM events
              WHERE event_type_id = #{id};
        SQL

      unknownType = EventType.where("name = 'unknown'").first
      Event.where(event_type_id: id).update_all("event_type_id = #{unknownType.id}, updated_at = now() at time zone 'UTC'")
      EventTrack.where(event_type_id: id).update_all("event_type_id = #{unknownType.id}, updated_at = now() at time zone 'UTC'")
    end


  protected

  def self.field_mappings
    @@FIELD_MAPPING
  end

  def self.field_joins
    @@FIELD_JOINS
  end

  @@FIELD_JOINS = {
    "Application" =>
      %{INNER JOIN apps_event_categories on "apps_event_categories".event_category_id = "event_types".event_category_id \
        INNER JOIN apps ON "apps".id = "apps_event_categories".app_id}
    }

  @@FIELD_MAPPING = {
    "EventTypeId"     => { :field => 'id' },
    "Name"            => { :field => 'name', :quoted => true },
    "Description"     => { :field => 'description', :quoted => true },
    "EventCategoryId" => { :field => 'event_category_id' },
    "Application"     => { :field => 'apps.name', :quoted => true }
  }

end
