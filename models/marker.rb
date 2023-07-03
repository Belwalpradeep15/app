class Marker < FotechActiveRecord
    belongs_to  :organization
    has_many    :markers_marker_types, dependent: :destroy
    has_many    :marker_types, through: :markers_marker_types

    has_many    :locations, dependent: :destroy
    has_many    :documents, through: :locations

    # These attributes are populated in after_find (when the :with_lat_lng scope is used)
    # and are used while saving in after_save.
    attr_accessor :latitude, :longitude

    scope :with_lat_lng, -> { select "markers.*, ST_Y(markers.gis_location) AS _lat, ST_X(markers.gis_location) AS _lng" }

    # Use this scope when you want to add the text version of the geometry.
    # named_scope :with_geometry, { :select => "helios_units.*, AsText(markers.location) AS location_as_text" }

    after_find do |r|
        # Update the attrs, if we have used the :with_lat_lng scope
        if r.has_attribute?(:_lat)
            r.latitude = r._lat
            r.longitude = r._lng
        end
    end

    after_save  :save_lat_lng

    def latlng=(latlng)
        latitude, longitude = latlng.split(',')
    end

    def latlng
        return "#{latitude},#{longitude}" unless latitude.nil?
        ""
    end

    # Update a single field of the given record.
    def self.update_field(marker_id, user, fieldName, value)
        if ['name'].include? fieldName
            valstr = "'#{escape_sql(value)}'"
        elsif ['description'].include? fieldName
            valstr = "'#{escape_sql(value)}'"
        elsif 'latlng' == fieldName
            fieldName = 'gis_location'
            if value == "[removed]"
            valstr = "NULL"
            else
                lat,lng = value.split(',')
                valstr = "ST_GeomFromText('POINT(#{lng} #{lat})')"
            end
        else
            raise "You cannot modify the field #{fieldName}."
        end

        sql = <<-sql
            UPDATE markers
            SET #{fieldName} = #{valstr}, updated_at = now() at time zone 'UTC'
            WHERE id = #{marker_id}
        sql

        update_one(marker_id, user, "marker", sql)
    end

    def save_lat_lng
        ActiveRecord::Base.connection.update(<<-sql)
            UPDATE markers
            SET gis_location = ST_GeomFromText('POINT(#{longitude} #{latitude})'), updated_at = now() at time zone 'UTC'
            WHERE id = #{id}
        sql
    end

end
