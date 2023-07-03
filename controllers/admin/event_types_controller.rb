# FILENAME:     event_types_controller.rb
# AUTHOR:       Rui Zhu
# CREATED ON:   16-09-22
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

require 'zlib'
require 'rubygems/package'
require 'minitar'
require 'tempfile'

class Admin::EventTypesController < AdminController

    before_action :security_check

    # Entry point to the event types configuration administration page.
    def index
        @eventTypes = EventType.all
        EventType.sort_by_description(@eventTypes)

        @customEventTypes = EventType.get_active
        EventType.sort_by_description(@customEventTypes)

        @menu = setup_admin_menu
        @title = I18n.t('admin.configuration.event_types.title')
        @suppressUser = true
        render :layout => "admin"
    end

    # Get custom event types from the uploaded file
    def upload_custom_event_types
        upload = params[:upload_file_type]

        all = EventType.all
        current_by_name = Hash[all.map{|el| [el.name, el]}]
        current_by_desc = Hash[all.map{|el| [el.description, el.name]}]
        incoming = {}
        original_images = {}
        @incoming_images = {}

		t = Archive::Tar::Minitar::Input.new(upload.open())
        t.each do |e|
        	if e.full_name.start_with? "images/"
        		key = (File.basename e.full_name).split('.')[0..-2].join('.')
        		@incoming_images[key] = e.read
        	elsif e.full_name == "event_types.yml"
        		definition = e.read
        		definition = YAML.load definition

        		rename_description = Proc.new do |c, d|
        			base = desc = d['description']
        			n = 0
        			while c.key?(desc) && c[desc] != d['name']
        				desc = base + " " + (++n).to_s
        				logger.info "Duplicate description found during import #{base} trying #{desc}"
        			end
        			desc
        		end

        		definition.each do |k, d|
        			next unless d['removable']

        			if current_by_name.key? d['name']
        				# UPDATE
        				el = current_by_name[d['name']]
        				original_desc = el.description
        				logger.info "Queueing update for EventLabel #{d['name']}"
        				el.description = rename_description.call(current_by_desc, d)

        				# If the original had an image location specified and not a default, store it for later handling
        				el.image_file = File.basename d['medium_icon']
        				# remove the original mapping
        				current_by_desc.delete(original_desc)
        			else
        				logger.info "Queueing creation for EventLabel #{d['name']}"
        				# NEW
        				el = d
        				el['is_new'] = true
        				el['description'] = rename_description.call(current_by_desc, d)
        				el['image_file'] = File.basename d['medium_icon']
        			end

        			# update the current mapping
        			current_by_name[el['name']] = el
        			current_by_desc[el['description']] = el['name']
        			incoming[d['name']] = el
        		end
        	end
        end

        # Everything is loaded.. let's do our thing
        general_category = EventCategory.find_by_name 'general'
        logger.info "Inserting #{incoming.count} event types"
        incoming.each do |k, v|
            if v['is_new']
                # NEW ONE
                et = EventType.create(
                    :name => v['name'],
                    :description => v['description'],
                    :event_category => general_category,
                    :image_file => "custom/#{v['image_file']}"
                )
                image_file = v['image_file']

                key = image_file.split('.')[0..-2].join('.')
                File.open(Rails.public_path.to_s + et.image_path('small'), 'wb') { |f| f.write @incoming_images["#{key}_small"]}
                File.open(Rails.public_path.to_s + et.image_path('medium'), 'wb') { |f| f.write @incoming_images[key] }
                File.open(Rails.public_path.to_s + et.image_path('large'), 'wb') { |f| f.write @incoming_images["#{key}_large"] }
            else
                # UPDATE
                logger.info "Updating EventType #{v['name']} Type: #{v.inspect}"
                # 1. Remove the old icons
                image_file = v.image_file
                if original_images.key? v.name
                    v.image_file = original_images[v.name]

                    File.delete Rails.public_path.to_s + v.image_path('small') if File.exist? Rails.public_path + v.image_path('small')
                    File.delete Rails.public_path.to_s + v.image_path('medium') if File.exist? Rails.public_path + v.image_path('medium')
                    File.delete Rails.public_path.to_s + v.image_path('large') if File.exist? Rails.public_path + v.image_path('large')
                end
                v.image_file = "custom/#{image_file}"

                # 2. Create the new icons
                key = image_file.split('.')[0..-2].join('.').to_s
                File.open(Rails.public_path.to_s + v.image_path('small'), 'wb') { |f| f.write @incoming_images["#{key}_small"] }
                File.open(Rails.public_path.to_s + v.image_path('medium'), 'wb') { |f| f.write @incoming_images[key] }
                File.open(Rails.public_path.to_s + v.image_path('large'), 'wb') { |f| f.write @incoming_images["#{key}_large"] }

                v.save
            end
        end

        flash[:success] = incoming.size
        redirect_to :action => "index"
    end

    # Modify an existing helios unit.
    def update

    end

    def create
        #can't create... we are only updating one field of the event type record
    end

    def edit
        #no separate edit screen
    end

    # Delete an existing event tracking configuration.
    def destroy
      id = params[:id]
      event_type = EventType.find(id)
      if event_type
        if event_type.in_use?
          # Can't delete
          render :json => {:status => "error", :error => I18n.t("admin.configuration.event_types.error_event_currently_active")}
          return
        end

        EventType.transaction do
            event_type.remove_event_references
            event_type.destroy
        end
        render :json => {:status => "success"}
      else
        render :json => {:status => "error", :error => I18n.t("errors.not_found")}
      end
    end

  private

    # Perform our permission checks and throw an exception if they fail.
    def security_check
        security_breach unless can? :manage, :event_types
    end

end

