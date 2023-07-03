# FILENAME:     reference_point.rb
# AUTHOR:       ksimard
# CREATED ON:   2010.09.12
#
# DESCRIPTION:
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2010 Fotech Solutions Ltd. All rights reserved.



class ReferencePoint < FotechActiveRecord
    belongs_to  :organization
    has_many    :documents_reference_points, dependent: :destroy
    has_many    :documents, through: :documents_reference_points

    # These attributes are populated in after_find (when the :with_lat_lng scope is used)
    # and are used while saving in after_save.
    attr_accessor :latitude, :longitude

    scope :with_lat_lng, -> { select "reference_points.*, ST_Y(reference_points.location) AS _lat, ST_X(reference_points.location) AS _lng" }

    # Use this scope when you want to add the text version of the geometry.
    scope :with_geometry, -> { select "helios_units.*, AsText(reference_points.location) AS location_as_text" }

    after_find do |r|
        # Update the attrs, if we have used the :with_lat_lng scope
        if r.has_attribute?(:_lat)
            r.latitude = r._lat
            r.longitude = r._lng
        end
    end

    after_save  :save_lat_lng

    def latlng=(latlng)
        latitude,longitude = latlng.split(',')
    end

    def latlng
        return "#{latitude},#{longitude}" unless latitude.nil?
        ""
    end

        # Update a single field of the given record.
    def self.update_field(reference_point_id, user, fieldName, value)
        if ['label'].include? fieldName
            valstr = "'#{escape_sql(value)}'"
        elsif 'latlng' == fieldName
            fieldName = 'location'
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
            UPDATE reference_points
            SET #{fieldName} = #{valstr}, updated_at = now() at time zone 'UTC'
            WHERE id = #{reference_point_id}
        sql

        update_one(reference_point_id, user, "reference point", sql)
    end

    def save_lat_lng
        ActiveRecord::Base.connection.update(<<-sql)
            UPDATE reference_points
            SET location = ST_GeomFromText('POINT(#{longitude} #{latitude})'), updated_at = now() at time zone 'UTC'
            WHERE id = #{id}
        sql
    end

end
