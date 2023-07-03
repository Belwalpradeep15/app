
class Admin::MarkersController < AdminController
    before_action :security_check
    before_action :get_organizations

    def index
        @menu = setup_admin_menu
        @title = I18n.t('admin.markers.title')
        @latlng_format = get_preference('units-latlng')[:value]
        @latlng_precision = get_preference('precision-latlng')[:value]
        render :layout => "admin"
    end

    def create
        params.permit!
        organization = Organization.find params[:organization_id]
        #TODO: Remove unless and rescue the exception properly
        unless Marker.exists?(:name => params[:marker][:name])
            marker = organization.markers.build(params[:marker])
            marker.save
            params[:marker_types].split(',').each do |t|
                marker.marker_types << MarkerType.find(t)
            end
            marker.save
        end
        render :template => 'admin/create'
    end

    def update
        if Marker.exists?(params[:id].to_i)
            begin
                Marker.transaction do
                    if params[:field] == 'marker_type'
                        marker = Marker.find(params[:id]) if params[:id]
                        marker.marker_types.clear
                        if params[:value] != ''
                            marker.marker_types << MarkerType.find(params[:value])
                        end
                    else
                      Marker.update_field(params[:id], current_user, params[:field], params[:value])
                    end
                end
                @error = nil
                @formId = 'row_' + params[:id]
            rescue => exception
                log_exception(exception)
                @error = exception
            end
        end
        render :template => 'admin/update'
    end

    def destroy
        marker = Marker.find(params[:id]) if params[:id]
        begin
            marker.destroy
        rescue => exception
            log_exception(exception)
            @error = exception
        end
        render :template => 'admin/destroy'
    end


    # TODO: Reduce duplicate code used for partial => 'monitor/fibre_lines/fibre_lines':
    # Code in markers_controller, shcedule_controller, main_controller, and portal_controller
    #	should be refactored and put into a common location. I have not done that now as an even
    #	better solution would be to refactor the map display to be a "partial" that could
    #	be included in all the pages where a map would be useful.
    # See issue #17978.
    def map_calibrate
        @initial_map_type = APP_CONFIG['monitor']['initial_map_type']
        preference = Preference.where(user_id: current_user.id, key: 'initial-map-type').first
        @initial_map_type = preference.value if !preference.nil? && APP_CONFIG['monitor']['map_layers'].keys.include?(preference.value)

        if can? :read, :fibre_lines
          @global_fibre_lines = FibreLine.with_geometry.where(owner_id: current_user.organization_ids).order('upper(name)')
        else
          @global_fibre_lines = []
        end

        @activeRanges = {}
        @global_fibre_lines.each { |fl| @activeRanges[fl.id] = fl.compute_active_range() }

		heliosUnitIds = Set.new
		@global_fibre_lines.each { |fl| heliosUnitIds << fl.helios_unit_id if fl.helios_unit_id }
		heliosUnitIds = heliosUnitIds.to_a

		heliosUnits = []
		if heliosUnitIds.any?
			heliosUnits = HeliosUnit.where(id: heliosUnitIds)
		end
		@helios_data = {}
		heliosUnits.each do |helios|
			@helios_data[helios.id] = helios
		end

        if request.get?
            get_map_calibration
        elsif request.post?
            set_map_calibration
        end
    end


    private

    # Perform our permission checks and throw an exception if they fail.
    def security_check
        security_breach unless can? :manage, :markers
    end

    def get_organizations
        @organizations = current_user.organizations
        @marker_types = MarkerType.all
    end

    # Setup the map calibration page.
    def get_map_calibration
        if params[:id] != 'close'
            @organization = Organization.find(params[:id])
            #TODO Need anything here?
        else
            @close = true
        end
        render :layout => "simple"
    end

    # Save the map calibration.
    def set_map_calibration
        redirect_to "/admin/markers/close/map_calibrate"
    end

end
