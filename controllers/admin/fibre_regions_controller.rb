# FILENAME:     fibre_regions_controller.rb
# AUTHOR:       Karina Simard
# CREATED ON:   10-10-06
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
# This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.

require 'fotech/unit_conversions'
require 'base64'

class Admin::FibreRegionsController < AdminController
    before_action :security_check, :setup_data, :setup_menu

    def index
        @region_types = FibreRegionType.where(["name != ?", 'helios'])
        @regions = @fibre_line.fibre_regions.where(fibre_region_type_id: @region_types).order("starting_position")
        @distance_units = get_preference('units-distance')[:value]
        @distance_precision = get_preference('precision-distance')[:value]
        filename = "fibreRegionsFor#{@fibre_line.name.underscore}.csv"
        if params[:format] == 'csv'
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

            csv = []
            csv << [
                I18n.t('common.headers.description'),
                "#{I18n.t('admin.fibre_region.starting_position')} (#{@distance_units})",
                "#{I18n.t('admin.fibre_region.end')} (#{@distance_units})",
                I18n.t('admin.fibre_region.visible'),
                "#{I18n.t('common.headers.properties')}"
            ]

            @regions.sort_by{|x| x.starting_position}.each do |r|
                csv << [
                    r.description,
                    UnitConversions.convert(r.starting_position, 'm', @distance_units),
                    UnitConversions.convert(r.ending_position,'m',@distance_units),
                    r.visible ? 1 : 0,
                    Base64.encode64(r.region_properties.to_json).gsub(/\s/, '')  # encode64 includes newline characters
                ]
            end
            csv = csv.collect{|x| x.join(',')}

            send_data csv.join("\n"), :filename => filename
            return
        end
    end

    def show
    end

    def new
    end

    def create
        begin
            r = params[:fibre_region].except(:ending_position).permit(:fibre_region_type_id, :description, :starting_position, :length)
            @fibre_line.fibre_regions.create(r)
        rescue => ex
            log_exception(ex)
            @error = ex.message
        end
        render :template => '/admin/create.js'
    end

    def edit

    end

    def edit_properties
        @props = @region.region_properties
        logger.info @region.inspect
        render :layout => false
    end

    def update_properties
        begin
            @region[:visible] = !!params[:visible]
            @region.save

            # Get the current properties and "update" their values
            props = Hash[@region.region_properties.map do |k, v|
                v = params[k] if params.key? k
                [k, v]
            end]

            @region.set_properties props
        rescue => ex
            log_exception(ex)
            @error = ex.message
        end

        @dialogId = "edit_fibre_region_properties_dialog"
        render :template => '/admin/update.js'
    end

    def upload_regions
        csvString = params[:region_csv]
        if csvString.nil?
            flash[:error] = I18n.t('admin.fibre_region.upload.no_file')
            redirect_to :action => :index
            return
        end
        csv = csvString.read.split(/[\r\n]+/)
        csv = csv.collect{|x| x.split(/,/)}
        headers = csv.shift
        match = headers[1].match(/\((.*)\)/)
        units = match ? match[1] : 'm'

        allValid = true
        csv.each do |line|
            allValid &&= line[0]!= ''
            allValid &&= true if Float(line[1]) rescue false
            allValid &&= true if Float(line[2]) rescue false
            allValid &&= Float(line[1]) < Float(line[2]) rescue false
        end

        if allValid
            @region_types = FibreRegionType.where(["name != ?", 'helios'])
            @regions = @fibre_line.fibre_regions.where(fibre_region_type_id: @region_types).order("starting_position")
            @regions.each{|x| x.destroy}
            @region_type = FibreRegionType.find_by_name('user')

            default_row = {
                0 => '', # desc
                1 => 0, # starting position
                2 => 0, # end
                3 => 1, # visible
                4 => '' # properties json
            }
            csv.each do |line|
                row = default_row.merge(Hash[line.each_with_index.collect{|v,k| [k, v]}])
                start = line[1].to_f
                length = line[2].to_f - start
                start = UnitConversions.convert(start, units, 'm')
                length = UnitConversions.convert(length, units, 'm')
                visible = !line[3].to_i.zero?

                region = @fibre_line.fibre_regions.create(
                    :fibre_region_type => @region_type,
                    :description => line[0],
                    :starting_position => start,
                    :length => length,
                    :visible => visible
                )
                
                unless line[4].to_s.empty?
                    begin
                        logger.info line[4]
                        logger.info Base64.decode64 line[4]
                        properties = JSON.parse(Base64.decode64 line[4])
                        region.set_properties properties
                    rescue JSON::ParserError
                      logger.warn "During fibre region import the properties JSON string was not parsable"
                      # no op
                    end
                end
            end
        end
        @error = I18n.t('admin.fibre_regions.upload.errors_in_file')
        redirect_to :action => :index
    end

    def update
        begin
            @region[params[:field]] = params[:value]
            @region.save!
        rescue => ex
            log_exception(ex)
            @error = ex.message
        end
        @formId = "row_#{@region.id }"
        render :template => '/admin/update.js'
    end

    def destroy
        begin
            @region.properties.destroy_all
            @region.destroy
        rescue => ex
            log_exception(ex)
            @error = ex.message
        end
        render :template =>  "admin/destroy"
    end

  private #---------------------------------------------------------------------

    # Perform our permission checks and throw an exception if they fail.
    def security_check
        security_breach unless can? :manage, :fibre_lines
    end

    def setup_data
        @fibre_line = FibreLine.find_with_permission(params[:fibre_line_id], current_user.loginname)
        security_breach if @fibre_line.nil?

        @region = nil
        @region = FibreRegion.find(params[:id]) unless params[:id].nil?
    end

    def setup_menu
        @menu = []
        @menu << {
            :name => "fotechmenu",
            :submenu => [
                { :label => I18n.t('common.menu.close_window'), :url => 'javascript: window.close()' }
            ]
        }
    end
end

