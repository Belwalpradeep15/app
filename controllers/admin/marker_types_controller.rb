require 'base64'

class Admin::MarkerTypesController < AdminController

    before_action :security_check
    before_action :setup

    def index
        @menu = setup_admin_menu
        @title = I18n.t('admin.marker_types.title')
        render :layout => "admin"
    end

    def update

    end

    def create
      data = params[:data]

      unless ['.png', '.jpg', '.jpeg'].include? File.extname(params[:filename]).downcase
        @error = I18n.t('admin.fibre_lines.man_cal.file_type_error')
        @dialogId = 'marker_type_new_dialog'
        render :template => 'admin/error' and return
      end

      # Right filename extension, check data...
      # The data begins with one of these, followed by actual base64 encoded content:
      # "data:image/png;base64,"
      # "data:image/jpeg;base64,"
      text_before_ext = 'image/'
      if (ext_index = data.index(text_before_ext)).nil?
        @error = I18n.t('admin.fibre_lines.man_cal.file_type_error')
        @dialogId = 'marker_type_new_dialog'
        render :template => 'admin/error' and return
      end
      ext_index += text_before_ext.length
      extension = data.slice(ext_index...data.index(';base64'))
      unless ['png', 'jpg', 'jpeg'].include? extension.downcase
        @error = I18n.t('admin.fibre_lines.man_cal.file_type_error')
        @dialogId = 'marker_type_new_dialog'
        render :template => 'admin/error' and return
      end

      file_path = '/images/marker_type_icons/' + params[:marker_type_name] + "." + extension

      text_before_data = 'base64,'
      data_index = data.index(text_before_data) + text_before_data.length
      file_data = data.slice(data_index, data.length)
      decoded_file_data = Base64.decode64(file_data)

      File.open(Rails.public_path.to_s + file_path, 'wb') do |file|
         file.write(decoded_file_data)
      end

      begin
        #TODO: Remove unless and rescue the exception properly
        unless MarkerType.exists?(:name => params[:marker_type_name])
          MarkerType.transaction do
            marker_type = MarkerType.new
            marker_type.name = params[:marker_type_name]
            marker_type.icon_path = file_path
            marker_type.save!
          end
        end
          @error = nil
      rescue => ex
          @error = ex
      end
      render :template => 'admin/create'
    end

    def destroy
      id = params[:id]
      marker_type = MarkerType.find(id)
      icon_path = marker_type.icon_path
      unless marker_type.locked?
        begin
          fp = Rails.public_path.to_s + icon_path
          File.delete(fp) if File.exist?(fp)
        rescue => ex
          $logger.debug "Exception deleting event type icon: #{fp}"
        end

        begin
            marker_type.destroy
        rescue => exception
            log_exception(exception)
            @error = exception
        end
        render :template => 'admin/destroy'
      end
    end

  private

    def security_check
        security_breach unless can? :manage, :marker_types
    end

    def setup
        @markerTypes = MarkerType.all
    end

end

