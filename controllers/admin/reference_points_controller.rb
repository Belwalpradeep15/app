# FILENAME:     reference_points_controller.rb
# AUTHOR:       Karina Simard
# CREATED ON:   10-09-12
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


class Admin::ReferencePointsController < AdminController
    before_action :security_check
    before_action :get_organization

    def index
        @reference_points = @organization.reference_points.with_lat_lng
        @latlng_format = get_preference('units-latlng')[:value]
        @latlng_precision = get_preference('precision-latlng')[:value]

        @menu = setup_admin_menu
    end

    def show
    end

    def new
    end

    def create
        params.permit!
        ref_point = @organization.reference_points.build(params[:reference_point])
        ref_point.save
        render :template => 'admin/create'
    end

    def edit
    end

    def update
        begin
            ReferencePoint.transaction do
                ReferencePoint.update_field(params[:id], current_user, params[:field], params[:value])
            end
            @error = nil
            @formId = 'row_' + params[:id]
        rescue => exception
            log_exception(exception)
            @error = exception
        end

        render :template => 'admin/update'
    end

    def destroy
        begin
            @reference_point.destroy
        rescue => ex
            log_exception(ex)
            @error = exception
        end
        render :template => 'admin/destroy'
    end

    def edit_section_location
        @section_diagrams = Document.find(:all,
                             :select => 'DISTINCT documents.*',
                             :conditions => {'organizations.id' => @organization.id},
                             :joins => {:fibre_lines => {:organization => :users }})
        @section_locations = DocumentsReferencePoint.where(reference_point_id: @reference_point.id)

        if request.get?
            render :partial => 'admin/reference_points/reference_point_section_location_dialog'
        elsif request.put?
            params.keys.select{|key| key[/x_offset_/]}.each do |key|
                document_id = key[/\d+/]
                x_offset = params['x_offset_'+document_id]
                y_offset = params['y_offset_'+document_id]

                document_ref_point = DocumentsReferencePoint.find(:first, :conditions => {:reference_point_id => @reference_point.id, :document_id => document_id})

                if(x_offset.blank? and y_offset.blank?)
                    document_ref_point.destroy if !document_ref_point.nil?
                else
                    document_ref_point = DocumentsReferencePoint.new(:reference_point_id => @reference_point.id, :document_id => document_id) if document_ref_point.nil?

                    document_ref_point.x_offset = x_offset
                    document_ref_point.y_offset = y_offset
                    document_ref_point.save
                end
            end

            @dialogId = 'reference_point_section_location_dialog'
            render :template => '/admin/update.js'
        end
    end


  private

    # Perform our permission checks and throw an exception if they fail.
    def security_check
        security_breach unless can? :manage, :organizations
    end

    def get_organization
        @error = nil
        @organization = Organization.find params[:organization_id]
        @reference_point = ReferencePoint.find(params[:id]) if params[:id]
    end
end
