# FILENAME:     t.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2009-05-25
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
# This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.

require 'fotech/unit_conversions'


class Admin::FibreLinesController < AdminController
    include ActionView::Helpers::JavaScriptHelper
    before_action :security_check, :except => [:section_image]

    # Entry point to the fibre line administration pages.
    def index
        setup_data
        @menu = setup_admin_menu
        @distance_units = get_preference('units-distance')[:value]
        @distance_precision = get_preference('precision-distance')[:value]
        @title = I18n.t('admin.fibre_lines.title')
        render :layout => "admin"
    end

    # Modify an existing fibre line.
    def update
        begin
            rerenderAll = false
            FibreLine.transaction do
                if params[:field] == 'name'
                    FibreLine.update_name(params[:id], current_user, params[:value])
                elsif params[:field] == 'organization'
                    FibreLine.update_organization(params[:id], current_user, params[:value].to_i)
                elsif params[:field] == 'display' and can? :calibrate, :fibre_lines
                    FibreLine.update_display_type(params[:id], current_user, params[:value].to_i)
                elsif params[:field] == 'helios_unit_id' and can? :manage, :helios_units and can? :calibrate, :fibre_lines
                    FibreLine.update_helios_unit(params[:id], current_user, (params[:value] == "" ? nil : params[:value].to_i))
                    rerenderAll = true      # since this will also affect the helios_channel field
                elsif params[:field] == 'helios_channel' and can? :manage, :helios_units and can? :calibrate, :fibre_lines
                    FibreLine.update_helios_channel(params[:id], current_user, (params[:value] == "" ? nil : params[:value].to_i))
                elsif params[:field] == 'vertical' and can? :manage, :fibre_lines
                    FibreLine.update_vertical(params[:id], current_user, params[:value].to_i)
                elsif params[:field] == 'zero_point' and can? :manage, :fibre_lines
                    FibreLine.update_zero_point(params[:id], current_user, params[:value].to_f)
                elsif params[:field] == 'length' and can? :manage, :fibre_lines
                    FibreLine.update_length(params[:id], current_user, params[:value].to_f);
                else
                    security_breach
                end
            end
            @error = nil
            @formId = 'row_' + params[:id]
        rescue => exception
            log_exception(exception)
            @error = exception
        end

        if rerenderAll
            render :template => "/admin/create.js"
        else
            render :template => "/admin/update.js"
        end
    end

    # Create a new fibre line.
    def create
        security_breach unless can? :add, :fibre_lines
        begin
            FibreLine.transaction do
                fibre = FibreLine.new
                fibre.name = params[:name]
                fibre.owner_id = params[:organization].to_i
                fibre.display_type_id = params[:display].to_i
                fibre.created_by = current_user.id
                fibre.zero_point = 0
                fibre.length = 1000
                fibre.save

                fibre.update_route([ 51.25567, 51.25567 ], [ -0.92044, -0.92045 ])
                fibre.event_categories = App.find_by_name('general').event_categories
            end
            @error = nil
        rescue => ex
            @error = ex
        end
        @dialogId = "fibre_line_dialog"
        render :template => "/admin/create.js"
    end

    # Delete an existing fibre line.
    def destroy
        security_breach unless can? :delete, :fibre_lines
        begin
            FibreLine.transaction do
                FibreLine.delete_with_dependancies(params[:id].to_i, current_user)
            end
            @error = nil
            @id = params[:id]
        rescue => exception
            log_exception exception
            @error = exception
        end

        render :template => "/admin/destroy.js"
    end

    # insert splice for the
    def insert_splice
        if request.post?
            FibreLine.transaction do
                fibre_line = FibreLine.with_geometry.find(params[:id])

                splice_position = params[:position].to_f
                splice_length = params[:length].to_f

                File.open("/var/log/Fotech/splice.log","a") do |f|
                    f.puts "-" * 80
                    f.puts "#{Time.now} - Splice attempt at position #{splice_position}m with length #{splice_length}m"
                end

                #update fibre length
                fibre_line.length = fibre_line.length + splice_length

                #update zero point
                if splice_position < fibre_line.zero_point
                    fibre_line.zero_point = [splice_position, fibre_line.zero_point + splice_length].max
                end
                fibre_line.save

                #update map calibrations
                fibre_line.calibrations.each do |c|
                    if splice_position < c.distance
                        c.distance = [splice_position, c.distance + splice_length].max
                        c.save
                    end
                end

                #update section diagram calibration
                if fibre_line.section_calibration
                    fibre_line.section_calibration.fibre_distances.collect! do |fibre_distance|
                        if splice_position < fibre_distance
                            [splice_position, fibre_distance + splice_length].max
                        else
                            fibre_distance
                        end
                    end
                    fibre_line.section_calibration.x_offsets = fibre_line.section_calibration.x_offsets
                    fibre_line.section_calibration.y_offsets = fibre_line.section_calibration.y_offsets
                    fibre_line.section_calibration.save
                end

                #update fibre regions
                fibre_line.fibre_regions.each do |region|
                    #cache current end position before we alter the starting position
                    end_position = (region.starting_position + region.length)

                    if splice_position < region.starting_position
                        region.starting_position = [splice_position, region.starting_position + splice_length].max
                    end

                    if splice_position < end_position
                        end_position = [splice_position, end_position + splice_length].max
                    end

                    if region.starting_position == end_position
                        File.open("/var/log/Fotech/splice.log","a") do |f|
                            f.puts "Fibre region '#{region.description}' determined to be cut out due to splice. Region will be deleted."
                        end
                        region.destroy
                    else
                        region.length = end_position - region.starting_position
                        region.save
                    end
                end

                # Update routes.
                fibre_line.path_segments.each do |path_segment|
                    edges_less_than_splice_position = 0

                    if path_segment.start_distance >= splice_position
                        path_segment.start_distance += splice_length
                        if path_segment.start_distance < splice_position
                            path_segment.start_distance = splice_position
                            edges_less_than_splice_position += 1
                        end
                    end

                    if path_segment.end_distance >= splice_position
                        path_segment.end_distance += splice_length
                        if path_segment.end_distance < splice_position
                            path_segment.end_distance = splice_position
                            edges_less_than_splice_position += 1
                        end
                    end

                    if edges_less_than_splice_position >= 2
                        File.open("/var/log/Fotech/splice.log","a") do |f|
                            f.puts "Path segment id='#{path_segment.id}' determined to be cut out due to splice. Path segment will be deleted."
                        end
                        path_segment.destroy
                    else
                        path_segment.save
                    end
                end
            end
        end

        File.open("/var/log/Fotech/splice.log","a") do |f|
            f.puts "Splice attempt successful."
        end

        render :template => "/admin/create.js"
    rescue => ex
        File.open("/var/log/Fotech/splice.log","a") do |f|
            f.puts "Exception occured during splice attempt"
        end

        raise ex
    end

    # Setup a page for performing the map calibration on a fibre line (GET) or save
    # the calibration (POST).
    def map_calibrate
        @initial_map_type = APP_CONFIG['monitor']['initial_map_type']
        preference = Preference.where(user_id: current_user.id, key: 'initial-map-type').first
        @initial_map_type = preference.value if !preference.nil? && APP_CONFIG['monitor']['map_layers'].keys.include?(preference.value)

        if request.get?
            get_map_calibration
        elsif request.post?
            security_breach unless can? :calibrate, :fibre_lines
            set_map_calibration
        end
    end

    # Setup a page for performing the section (engineering) calibration on a fibre line (GET)
    # or save the calibration for the fibre line (POST).
    def section_calibrate
        begin
            if request.get?
                get_section_calibration
            elsif request.post?
                security_breach unless can? :calibrate, :fibre_lines
                set_section_calibration
            end
        #rescue => ex
        #    @error = ex
        #    @dialogId = "content"
        #    render :template => "/admin/create.js"
        end
    end

    def download_manual_calibration
        set_unit_prefs
        @latlng_units = get_preference('units-latlng')[:value]
        @latlng_precision = get_preference('precision-latlng')[:value]
        @fibre_line = FibreLine.with_geometry.find(params[:id])
        @calibrations = @fibre_line.geo_calibrations
        @calibrations.sort_by{|x| x.parent_point}
        filename = "#{@fibre_line.id}_manual_calibrations.csv"

        if request.env['HTTP_USER_AGENT'] =~ /msie/i
            headers['Pragma'] = 'public'
            headers["Content-type"] = "text/plain"
            headers['Cache-Control'] = 'no-cache, must-revalidate, post-check=0, pre-check=0'
            headers['Content-Disposition'] = "attachment; filename=\"#{filename}\""
            headers['Expires'] = "0"
        else
            headers["Content-Type"] ||= 'text/csv'
            headers["Content-Disposition"] = "attachment; filename=\"#{filename}\""
        end

        render :template => 'admin/fibre_lines/download_manual_calibration.csv', :layout => false
    end

    def upload_manual_calibrations_csv
        security_breach unless can? :calibrate, :fibre_lines
        set_unit_prefs
        @latlng_units = get_preference('units-latlng')[:value]
        @latlng_precision = get_preference('precision-latlng')[:value]
        @fibre_line = FibreLine.with_geometry.find(params[:id])

        @calibrations = {}

        csvString = params['csv']
        csv = csvString.read.split(/[\r\n]+/)
        csv = csv.collect{|x| x.split(/,/)}
        headers = csv.shift

        match = headers[0].match(/\((.*)\)/)
        lat_units = match ? match[1] : 'deg_dec'
        match = headers[1].match(/\((.*)\)/)
        lng_units = match ? match[1] : 'deg_dec'
        match = headers[2].match(/\((.*)\)/)
        units = match ? match[1] : 'm'

        begin
            FibreLine.transaction do
                @fibre_line.calibrations.delete_all
                @fibre_line.calibrations.reload

                longs = []
                lats = []

                index = 0
                csv.each do |lat,lng,distance|

                    new_lat, new_lng = UnitConversions.convertLatLng(lat.to_s.tr('"', ''), lng.to_s.tr('"', ''), lat_units, 'deg_dec', @latlng_precision)
                    new_distance = distance.nil? ? nil : UnitConversions.convert(distance.to_f, units, 'm')
                    cal = {:parent_point => lats.length,
                           :latitude => new_lat,
                           :longitude => new_lng,
                           :distance => new_distance}
                    lats << new_lat
                    longs << new_lng
                    #ignore dummy property for distance conversion
                    unless cal[:distance].nil?
                        cal = @fibre_line.calibrations.create(cal)
                        raise "Invalid values supplied during calibration upload #{cal.errors.inspect}" if cal.invalid?
                    end
                end

                @fibre_line.update_route(lats, longs)
            end
        rescue Exception => ex
            logger.error "Exception #{ex.message}"
            flash[:error] = I18n.t("admin.fibre_lines.man_cal.file_csv_error")
        end

        redirect_to "/admin/fibre_lines/#{@fibre_line.id}/manual_calibration"
    end

    def manual_calibration
        set_unit_prefs
        if request.get?
            @fibre_line = FibreLine.with_geometry.find(params[:id])
            @calibrations = @fibre_line.geo_calibrations
            if flash.key? :error
                @error = flash[:error]
            end
           #render :template => 'admin/fibre_lines/manual_calibration'

        elsif request.put?
            security_breach unless can? :calibrate, :fibre_lines

            @fibre_line = FibreLine.includes(:calibrations).find(params[:id])

            @calibrations = params['fibre_line'] ? params['fibre_line']['calibration'].permit! : {}

            FibreLine.transaction do
                @fibre_line.calibrations.delete_all
                @fibre_line.calibrations.reload

                longs = []
                lats = []

                @calibrations.keys.sort{|a,b| a.to_i <=> b.to_i}.each_with_index do |cal_id, index|
                    lats << @calibrations[cal_id]['latitude']
                    longs << @calibrations[cal_id]['longitude']
                    #ignore dummy property for distance conversion
                    @calibrations[cal_id].delete('distance_raw')
                    @calibrations[cal_id].delete('latitude_raw')
                    @calibrations[cal_id].delete('longitude_raw')
                    if @calibrations[cal_id]['distance'].empty?
                        @fibre_line.calibrations.build(@calibrations[cal_id]) do |c|
                            c.parent_point = index
                        end
                    else
                        @fibre_line.calibrations.create(@calibrations[cal_id]) do |c|
                            c.parent_point = index
                        end
                    end
                end

                @window_close = true

                begin
                    @fibre_line.update_route(lats, longs)
                rescue
                    # FIXME - A better, translated error message
                    @error = "Unable to save route details"
                    @window_close = false
                end

                @calibrations = @fibre_line.calibrations
            end
        end
    end

    def grab_coordinates(parent, child)
        if parent == 'LineString'
            return child['coordinates'].strip
        elsif child.class == Array
            child.each do |element|
                coords = grab_coordinates(parent, element)
                if coords
                    return coords
                end
            end
        elsif child.class == Hash
            child.each_pair do |key, value|
                coords = grab_coordinates(key, value)
                if coords
                    return coords
                end
            end
        else
            return nil
        end
        return nil
    end

    def upload_calibrations
        @distance_units = get_preference('units-distance')[:value]
        @distance_precision = get_preference('precision-distance')[:value]
        kml = Hash.from_xml(params['kml'])
        @fibre_line = FibreLine.with_geometry.find(params[:id])

        begin
            coordinates = grab_coordinates 'kml', kml['kml']
            lat_lngs = coordinates.split(' ').collect {|pair| pair.split(',')}

            @calibrations = []
            lat_lngs.each_with_index do |lat_lng, index|
                @calibrations << Calibration.new(:latitude => lat_lng[1].to_f, :longitude => lat_lng[0].to_f) do |c|
                    c.parent_point = index
                end
            end

            #try to keep existing calibration distances
            old_cals = @fibre_line.geo_calibrations

            # by 'shorter' i mean line with the least amount of calibrations
            if(old_cals.length < @calibrations.length)
                shorter_line = old_cals
                longer_line = @calibrations
            else
                shorter_line = @calibrations
                longer_line = old_cals
            end

            #create a big sparse matrix of distance between points of the old and new cals
            distance_matrix = Array.new(shorter_line.length){Array.new(longer_line.length)}
            shorter_line.each_with_index do |new_cal,i|
                longer_line.each_with_index do |old_cal, j|
                    distance_matrix[i][j] = new_cal.distance_to(old_cal)
                end
            end

            # for each list of distances, find the min, and "pair" those up
            used_indexes = []
            distance_matrix.each_with_index do |distances,new_cal_index|
                min_index = 0
                distances.each_with_index do |d, old_cal_index|
                    if d < distances[min_index]
                        min_index = old_cal_index
                    end
                end

                unless used_indexes.include? min_index
                    #check if the other point agrees that that is the best match
                    if distance_matrix.collect{|x| x[min_index]}.min == distances[min_index]
                        if(shorter_line == old_cals)
                            longer_line[min_index].distance = shorter_line[new_cal_index].distance
                        else
                            shorter_line[new_cal_index].distance = longer_line[min_index].distance
                        end

                        used_indexes << min_index
                    end
                end
            end


            @needs_save = true
        rescue
            @fibre_line = FibreLine.with_geometry.find(params[:id])
            @calibrations = @fibre_line.geo_calibrations
            @error = I18n.t("admin.fibre_lines.man_cal.kml_error")
        end
        render :action => 'manual_calibration'
    end

    # Set (POST) or obtain (GET) the image for a section calibration.
    def section_image
        if request.get?
            security_breach unless can?(:read, :fibre_lines) or can?(:manage, :fibre_lines)
            get_section_image
        elsif request.post?
            security_breach unless can? :calibrate, :fibre_lines
            set_section_image
        end
    end

    #show the fibre_break info
    def clear_fibre_break
        if request.get?
            security_breach unless can?(:read, :fibre_lines) or can?(:manage, :fibre_lines)
            @fibre_line = FibreLine.find(params[:id])
            @distance_units = get_preference('units-distance')[:value]
            @distance_precision = get_preference('precision-distance')[:value]

            render :partial => "fibre_break_dialog"
        elsif request.put?
            security_breach unless can?(:manage, :fibre_lines)
            begin
                FibreLine.transaction { do_clear_fibre_break(params[:id].to_i) }
                @error = nil
            rescue Exception => ex
                @error = I18n.t("admin.fibre_lines.fibre_break_dialog.fail_to_save")
            end

            render :template => "/admin/create.js"  #we want this to refresh the entire page
        end
    end

