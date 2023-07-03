# FILENAME:     portal_controller.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2010-02-25
#
# DESCRIPTION:  Entry point to the port sub-application.
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.


class PortalController < PublicController
  helper :all

  # The generic portal.
  def index
    setup_portal
    render :action => :portal
  end

  def show
    setup_portal
    render :action => :portal
  end

  def portal
    setup_portal
  end

  # Get the calibration image. This differs from the admin version only in the permissions.
  def section_image
    security_breach unless request.get?
    get_section_image

  end

private


  # TODO: Reduce duplicate code used for partial => 'monitor/fibre_lines/fibre_lines':
  # Code in markers_controller, shcedule_controller, main_controller, and portal_controller
  # should be refactored and put into a common location. I have not done that now as an even
  # better solution would be to refactor the map display to be a "partial" that could
  # be included in all the pages where a map would be useful.
  # See issue #17978.
  # At present all our portals use the same code but simply bring up different HTML templates
  # in order to account for the different company branding.
  def setup_portal
    raise I18n.t('main.portal.no_portal') \
      unless APP_CONFIG['portal']['enabled'] && APP_CONFIG['portal']['enabled'] != "PORTAL_ENABLED_FALSE"  # Needed for dev versions

    @main_view_only = params[:main_view_only]
    @sectionCalibration = nil
    @initial_display_type = 'map'
    @alerts_require_comment_text = SystemPreference.alerts_require_comment_text?

    # Find the fibre lines:
    fibre_line_ids = [APP_CONFIG['portal']['fibre_line_id']].flatten
    requested_fibre_lines = (params[:id] || '').split(',').collect{|x| x.to_i}
    if fibre_line_ids.empty?
        fibre_line_ids = requested_fibre_lines
    else
        intersect = fibre_line_ids & requested_fibre_lines
        fibre_line_ids = intersect unless intersect.empty?
    end

    if fibre_line_ids.empty?
        @global_fibre_lines = FibreLine.with_geometry.where({:owner_id => current_user.organization_ids }).order("id")
    else
        @global_fibre_lines = FibreLine.with_geometry.where({:id => fibre_line_ids, :owner_id => current_user.organization_ids }).order("id")
    end

    raise I18n.t('main.portal.no_fibre', :fibre_line => fibre_line_ids, :user => APP_CONFIG['portal']['user']) if @global_fibre_lines.empty?

    # further trim if a section will be displayed
    if @global_fibre_lines.first.display_type.name == 'section'
      @initial_display_type = 'section'
      ref_disp_type = @global_fibre_lines.first.display_type.name
      ref_file_name = get_fibre_image_name( @global_fibre_lines.first.id )

      overlayable_fibres =[]
      # we only overlay fibres with the same image if displayed as engineering diagrams (called sections)
      overlayable_fibres = @global_fibre_lines.select { |fl| fl.display_type.name == ref_disp_type && get_fibre_image_name(fl.id) == ref_file_name }

      if !overlayable_fibres.nil? && !overlayable_fibres.empty? && overlayable_fibres.length > 1
        @global_fibre_lines = overlayable_fibres
      else
        @global_fibre_lines = [@global_fibre_lines.first]
      end
    end


    @mapProvider = APP_CONFIG['monitor']['map_provider']
    @distance_units = get_preference('units-distance')[:value]
    @velocity_units = get_preference('units-velocity')[:value]
    @acceleration_units = get_preference('units-acceleration')[:value]
    @use_select_region = false
    @user = current_user
    @preferences = get_preferences
    @activeRanges = {}
    @global_fibre_lines.each { |fl| @activeRanges[fl.id] = fl.compute_active_range() }

    @initImmediate = false;
    @inPortal = true
    @noHelpTags = true

    @eventTypes = EventType.get_active
    EventType.sort_by_description(@eventTypes)

    @heartbeatFrequency = SYSTEM_CONFIG['controld']['heartbeat_frequency_s']
    @eventClearingInterval = APP_CONFIG['portal']['event_clearing_interval']
    @browserRefreshInterval = APP_CONFIG['portal']['browser_refresh_interval']
    @suppressSelect = true

    hUnitIds = @global_fibre_lines.collect{|f| f.helios_unit_id }.uniq.compact

    @helios_units = []
    @helios_units = HeliosUnit.with_lat_lng.where(id: hUnitIds) unless hUnitIds.empty?
    @heliosUnits = @helios_units
    @heliosUnitIds = @helios_units.collect{|x| x.id}
    @helios_data = {}
    @heliosUnitIds.each do |id|
      @helios_data[id] = HeliosUnit.find_by_id(id)
    end
    @helios_locations = []
    @reference_point_locations = []

    @outstanding_alerts = []
    if SystemPreference.get_value('alerts-enabled') == 'true'
      @outstanding_alerts = Alert.with_recent_times.where(compute_alert_conditions).includes(:alert_details).order("updated_at DESC").limit(APP_CONFIG['portal']['alert_preload_count'] || 100 )
      @outstanding_alerts.each do |alert|
        alert.append_extra_json_variables
      end
    end

    @panoptes_name = SystemPreference.get_value_with_default('identity_name', '').strip
    @panoptes_name = nil if @panoptes_name.length == 0

    @panoptes_uuid = SystemPreference.get_value_with_default('identity_uuid', '').strip
    @panoptes_uuid = nil if @panoptes_uuid.length == 0

    @organizations = current_user.organizations
    @panoptes_custom = []
    @organizations.each do |org|
        prefs = OrganizationPreference.for_organization_as_hash(org.id)
        if ( prefs['identity_custom_name'].value.length > 0 )
          @panoptes_custom.push( prefs['identity_custom_name'].value)
        end
    end

    @panoptes_serial_number = SystemPreference.get_value_with_default('identity_serial_number', '').strip
    @panoptes_serial_number = nil if @panoptes_serial_number.length == 0

    @menu = construct_menu

  end

  # Obtain the section calibration image for a fibre.
  def get_section_image
    section_calibration = FibreLine.find(params[:fibreLineId]).section_calibration
    document = Document.find(section_calibration.document_id)
    send_file "#{Rails.root}/public#{document.public_filename}", {:type => document.content_type, :disposition => 'inline'}
  end

  def get_fibre_image_name( fibre_id )
    section_calibration = FibreLine.find(fibre_id).section_calibration
    document = Document.find(section_calibration.document_id)
    raise "Cannot find a document for fibre line #{params[:id]}" if not document
    return File.basename(document.public_filename)
  end

  # Construct the menu.
  def construct_menu
    menu = []
    submenu = [
      { :label => I18n.t('main.about.title') + "...", :url => "javascript: showAboutBox()" },
      {},
      { :label => I18n.t('main.menu.events.clear_events'), :url => "javascript: clearEvents()" }
      ]
    menu << { :name => "fotechmenu", :submenu => submenu }
    return menu
  end
end

