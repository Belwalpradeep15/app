Rails.application.routes.draw do
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html

  root 'monitor/main#index'

  namespace :admin do
    resources :alerts do
      collection do
        get :alert_report
        get :fetch_full_report
        get :fetch_alerts_since
        get :fetch_outstanding_alerts
        post :add_response
      end
      member do
        get :fetch_full_alert
      end
    end

    resources :reports do
      member do
        get :view
      end
    end

    resources :event_clearing_configs

    resources :event_types do
      collection do
        post :upload_custom_event_types
      end
      member do
        delete :destroy
      end
    end

    resources :fibre_lines do
      member do
        post :insert_splice
        get :manual_calibration
        put :manual_calibration
        post :upload_calibrations
        get :map_calibrate
        post :map_calibrate
        get :download_manual_calibration
        post :upload_manual_calibrations_csv
        get :section_calibrate
        post :section_calibrate
        get :section_image
        post :section_image
        get :clear_fibre_break
        put :clear_fibre_break
      end

      # resources :fibre_line do
      #   member do
      #     get :edit_zone
      #     put :edit_zone
      #   end
      #   collection do
      #     get :logging
      #     put :logging
      #   end
      # end

      resources :helios_zones do
        member do
          get :edit_zone
          put :edit_zone
        end
        collection do
          get :logging
          put :logging
        end
      end

      resources :fibre_regions do
        member do
          get :edit_properties
          post :update_properties
          put :update_properties
        end
        collection do
          post :upload_regions
        end
      end

    end


    resources :paths do
      collection do
        get :upload
        post :upload_review
        post :upload_commit
        get :download
        delete :destroy_all
      end
      member do
        delete :destroy
        get :edit
      end
    end

    resources :helios_units do
      member do
        get :edit_properties
        put :update_properties
        post :submit_properties
        get :edit_multiplexing
        get :edit_multiplexing_cycles
        put :update_multiplexing_cycles
        post :submit_multiplexing_cycles
        get :sync_from_helios
        put :sync_from_helios
        get :edit_section_location
        put :edit_section_location
      end
    end

    resources :panoptes_units do
      member do
        get :edit_properties
        put :update_properties
        post :submit_properties
      end
    end

    resources :panoptes do
      collection do
        get :restart_services
        get :restart_system
      end
    end

    resources :alert_configurations do
      collection do
        post :update
        post :heliosupdate
      end
    end


    resources :identity do
      collection do
        post :update_system
        post :update_custom
      end
    end

    resources :notifications do
      collection do
        post :update
        post :send_test
      end
    end

    resources :organizations do
      resources :reference_points do
        member do
          get :edit_section_location
          put :edit_section_location
        end
      end
      resources :markers
    end

    resources :performance do
      collection do
        get :statistics
      end
    end

    resources :preferences do
      collection do
        get :reset
        get :form
      end
    end

    resources :purge_database do
      collection do
        post :purge
      end
    end

    resources :reference_points

    resources :system_preferences

    resources :users do
      collection do
        get :edit
        post :edit
      end
    end

    resources :schedule do
    	member do
    		put :edit
    	end
    end

    resources :markers do
      member do
        get :map_calibrate
        post :map_calibrate
      end
    end

    resources :marker_types do
      collection do
        post :upload_custom_marker_types
      end
    end

    resources :database do
      collection do
        post :wipe_db
        post :save_db
        post :restore_db
      end
    end
  end


  namespace :monitor do
    resource :colour do
      collection do
        post :save
        post :open
      end
    end

    resource :events do
      collection do
        get :initsearch
        get :search
        post :search
        get :get_track_events
        get :post
        get :fetch_events_since
      end
    end

    resources :fibre_lines

    resources :helioscontrol do
      collection do
        get :status
        post :status
      end
      member do
        get :start
        get :stop
        get :laser_status
        get :start_laser
        get :stop_laser
      end
    end

    resources :main do
      member do
        get :display
      end
      collection do
        get :download_logs
        get :filter
        get :about
        get :canvas_support
        get :startup
        get :legend
        get :system_health
      end
    end

    resources :session do
      collection do
        get :logout
        get :login
      end
    end

    resources :audio do
      collection do
        get :play
      end
    end

    ##NOTE: watchdog does not seems to be used as it is now separated to module/watchdog -12Aug2015- comment it for now -
    #monitor.resources :watchdog

  end

  resource :licenses
  resource :help

  scope 'portal' do
    resource :events, :controller => 'monitor/events', portal_request: true do
      collection do
        get :initsearch
        get :search
        post :search
        get :get_track_events
        get :post
        get :fetch_events_since
      end
    end
  end

  # These are from the old panoptes-rails routes.rb.
  # We don't really need all of them, so as needed, I'll slowly support them using the new syntax.
  # map.connect '/portal/resolve_all/:alert_name', :controller => 'admin/alerts', :action => :resolve_all, :portal_request => true
  # map.connect '/portal/resolve_all', :controller => 'admin/alerts', :action => :resolve_all, :portal_request => true
  # map.connect '/portal/alerts.:format', :controller => 'admin/alerts', :action => :index, :portal_request => true
  # map.connect '/portal/alert_report', :controller => 'admin/alerts', :action => :alert_report, :portal_request => true
  # map.connect '/portal/alert_report.:format', :controller => 'admin/alerts', :action => :alert_report, :portal_request => true
  # map.connect '/portal/fetch_full_alert/:id', :controller => 'admin/alerts', :action => :fetch_full_alert, :portal_request => true
  # map.connect '/portal/alerts/add_response', :controller => 'admin/alerts', :action => :add_response, :portal_request => true
  # map.connect '/portal/alerts/delete/:id', :controller => 'admin/alerts', :action => :destroy, :portal_request => true
  # map.connect '/portal/alerts/:id', :controller => 'admin/alerts', :action => :show, :portal_request => true
  # map.connect '/portal/gela', :controller => 'portal', :action => :gela, :portal_request => true
  # map.connect '/portal/section_image', :controller => 'portal', :action => :section_image, :portal_request => true
  # map.connect '/portal/mainviewonly/:id', :controller => 'portal', :action => :show, :portal_request => true, :main_view_only => true
  # map.connect '/portal/preferences/reset', :controller => 'admin/preferences', :action => :reset, :portal_request => true
  # map.connect '/portal/preferences/:preferenceKey', :controller => 'admin/preferences', :action => :update, :portal_request => true
  # map.connect '/portal/preferences', :controller => 'admin/preferences', :portal_request => true
  # map.connect '/portal/:id', :controller => 'portal', :action => :show, :portal_request => true
  # map.connect '/portal/fibre_lines/:id', :controller => 'monitor/fibre_lines', :action => :show, :portal_request => true

  scope 'portal', portal_request: true do
    get   '/',                      to: 'portal#show'

    get   '/alerts',                to: 'admin/alerts#index'
    get   '/alerts/:id',            to: 'admin/alerts#show'
    post  '/alerts/add_response',   to: 'admin/alerts#add_response'
    delete  '/alerts/delete/:id',     to: 'admin/alerts#destroy'

    get   '/alert_report',          to: 'admin/alerts#alert_report'

    get   '/fibre_lines/:id',       to: 'monitor/fibre_lines#show'

    get   '/section_image',         to: 'portal#section_image'

    get   '/preferences',                  to: 'admin/preferences#index'
    put   '/preferences/:preferenceKey',   to: 'admin/preferences#update'
    get   '/preferences/reset',            to: 'admin/preferences#reset'
  end

  scope 'portal', portal_request: true, main_view_only: true do
  end

end
