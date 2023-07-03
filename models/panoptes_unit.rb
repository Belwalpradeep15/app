# COPYRIGHT:
# This file is Copyright © 2019 Fotech Solutions Ltd. All rights reserved.

require 'set'
require 'rexml/document'

class PanoptesUnit < FotechActiveRecord

    scope :with_lat_lng, -> { select "panoptes_units.*, ST_Y(panoptes_units.location) AS latitude, ST_X(panoptes_units.location) AS longitude" }

    # Use this scope when you want to add the text version of the geometry.
    scope :with_geometry, -> { select "panoptes_units.*, AsText(panoptes_units.location) AS location_as_text" }

    def latlng=(latlng)
        latitude,longitude = latlng.split(',')
    end

    def latlng
        return "#{latitude},#{longitude}" unless latitude.nil?
        ""
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


    # Update a single field of the given record.
    def self.update_field(panoptesUnitId, user, fieldName, value)
        if Set.new(['name', 'serial_number', 'host_name',]).include? fieldName
            valstr = "'#{escape_sql(value)}'"
        elsif 'ws_port' == fieldName
            valstr = value.to_i.to_s
        elsif 'is_active' == fieldName
            valstr = (value == '1' ? 'true' : 'false')
        elsif 'latlng' == fieldName
                fieldName = 'location'
            if value == "[removed]"
                valstr = "NULL"
            else
                lat,lng = value.split(',')
                valstr = "ST_GeomFromText('POINT(#{lng.to_f.to_s} #{lat.to_f.to_s})')"
            end
        else
            raise "You cannot modify the field #{fieldName}."
        end

        sql = "
            UPDATE panoptes_units
            SET #{fieldName} = #{valstr}, updated_at = now() at time zone 'UTC'
            WHERE id = #{panoptesUnitId}
            "

        update_one(panoptesUnitId, user, "panoptes unit", sql)
    end

    # Delete a Panoptes unit together with all it's dependancies.
    def self.delete_with_dependancies(panoptesId)
        PanoptesUnit.where(id: panoptesId).destroy_all
    end
end