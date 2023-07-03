# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.


require 'georuby'
require 'geo_ruby/ewk'


class FibreLine < FotechActiveRecord
  has_and_belongs_to_many :event_categories, -> { includes :apps }
  has_many :calibrations, -> { order :distance }, dependent: :delete_all
  has_many :fibre_regions, dependent: :delete_all
  has_many :events, dependent: :delete_all
  has_many :path_segments, dependent: :delete_all

  has_one  :section_calibration, dependent: :delete

  belongs_to :organization, foreign_key: :owner_id
  belongs_to :display_type
  belongs_to :helios_unit, optional: true

  has_and_belongs_to_many :images, class_name: "Document"

  # Use this scope when you want to ignore fibres marked as deleted. We may want to
  # consider making this the default and providing a separate scope that will include
  # the deleted items when necessary.
  scope :not_deleted, -> { where deleted_at: nil }

  # Use this scope when you want to add the geometry as text.
  scope :with_geometry, -> { where(deleted_at: nil).select("fibre_lines.*, ST_AsText(fibre_lines.geom) AS geom_as_text") }

  def self.find_with_permission(fibre_id, loginname)
    return self.where("fibre_lines.id = ? AND users.loginname = ? AND organizations.deleted_at IS NULL", fibre_id, loginname).joins(organization: :users).first
  end

  # Mark all the fibre lines for a given organization as deleted.
  def self.mark_as_deleted_by_organization(organizationId, userId)
    sql = "
        UPDATE fibre_lines
        SET deleted_at = now() at time zone 'UTC', updated_at = now() at time zone 'UTC', updated_by = #{userId}
        WHERE owner_id = #{organizationId}
        "
    connection().execute(sql)
  end

  # Change the name of the fibre line.
  def self.update_name(fibreLineId, user, name)
    sql = "
        UPDATE fibre_lines
        SET name = '#{escape_sql(name)}', updated_at = now() at time zone 'UTC', updated_by = #{user.id}
        WHERE id = #{fibreLineId}
        AND   fibre_lines.deleted_at IS NULL
        AND   owner_id IN (SELECT organization_id
                           FROM   organizations_users
                           WHERE  user_id = #{user.id})
        "
    update_one(fibreLineId, user, "fibre line", sql)
  end

  def self.update_length(fibreLineId, user, length)
    sql = "
        UPDATE fibre_lines
        SET length = #{length.to_f}, updated_at = now() at time zone 'UTC', updated_by = #{user.id}
        WHERE id = #{fibreLineId}
        AND   fibre_lines.deleted_at IS NULL
        AND   owner_id IN (SELECT organization_id
                           FROM   organizations_users
                           WHERE  user_id = #{user.id})
        "
    update_one(fibreLineId, user, "fibre line", sql)
  end

  def self.update_zero_point(fibreLineId, user, zero_point)
    sql = "
        UPDATE fibre_lines
        SET zero_point = #{zero_point.to_f}, updated_at = now() at time zone 'UTC', updated_by = #{user.id}
        WHERE id = #{fibreLineId}
        AND   fibre_lines.deleted_at IS NULL
        AND   owner_id IN (SELECT organization_id
                           FROM   organizations_users
                           WHERE  user_id = #{user.id})
        "
    update_one(fibreLineId, user, "fibre line", sql)
  end

  # Change the organization of the fibre line.
  def self.update_organization(fibreLineId, user, orgId)
    sql = "
        UPDATE fibre_lines
        SET    owner_id = #{orgId}, updated_at = now() at time zone 'UTC', updated_by = #{user.id}
        WHERE  id = #{fibreLineId}
        AND    fibre_lines.deleted_at IS NULL
        AND    owner_id IN (SELECT organization_id
                            FROM   organizations_users
                            WHERE  user_id = #{user.id})
        AND EXISTS ( SELECT 1
                     FROM   organizations_users
                     WHERE  organization_id = #{orgId}
                     AND    user_id = #{user.id} )
        "
    update_one(fibreLineId, user, "fibre line", sql)
  end

  # Change the display type of the fibre line.
  def self.update_display_type(fibreLineId, user, displayTypeId)
    sql = "
        UPDATE fibre_lines
        SET    display_type_id = #{displayTypeId}, updated_at = now() at time zone 'UTC', updated_by = #{user.id}
        WHERE  id = #{fibreLineId}
        AND    fibre_lines.deleted_at IS NULL
        AND    owner_id IN ( SELECT organization_id
                             FROM   organizations_users
                             WHERE  user_id = #{user.id} )
        "
    update_one(fibreLineId, user, "fibre line", sql)
  end

    # Change the helios unit of the fibre line. This will also reset the channel number to 1 or NULL.
    def self.update_helios_unit(fibreLineId, user, heliosUnitId)
        sql = <<-SQL
            UPDATE fibre_lines
            SET    helios_unit_id = #{ heliosUnitId ? heliosUnitId : "NULL" },
                   helios_channel = #{ heliosUnitId ? 1 : "NULL" },
                   updated_by = #{ user.id },
                   updated_at = now() at time zone 'UTC'
            WHERE  id = #{fibreLineId}
            SQL
        update_one(fibreLineId, user, "fibre line", sql)
    end

    # Change the helios channel of the fibre line.
    def self.update_helios_channel(fibreLineId, user, channelNum)
        sql = <<-SQL
            UPDATE fibre_lines
            SET    helios_channel = #{ channelNum ? channelNum : "NULL" },
                   updated_by = #{ user.id },
                   updated_at = now() at time zone 'UTC'
            WHERE  id = #{ fibreLineId }
        SQL
        update_one(fibreLineId, user, "fibre line", sql)
    end

    def self.update_vertical(fibre_line_id, user, vertical_id)
        fibre_line = FibreLine.find(fibre_line_id)
        fibre_line.event_categories.delete_all
        fibre_line.event_categories = App.find(vertical_id).event_categories
    end

    # Unassign all the fibre lines associated with the given helios unit.
    def self.unassign_for_helios_unit(heliosUnitId, user)
        FibreLine.where(helios_unit_id: heliosUnitId).update_all("helios_unit_id = NULL, updated_by = #{user.id}, updated_at = now() at time zone 'UTC'")
    end

  def route
    @route ||= line_string.collect { |point| { :lat => point.lat, :long => point.lng }}
  end

  def update_route(lats, lngs)
    coords = [] # params['lat_lngs'].map { |coord| "#{coord['lng']} #{coord['lat']}" }.join(',')
    for i in 0...lats.size
      value= "#{lngs[i]} #{lats[i]}"
      coords << value.to_s.gsub('"','')
    end
    coordinates= coords.join(",")

    ActiveRecord::Base.connection.execute   <<-SQL
               UPDATE fibre_lines
               SET geom = ST_GeomFromText('LINESTRING(#{coordinates})')
               WHERE id = #{id}
    SQL
  end

  def route_array
    route.collect { |point| [point[:lat],point[:long]] }
  end

  def stringified_route
    route.collect { |point| "#{point[:lat]} #{point[:long]}" }.join(',')
  end

  def stringified_event_category_ids
    event_category_ids.join(',')
  end

  def line_string
    GeoRuby::SimpleFeatures::Geometry.from_ewkt(geom_as_text)
  end

  # Takes GPolygon coords in the form of "(y1,x1),(y2,x2),(y3,x3)"
  # and returns a Geometry that describes all the intersecting lines that are shared
  # between the FibreLine and the coords.
  # If the coords are not closed, this method will close them.
  def intersect_geometries(polygon_coords)
    poly_coords = eval(polygon_coords.gsub(/\(/, '[').gsub(/\)/, ']'))
    poly_coords.each(&:reverse!)

    # if this is a non-closed polygon, close it
    poly_coords << poly_coords.first unless poly_coords.first == poly_coords.last
    poly_ewkt = GeoRuby::SimpleFeatures::Polygon.from_coordinates([poly_coords]).as_ewkt

    geometries = connection.select_rows("SELECT AsText(ST_Intersection(geom, '#{poly_ewkt}')) as geom_as_text, ST_Intersects(geom, '#{poly_ewkt}') as does_intersect from fibre_lines where id = #{id}")
    geometry = geometries.first.first
    does_intersect = geometries.first.last
    if does_intersect == 't'
      GeoRuby::SimpleFeatures::Geometry.from_ewkt(geometry)
    else
      nil
    end
  end

  # For a given set of coordinates in the form of ((y1,x1),(y2,x2)..(yn,xn))
  # returns the corrisponding end distances. Returns [] if the coordinates are
  # not along the fibreline.
  def end_distances(polygon_coords)
    geometry = intersect_geometries(polygon_coords)

    if geometry
      value = fibre_track.end_distances_for_geometry(geometry)
    else
      value = []
    end
  end

  def fibre_track
    @fibre_track ||= FibreTrack.create_from_fibre_line(self)
  end

  def to_xml(options = {})
    return super(options) if options[:orig_to_xml]

    options[:indent] ||= 2
    xml = options[:builder] ||= Builder::XmlMarkup.new(:indent => options[:indent])

    xml.FibreLine("fibre-line-id" => id) do
      xml.Name(name)
      xml.Owner("entity-id" => owner_id)
      atts = { "display-type-id" => display_type_id }
      atts["name"] = self[:display_type_name] if !self[:display_type_name].nil?
      xml.DisplayTypeRef atts
      if !self[:geom_as_text].nil?
        xml.Route do
          route.each { |point| xml.Position point }
        end
      end
      if !self[:encoded_route].nil?
        xml.Route "encoding" => "gmap" do
          xml.Settings "num-levels" => self[:encoded_route][:numLevels], "zoom-factor" => self[:encoded_route][:zoomFactor]
          xml.Levels self[:encoded_route][:levels]
          xml.Points self[:encoded_route][:points]
        end
      end
      xml.EventCategoryIds self[:event_category_ids].join(",") if !self[:event_category_ids].nil?

      if self[:add_section_calibration] and self.section_calibration
        self.section_calibration.to_xml(options)
      end

      if self[:add_map_calibration] and !self.calibrations.empty?
        xml.Calibration "type" => "map" do
            self.calibrations.each { |cal| xml.Point "parent_point" => cal.parent_point, "distance" => cal.distance }
        end
      end

      if self[:applications]
        self[:applications].each { |app| app.to_xml(options) }
      end
    end
  end

  def include_event_category_ids_hack
    self[:event_category_ids] = event_category_ids.join(',')
  end

  # Returns true if the given application name is valid for this fibre line. Note that
  # the fibre line object must have at least the id loaded.
  def accepts_application?(appName)
      sql = \
        'SELECT 1 FROM event_categories_fibre_lines ecfl '\
        'INNER JOIN apps_event_categories aec ON aec.event_category_id = ecfl.event_category_id '\
        'INNER JOIN apps a ON a.id = aec.app_id '\
        'WHERE ecfl.fibre_line_id = ? AND a.name = ?'
      return FibreLine.record_exists?([sql, id, appName])
  end

  # Returns true if the given event type is valid for this fibre line. Note that the
  # fibre line object must have at least the id loaded.
  def accepts_event_type?(eventTypeId)
      sql = \
        'SELECT 1 FROM event_categories_fibre_lines ecfl '\
        'INNER JOIN event_types et ON et.event_category_id = ecfl.event_category_id '\
        'WHERE ecfl.fibre_line_id = ? AND et.id = ?'
      return FibreLine.record_exists?([sql, id, eventTypeId])
  end

  def encode_route(numLevels, zoomFactor)
      encoder = GMapPolylineEncoder.new( :numLevels => numLevels, :zoomFactor => zoomFactor )
      data = line_string.map { |point| [point.lat, point.lng] }
      self[:encoded_route] = encoder.encode(data)
  end

  # Find the fibre line required by the xml document and verify that it is valid for the
  # application. If it is the fibre line is returned. If it is not an exception is raised.
  def self.verify_fibre_line_from_doc(xml_doc)
    fibreLineId = xml_doc.source['fibre-line-id']
    app = xml_doc.source['application']
    fibre_line = FibreLine.with_geometry.find(fibreLineId)
    raise "The fibre line #{fibreLineId} is not valid with the application #{app}." unless fibre_line.accepts_application?(app)
    fibre_line
  end

  #
  # Search for fibrelines for a specific user. Will return nil if no records are found.
  #
  def self.find_by_user_name(id_or_symbol, username, args= {})
    user = User.find_by_loginname(username)
    fibre_line = FibreLine.not_deleted.find(id_or_symbol, {:conditions => { :owner_id => user.organization_ids }}.merge(args))
    fibre_line = nil if (fibre_line.is_a?(Array) and fibre_line.empty?)
    fibre_line
  end

  def self.find_for_organization(organization_ids = [])
    find(:all, :order => :name, :conditions => { :owner_id => organization_ids })
  end

    # If there exists any events and other things, for the fibre line then we mark it as
    # deleted. Otherwise we physically delete it.
    def self.delete_with_dependancies(fibreLineId, user)
        # First try the update.
        line = FibreLine.where("id = ? AND deleted_at IS NULL AND owner_id IN ( SELECT organization_id FROM organizations_users WHERE user_id = ? )", fibreLineId, user.id).first

        if !line
          raise "The user #{user.fullname} does not have permission to delete fibre line #{fibreLineId}."
        end

        count = FibreLine.where("id = ? AND (EXISTS ( SELECT 1 FROM events WHERE fibre_line_id = ? ) )", fibreLineId, fibreLineId).count

        # This line does not have events, delete it outright.
        SectionCalibration.where(:fibre_line_id => fibreLineId).delete_all
        Calibration.where(:fibre_line_id => fibreLineId).delete_all
        connection().execute <<-SQL
            DELETE FROM documents_fibre_lines WHERE fibre_line_id = #{fibreLineId};
            DELETE FROM event_categories_fibre_lines WHERE fibre_line_id = #{fibreLineId};
        SQL

        FibreRegion.where(:fibre_line_id => fibreLineId).destroy_all
        if count == 0
          line.destroy
        else
          #do not delete the line itself so that we can recreate this fibre when syncing to helios and we don't lose its uuid
          FibreLine.where("id = #{fibreLineId} AND fibre_lines.deleted_at IS NULL AND owner_id IN ( SELECT organization_id FROM organizations_users WHERE user_id = #{user.id} )")
              .update_all("deleted_at = now() at time zone 'UTC', updated_at = now() at time zone 'UTC', updated_by = #{user.id}")
        end
    end

    # Compute the active range of a fibre and return it as a hash containing :startDistance
    # and :length items. This will raise an exception if the calibrations for the line
    # have not been loaded.
    def compute_active_range()
        zeroPoint = get_zero_point()
        return { :startDistance => zeroPoint, :length => get_physical_fibre_length() - zeroPoint }
    end

    # Return the fibre zero point as specified in the properties. Defaults to 0 if no value
    # is found.
    def get_zero_point
        return zero_point || 0.0
    end


    # Return the physical fibre length of the line as specified in the properties. Defaults
    # to 1000 if no value is found.
    def get_physical_fibre_length
        return length || 1000.0
    end

    # the break position stored is zero relative, this method will grab the absolute break_position on the line
    def abs_break_position
        return nil if break_position.nil?
        break_position + self.get_zero_point
    end

    # helper to check if fibre is broken
    def is_broken?
        !break_position.nil?
    end

    # Return a hash from fibre line id to an array of event category ids for that line. This
    # call is used at main application startup to reduce the large number of SQL statements
    # that are being generated by the standard ActiveRecord calls.
    def self.get_event_category_ids_for_fibre_lines(fibre_lines)
        return {} if not fibre_lines or fibre_lines.size == 0

        ret = {}
        fibreLineIds = []
        fibre_lines.each { |line|
            fibreLineIds << line.id
            ret[line.id] = []
        }

        sql = "
        SELECT fibre_line_id, event_category_id
        FROM   event_categories_fibre_lines
        WHERE  fibre_line_id IN (#{ fibreLineIds.join(',') })
        "
        records = connection().select_all(sql)
        records.each { |rec| ret[ rec['fibre_line_id'].to_i ] << rec['event_category_id'].to_i }
        return ret
    end

    def geo_calibrations
        route = route_array
        cals = calibrations.inject({}) {|memo, item| memo[item.parent_point] = item; memo }
        logger.info ">>>>>>>"

        route.each_with_index do |point, index|
            if (cals[index])
                cals[index].latitude = point[0]
                cals[index].longitude = point[1]
            else
                cals[index] = Calibration.new(:parent_point => index, :latitude => point[0], :longitude => point[1])
            end

        end
        cals.values.sort {|a,b| a.parent_point <=> b.parent_point}
    end

     # Resolve the fibre break on the given line if there is one. Returns the fibre
     # line object.
     def self.resolve_fibre_break(fibre_line_id)
         fibre_line = FibreLine.not_deleted.find(fibre_line_id)
         return fibre_line \
             if fibre_line.break_position.nil?

         fibre_line.break_position = nil
         return nil \
             unless fibre_line.save

         return fibre_line
     end

     # Resolve all active fibre breaks.
     def self.resolve_all_fibre_breaks(userId)
         FibreLine.update_all({ :break_position => nil, :updated_at => Time.now.utc, :updated_by => userId },
                              "break_position IS NOT NULL AND deleted_at IS NULL")
     end

  protected #-------------------------------------------------------------------

    # Perform a search as required by the search_controller infrastructure.
    def self.do_find(conditions, options, joins)
      suppress_route = options.suppress? "Route"
      enc_route = options.encode_polygon "Route"
      select = "fibre_lines.*"
      select << ", AsText(fibre_lines.geom) as geom_as_text" if !suppress_route || !enc_route.nil?
      select << ", (SELECT name FROM display_types dt WHERE dt.id = fibre_lines.display_type_id) AS display_type_name" if options.add? "DisplayTypeName"
      results = not_deleted.where(conditions).select(select).joins(joins).order(options.order).limit(options.limit)

      if enc_route
        results.each do |fibre_line|
          fibre_line.encode_route(enc_route[:"num-levels"].to_i, enc_route[:"zoom-factor"].to_i)
          fibre_line.geom_as_text = nil if suppress_route
        end
      end

      if options.add? "EventCategoryIds" and !results.empty?
        fibreLineIds = results.collect { |fl| fl.id }.join(",")
        res = find_by_sql("SELECT * FROM event_categories_fibre_lines WHERE fibre_line_id IN (#{fibreLineIds})")
        res.each { |rec|
            line = results.find { |fl| fl.id == rec.fibre_line_id.to_i }
            if line
                if line[:event_category_ids]
                    line[:event_category_ids] << rec.event_category_id
                else
                    line[:event_category_ids] = [ rec.event_category_id ]
                end
            end
        }
      end

      if options.add? "SectionCalibration" and !results.empty?
        results.each { |fl| fl[:add_section_calibration] = true }
      end

      if options.add? "MapCalibration" and !results.empty?
        results.each { |fl| fl[:add_map_calibration] = true }
      end

      if options.add? "Application" and !results.empty?
        results.each do |line|
            line[:applications] = App.find_by_fibre_line(line.id)
        end
      end

      results
    end

    def self.field_mappings
      @@FIELD_MAPPING
    end

    def self.field_joins
      @@FIELD_JOINS
    end

  private #---------------------------------------------------------------------

    @@FIELD_MAPPING = {
      "FibreLineId" => { :field => 'fibre_lines.id' },
      "OwnerId"     => { :field => 'fibre_lines.owner_id' },
      "Name"        => { :field => 'fibre_lines.name', :quoted => true },
      "Application" => { :field => 'apps.name', :quoted => true }
    }

    @@FIELD_JOINS = {
      "Application" =>
           %{INNER JOIN (\
                SELECT DISTINCT a1.*, ecfl.fibre_line_id FROM apps a1 \
                INNER JOIN apps_event_categories aec ON aec.app_id = a1.id \
                INNER JOIN event_categories_fibre_lines ecfl ON ecfl.event_category_id = aec.event_category_id \
             ) apps ON apps.fibre_line_id = fibre_lines.id
            }
    }
end

