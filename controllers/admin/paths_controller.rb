# FILENAME:     paths_controller.rb
# AUTHOR:       Matthew Stuart <matthew.stuart@fotechsolutions.com>
# CREATED ON:   2016-01-28
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
# This file is Copyright © 2016 Fotech Solutions Ltd. All rights reserved.

class Admin::PathsController < AdminController

  include ActionView::Helpers::JavaScriptHelper
  before_action :security_check

  # Entry point to the fibre line administration pages.
  def index
    require 'key_chain'
    setup_data

    @menu = setup_admin_menu
    @title = I18n.t('admin.paths.title')

    render :layout => "admin"
  end

  def upload
    setup_data
    @menu = setup_admin_menu
    @title = "%s - %s" % [I18n.t('admin.paths.title'), I18n.t('common.button.upload')]

    security_breach unless can? :add, :paths

    organization = @organizations.index{|o| o.id == params[:organization].to_i }

    if organization.nil?
      # ERROR - No organization
      logger.error "Unable to find organization with id #{params[:id]}"
      flash[:error] = {:paths => {:general => I18n.t('errors.five_hundred.header')}}
      redirect_to :action => "index" and return
    end

    @organization = @organizations[organization]
    unless current_user.organization_ids.include? @organization.id
      logger.error "Current user #{current_user.id} does not have permission over organization #{@organization.id}"
      flash[:error] = {:paths => {:general => I18n.t('errors.five_hundred.header')}}
      redirect_to :action => "index" and return
    end

    render :layout => "admin"
  end

  def upload_review
    require 'key_chain'
    require 'base64'

    setup_data
    security_breach unless can? :add, :paths

    organization = @organizations.index{|o| o.id == params[:organization].to_i }

    if organization.nil?
      # ERROR - No organization
      logger.error "Unable to find organization with id #{params[:id]}"
      flash[:error] = {:paths => {:general => I18n.t('errors.five_hundred.header')}}
      redirect_to :action => "index" and return
    end

    organization = @organizations[organization]
    unless current_user.organization_ids.include? organization.id
      logger.error "Current user #{current_user.id} does not have permission over organization #{organization.id}"
      flash[:error] = {:paths => {:general => I18n.t('errors.five_hundred.header')}}
      redirect_to :action => "index" and return
    end

    # Load the fibre lines
    fibre_lines = Hash[FibreLine.where(owner_id: organization.id).order("upper(name)").collect{|f| [f.id, f.name]}.compact]

    require 'yaml'
    uploaded_io = params[:path_file]
    content = uploaded_io.read

    if content.empty?
      flash[:error] = {:paths => {organization.id => I18n.t("admin.fibre_region.upload.no_file")}}
      redirect_to :action => "upload" and return
    end

    paths = YAML.load(content)

    unless paths.instance_of?(Hash) && paths.key?('paths')
      # ERROR - missing data
      logger.error "Missing necessary data from the YAML file supplied"
      flash[:error] = {:paths => {organization.id => I18n.t('errors.five_hundred.header')}}
      redirect_to :action => "upload" and return
    end

    _uuid = 0

    @filtered = []
    @originals = {}
    paths['paths'].each do |path|
      unless path.instance_of?(Hash)
        # ERROR - missing required keys
        logger.error "Path definition is not a Hash, got `#{path.class}`"
        flash[:error] = {:paths => {organization.id => I18n.t('errors.five_hundred.header')}}
        redirect_to :action => "index" and return
      end

      # Validate Path
      required = ['name', 'marker_name', 'direction_towards_marker', 'direction_away_from_marker']
      if (required - path.keys).length > 0
        # ERROR - missing required keys
        m = (required - path.keys)
        logger.error "Missing required keys: #{m.inspect} (#{m.length})"
        flash[:error] = {:paths => {organization.id => I18n.t('errors.five_hundred.header')}}
        redirect_to :action => "index" and return
      end

      p = {
          '_uuid' => (_uuid += 1),
          'action' => 'add',
          'organization' => organization.id,
          'name' => path['name'],
          'marker_name' => path['marker_name'],
          'label_away' => path['direction_away_from_marker'],
          'label_towards' => path['direction_towards_marker'],
          '_original' => nil,
          'path_segments' => []
      }

      original = nil
      if path.key?('id') and has_key_chain?(@paths, [organization.id, path['id']])
        p['action'] = 'edit'
        @originals["path_#{path['id']}"] = (original = @paths[organization.id][path['id']]).attributes
        p['_original'] = path['id']
      end


      # iterate incoming segments..
      if path.has_key?('segments') && path['segments'].instance_of?(Array)
        order = 0

        original_segments = Hash[original.path_segments.map{|s| [s.id, s]}] unless original.nil?

        path['segments'].each do |segment|
          fibre_line = fibre_lines[segment['fibre_line_id']]
          if fibre_line.nil?
            logger.error "Unable to add segment as fibre id #{segment['fibre_line_id']} not found"
          else
            s = {
              '_uuid' => (_uuid += 1),
              'action' => 'add',
              'fibre_line_id' => segment['fibre_line_id'],
              'fibre_line_name' => fibre_line,
              'start_distance' => segment['start_distance'].to_i,
              'end_distance' => segment['end_distance'].to_i,
              'distance_from_marker' => segment['distance_from_marker'].to_i,
              'normalizer' => (segment['end_distance'].to_i >= segment['start_distance'].to_i) ? 1 : -1,
              'segment_order' => order,
              '_original' => nil
            }

            if p['action'] == 'edit'
              if segment.has_key?('id')
                if original_segments and original_segments.has_key?(segment['id'])
                  s['action'] = 'edit'
                  s['_original'] = segment['id']

                  @originals["segment_#{segment['id']}"] = original_segments[segment['id']].attributes
                  original_segments.delete segment['id']
                end
              end
              p['path_segments'] << s
            else
              p['path_segments'] << s
            end

            order += 1
          end
        end

        unless original_segments.nil?
          original_segments.each do |id, os|
            fibre_line = fibre_lines[os.fibre_line_id]
            p['path_segments'] << {
                '_uuid' => (_uuid += 1),
                'id' => os.id,
                'action' => 'delete',
                'fibre_line_id' => os.fibre_line_id,
                'fibre_line_name' => fibre_line,
                'start_distance' => os.start_distance,
                'end_distance' => os.end_distance,
                'distance_from_marker' => os.distance_from_marker,
                'normalizer' => os.normalizer,
                '_original' => os.id,
                'segment_order' => -1
            }
          end
        end

        p['path_segments'].sort!{|x,y| x['segment_order'] <=> y['segment_order']}
      end
      @filtered << p
    end
    upload
    @organization = organization
  end

  def upload_commit
    require 'key_chain'
    require 'base64'

    setup_data
    security_breach unless can? :add, :paths

    organization = params[:organization].to_i
    path_data = params[:path_data]
    process = params[:process].to_a

    organization = @organizations.index{|o| o.id == organization}

    if organization.nil?
      # ERROR - No organization
      logger.error "Unable to find organization with id #{params[:organization]}"
      flash[:error] = {:paths => {:general => I18n.t('errors.five_hundred.header')}}
      redirect_to :action => "index" and return
    end

    organization = @organizations[organization]
    unless current_user.organization_ids.include? organization.id
      logger.error "Current user #{current_user.id} does not have permission over organization #{organization.id}"
      flash[:error] = {:paths => {:general => I18n.t('errors.five_hundred.header')}}
      redirect_to :action => "index" and return
    end

    path_data = Base64.decode64(path_data)
    if path_data.empty?
      logger.error "Path data provided did not decode properly or was missing. Data: '#{params[:path_data]}'"
      flash[:error] = {:paths => {:general => I18n.t('errors.five_hundred.header')}}
      redirect_to :action => "index" and return
    end

    require 'json'
    begin
      path_data = JSON.parse(path_data)
    rescue JSON::ParserError => e
      logger.error 'Praser error while processing path data from JSON;'
      log_exception e
      flash[:error] = {:paths => {:general => I18n.t('errors.five_hundred.header')}}
      redirect_to :action => "index" and return
    end

    queue = []
    org_paths = @paths[organization.id] || {}

    if process.length
      process = Hash[process.collect{|p| [p, true]}]

      path_data.each do |path|
        uuid = path['_uuid']
        if process.has_key?(uuid.to_s)
          if path['_original'] and org_paths.has_key?(path['_original'])
            model_path = org_paths[path['_original']]
          else
            model_path = Path.new
            model_path.organization = organization
            model_path.path_segments = []
          end

          model_path.name = path['name']
          model_path.marker_name = path['marker_name']
          model_path.label_away = path['label_away']
          model_path.label_towards = path['label_towards']

          queue << model_path

          if path.has_key?('path_segments')
            path['path_segments'].each do |segment|
              if process.has_key?(segment['_uuid'].to_s)
                model_segment = (model_path.new_record?) ? nil : model_path.path_segments.where(id: segment['_original']).first

                case segment['action']
                  when 'delete'
                    model_segment.mark_destroyed unless model_segment.nil?
                    next
                  when 'add'
                    model_segment = PathSegment.new
                    model_segment.path = model_path
                  when 'edit'
                    model_segment.mark_destroyed unless model_segment.nil?

                    model_segment = PathSegment.new
                    model_segment.path = model_path
                    # um.. the above .find should take care of whatever we need to do here..
                  else
                    # unknown, no op
                    next
                end

                model_segment.fibre_line_id = segment['fibre_line_id']
                model_segment.start_distance = segment['start_distance'].to_i
                model_segment.end_distance = segment['end_distance'].to_i
                model_segment.distance_from_marker = segment['distance_from_marker'].to_i
                model_segment.normalizer = segment['normalizer']
                model_segment.segment_order = segment['segment_order']

                model_path.path_segments.push(model_segment)
                queue << model_segment
              else
                logger.info "Segment marked as do not process for path #{model_path.name}: '#{segment.inspect}'"
              end
            end
          end
        else
          path.delete 'path_segments'
          logger.info "Path marked as do-not-process. '#{path.inspect}'"
        end
      end
    end

    queue.each{|q| q.save}

      # Add message to flash messenger
    logger.info "Added #{queue.length} changes"
    flash[:info] = {:paths => {organization.id => I18n.t('alert.automated_response.action_successful')}}
    redirect_to :action => 'index'
  end

  # Handles AJAX request to delete a particular path from a particular organization
  def destroy
    security_breach unless can? :delete, :fibre_lines

    setup_data

    path_id = params[:id].to_i
    organization = params[:organization].to_i

    @id = nil
    @error = nil

    begin
      Path.transaction do
        if @paths.has_key?(organization)
          @paths[organization].each do |id, path|
            if path.id == path_id
              path.mark_destroyed
              @id = path_id
            end
          end
        end
      end

      if @id.nil?
        @error = I18n.t('errors.five_hundred.header')
      end
    rescue => exception
      log_exception exception
      @error = exception
    end

    render :json => @id.nil? ? {:error => @error.to_s, :status => "error"} : {:status => "success"}
  end

  def destroy_all
    security_breach unless can? :delete, :fibre_lines

    setup_data

    organization = params[:organization].to_i
    begin
      Path.transaction do
        if @paths.has_key?(organization)
          @paths[organization].each do |id, path|
              path.mark_destroyed
          end
        end
      end
    rescue => exception
      log_exception exception
      @error = exception
    end

    render :json => {:status => "success"}
  end

  def download
    setup_data
    unless (organization = params[:organization].to_i)
      logger.error "Unable to find organization with id #{params[:organization]}"
      flash[:error] = {:paths => {:general => I18n.t('errors.five_hundred.header')}}
      redirect_to :action => "index" and return
    end

    @yaml = get_path_yaml organization, (path_id = params[:id].to_i)

    organization = @organizations.index{|o| o.id == params[:organization].to_i }
    filename = sprintf("%s Routes", @organizations[organization].name)
    if path_id
      filename << sprintf(" - Path %s", @yaml.first["name"]) unless @yaml.empty?
    end

    send_data render_to_string(:action => '_yaml_format', :layout => false), {:filename => "#{filename}.yaml", :type => 'application/yaml', :disposition =>'attachment'}
  end


  ###########################
  # Read the common data.
  def setup_data
    @distance_units = get_preference('units-distance')[:value]
    @distance_precision = get_preference('precision-distance')[:value]

    @organizations = current_user.organizations

    paths_all = Path.get_system_paths(current_user.organization_ids)

    @paths = {}
    paths_all.each do |path|
      @paths[path.organization_id] ||= {}
      @paths[path.organization_id][path.id] = path
    end
  end

  # Perform our permission checks and throw an exception if they fail.
  def security_check
    security_breach unless can? :manage, :paths
  end

  def get_path_yaml(organization, path_id)
    setup_data if (@organizations.empty? or @paths.empty?)

    return {} unless organization and @paths.has_key?(organization)

    paths = @paths[organization.to_i].values.select{ | p |
      !path_id || path_id <= 0 || p.id == path_id
    }.sort_by { | path |
      if path.path_segments.length > 0
        path.path_segments.first().start_distance
      else
        0
      end
    }

    paths.map do |p|
      block = {
          'id' => p.id,
          'name' => p.name,
          'marker_name' => p.marker_name,
          'direction_away_from_marker' => p.label_away,
          'direction_towards_marker' => p.label_towards,
          'segments' => []
      }
      p.path_segments.each do |seg|
        block['segments'] << {
            'id' => seg.id,
            'fibre_line_id' => seg.fibre_line_id,
            'start_distance' => seg.start_distance,
            'end_distance' => seg.end_distance,
            'distance_from_marker' => seg.distance_from_marker
        }
      end

      block
    end
  end
end