private

    # Perform our permission checks and throw an exception if they fail.
    def security_check
        security_breach unless can? :manage, :fibre_lines
    end

    # Read the common data.
    def setup_data
        @organizations = current_user.organizations
        @event_categories = EventCategory.all.order(:description)
        @global_fibre_lines = FibreLine.not_deleted.where(owner_id: current_user.organization_ids).order("upper(name)")
        @display_types = DisplayType.all.order(:description)
        @helios_units = HeliosUnit.all.order(:name)
        @app_types = App.all
        @fibre_app_map = {}

        @global_fibre_lines.each do |fibre|
            @fibre_app_map[fibre.id] = App.find_by_fibre_line(fibre.id)
        end
    end

    # Setup the map calibration page.
    def get_map_calibration
        if params[:id] != 'close'
            setup_data
            @distance_units = get_preference('units-distance')[:value]
            @distance_precision = get_preference('precision-distance')[:value]
            @fibre_line = FibreLine.with_geometry.includes(:calibrations).find(params[:id])
            @calibrations = @fibre_line.calibrations
        else
            @close = true
        end

        render :layout => "simple"
    end

    # Save the map calibration.
    def set_map_calibration
        FibreLine.transaction do
            line = FibreLine.find(params[:id])

            raise "The user #{current_user.fullname} does not have permission to calibrate fibre line #{line.id}." \
                if not line or not current_user.organization_ids.include? line.owner_id

            fibre_line_params = params[:fibre_line]
            calibrations = Calibration.new_from_array(fibre_line_params['cals'])

            line.calibrations = calibrations
            line.save

            line.update_route(fibre_line_params['lats'], fibre_line_params['lngs'])
        end

        redirect_to "/admin/fibre_lines/close/map_calibrate"
    end

    # Convert the units of the fibre line calibrations.
    def convert_fibre_line_calibrations(calibrations, from_units, to_units)
        if (from_units == to_units) or not calibrations
            return
        end

        calibrations.each { |cal| cal.distance = UnitConversions.convert(cal.distance, from_units, to_units) }
    end

    # Setup the section calibration page for a fibre line.
    def get_section_calibration
        @distance_units = get_preference('units-distance')[:value]
        @distance_precision = get_preference('precision-distance')[:value]
        @fibreLine = FibreLine.includes(:section_calibration).find_with_permission(params[:id].to_i, current_user.loginname)
        @document = nil

        if(@fibreLine.section_calibration)
            @document = @fibreLine.section_calibration.document
            @diagramWidth, @diagramHeight = @document.dimensions
        end

        @document_id = @document ? @document.id : nil

        # Documents of all fibre_lines in organization.
        fibre_line_ids = FibreLine.where(owner_id: @fibreLine.owner_id).select(:id)
        @documents = Document.where(id: DocumentsFibreLine.where(fibre_line_id: fibre_line_ids).collect{|x| x.document_id}.compact.uniq)

        render :layout => "simple"
    end

    # Save the section calibration for a fibre line.
    def set_section_calibration
        SectionCalibration.transaction do
            calibrations = params[:calibrations]
            cal = SectionCalibration.lock.where(fibre_line_id: params[:id].to_i).first
            raise I18n.t('admin.fibre_lines.section_cal.record_not_saved') if !cal

            cal.fibre_distances = calibrations[:distances].collect{|x| x.to_f}
            cal.x_offsets = calibrations[:x_offsets].collect{|x| x.to_f}
            cal.y_offsets = calibrations[:y_offsets].collect{|x| x.to_f}

            cal.save
        end

        render :js => "window.location.reload(true);"
    end

    # Obtain the section calibration image for a fibre.
    def get_section_image
        section_calibration = FibreLine.find(params[:id]).section_calibration
        document = Document.find(section_calibration.document_id)
        raise "Cannot find a document for fibre line #{params[:id]}" \
            if not document
        send_file "#{Rails.root}/public#{document.public_filename}", {:type => document.content_type, :disposition => 'inline'}
    end

    # Set the section calibration image for a fibre.
    def set_section_image
        SectionCalibration.transaction do
            # Check that the user is an owner of the fibre.
            fibreLine = FibreLine.find_with_permission(params[:id], current_user.loginname)
            raise I18n.t('admin.fibre_lines.section_cal.user_access_warn', :user => u.loginname, :fibre_line => params[:id]) if !fibreLine

            # Create a new attachment and update the section calibration to point to it.
            if(params[:document_id] == '')
                doc = attach_file(I18n.t('admin.fibre_lines.section_cal.attach_file'))
            else
                doc = Document.find(params[:document_id])
            end

            cal = SectionCalibration.where(fibre_line_id: params[:id].to_i).first

            if !cal
                cal = SectionCalibration.new
                cal.fibre_line_id = params[:id].to_i
            end

            cal.document_id = doc.id

            cal.x_offsets           # These are required to force the arrays to get persisted.
            cal.y_offsets
            cal.fibre_distances

            cal.save!
        end

        redirect_back fallback_location: admin_fibre_lines_path
    end

    # Attach any generic file to a fibre line.
    def attach_file(description)
      fibre_id = params[:id]
      fibre_line = FibreLine.find(fibre_id)

      p = params.require(:attachable).permit!

      document = Document.new(p) do |d|
        d.description = description if description
        d.organization = fibre_line.organization
      end

      document.save!
      # TODO: We seem to only save the fibre_line this document is uploaded against (in documents_fiber_lines table).
      # TODO: Even though it can be linked to other fibre_lines later (through section_calibration table).
      document.fibre_lines << fibre_line
      document.save!
      document
    end

end
