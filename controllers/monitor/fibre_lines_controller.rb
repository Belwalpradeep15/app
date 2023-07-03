# $Author$
# $Date$
# $Rev$
# $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2009 Fotech Solutions Ltd. All rights reserved.

class Monitor::FibreLinesController < MonitorController

  # The default action provides a map overview of all the fibre lines the user
  # is allowed to view.
  def index
    load_fibre_lines_for_index
    render :partial => params[:viewType] unless @global_fibre_lines.empty?
  end

  # View a specific fibre line.
  def show
    load_fibre_lines_for_portal
    render :partial => @global_fibre_lines.first.display_type.name, :locals => { :isPortal => request.fullpath.starts_with?( '/portal' ) } unless @global_fibre_lines.empty? || @error
  end

private

  def load_fibre_lines_for_index
    settings_for_fibres

    @global_fibre_lines = FibreLine.with_geometry.where(owner_id: current_user.organization_ids).order("id")
    @paths = Path.not_deleted.where(organization_id: current_user.organization_ids)
    hUnitIds = @global_fibre_lines.collect{|f| f.helios_unit_id }.uniq.compact
    @helios_units = []
    @helios_units = HeliosUnit.with_lat_lng.where(id: hUnitIds) unless hUnitIds.empty?

    if (not @global_fibre_lines) or (@global_fibre_lines.length == 0)
      if params[:id]
        line = FibreLine.where(id: params[:id], owner_id: current_user.organization_ids).first
        #in here because the fibre was deleted
        if !line.deleted_at.nil?
          render :partial => "deleted_fibre"
          return
        end
      end

      @error = I18n.t("monitor.fibre_line.no_fibres")
      render :partial => "no_fibres"
      return
    end

  end



  def load_fibre_lines_for_portal

    settings_for_fibres

    fibre_ids = params[:id] ? {:id => params[:id].split(',')} : {}

    @global_fibre_lines = FibreLine.with_geometry.where(owner_id: current_user.organization_ids).where(fibre_ids).order("id")
    orgIds = @global_fibre_lines.collect{|f| f.owner_id}.uniq.compact
    hUnitIds = @global_fibre_lines.collect{|f| f.helios_unit_id }.uniq.compact

    if !@global_fibre_lines.empty?
      # here we trim the @global_fibre_lines if the first one is in 'map' display type
      if @global_fibre_lines.first.display_type.name == 'map'
        @global_fibre_lines = [@global_fibre_lines.first]
        @helios_units = []
        @helios_units = HeliosUnit.with_lat_lng.where(id: hUnitIds) unless hUnitIds.empty?
        @markers = Marker.with_lat_lng.where(organization_id: current_user.organization_ids)
        @reference_points = ReferencePoint.with_lat_lng.where(organization_id: orgIds) unless @global_fibre_lines.empty?
      elsif @global_fibre_lines.first.display_type.name == 'section'
        # complete 'section' setup
        @sectionCalibration = FibreLine.find(@global_fibre_lines.first.id).section_calibration
        @helios_units = HeliosUnit.with_lat_lng.all.order('upper(name)')
        @helios_locations = []
        @reference_point_locations = []
        @reference_points = ReferencePoint.where(organization_id: orgIds)
        @markers = Marker.with_lat_lng.where(organization_id: current_user.organization_ids)
        @section_id ||= nil

        if @sectionCalibration
          doc = @sectionCalibration.document
          if doc
            @diagramWidth, @diagramHeight = doc.dimensions
            @section_id = doc.id
            @helios_locations = HeliosSectionLocation
                                    .where(helios_unit_id: hUnitIds, document_id: doc.id)
                                    .includes(:helios_unit)
            unless @reference_points.empty?
              @reference_point_locations = DocumentsReferencePoint
                                               .where(document_id: doc.id, reference_point_id: @reference_points.collect{|p| p.id})
                                               .includes(:reference_point)
            end
          end
        end

        unless @section_id
          @error = I18n.t("monitor.fibre_line.no_section_diagram")
          render :partial => "no_fibres"
          return
        end
      end
    end

    if params[:viewType] == 'map'
      @helios_units = []
      @helios_units = HeliosUnit.with_lat_lng.where(id: hUnitIds) unless hUnitIds.empty?
      @markers = Marker.with_lat_lng.where(organization_id: current_user.organization_ids)
      @reference_points = ReferencePoint.with_lat_lng.where(organization_id: orgIds) unless @global_fibre_lines.empty?
    end

    @paths = Path.not_deleted.where(organization_id: current_user.organization_ids)
    @activeRanges = {}
    @global_fibre_lines.each { |fl| @activeRanges[fl.id] = fl.compute_active_range() }
    @categoryIds = FibreLine.get_event_category_ids_for_fibre_lines(@global_fibre_lines)

    if (not @global_fibre_lines) or (@global_fibre_lines.length == 0)
      if params[:id]
        line = FibreLine.where(id: params[:id], owner_id: current_user.organization_ids).first
        #in here because the fibre was deleted
        if !line.deleted_at.nil?
          render :partial => "deleted_fibre"
          return
        end
      end

      @error = I18n.t("monitor.fibre_line.no_fibres")
      render :partial => "no_fibres"
      return
    end
  end


  #used by portal and monitor to properly display fibres
  def settings_for_fibres

    @threatLevelsForIcons = SystemPreference.where("key like 'alerts-show-%' and value like 'icons%'").collect{|x| x.key.gsub(/alerts-show-/,'')}
    #if this is requested by the portal we don't include the select region option
    @use_select_region = request.headers['HTTP_REFERER'][/portal/].nil?
    @initImmediate = true
    @initial_map_type = APP_CONFIG['monitor']['initial_map_type']
    preference = Preference.where(user_id: current_user.id, key: 'initial-map-type').first
    @initial_map_type = preference.value if !preference.nil? && APP_CONFIG['monitor']['map_layers'].keys.include?(preference.value)
    showBrokenFibrePref = SystemPreference.find_by_key('show_broken_fibre_overlay')
    #default it to show the broken fibre
    @showBrokenFibre = showBrokenFibrePref.nil? ? true : showBrokenFibrePref.value.downcase == 'true'

    @displayTypes = {}
    DisplayType.all.order("description").each { |dt| @displayTypes[dt.id] = dt.description }

  end

end
