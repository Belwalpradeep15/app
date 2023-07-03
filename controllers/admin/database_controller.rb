class Admin::DatabaseController < AdminController
  skip_before_action :verify_authenticity_token

  def wipe_db
    security_breach unless can? :trigger, :wipe_db
    stop_services
    output = %x(DISABLE_DATABASE_ENVIRONMENT_CHECK=1 #{Rails.root}/bin/rails fotech:db:wipe 2>&1)
    success = $?.success?
    logger.debug "output=#{output}"
    queue_restart_services
    throw "wipe_db failed." if not success
  end

  def save_db
    security_breach unless can? :trigger, :save_db
    output = %x(#{Rails.root}/bin/rails fotech:db:save_config_only 2>&1)
    success = $?.success?
    logger.debug "output=#{output}"
    throw "save_db failed." if not success
  end

  def restore_db
    security_breach unless can? :trigger, :restore_db
    stop_services
    restore_args = ""
    if not params[:filename].nil?
      restore_args = "[#{params[:filename]}]"
    end
    output = %x(DISABLE_DATABASE_ENVIRONMENT_CHECK=1 #{Rails.root}/bin/rails "fotech:db:restore#{restore_args}" 2>&1)
    success = $?.success?
    logger.debug "output=#{output}"
    queue_restart_services
    throw "restore_db failed." if not success
  end

  private

  # If a service touches the database or maintains an open connection to it,
  # it must be closed before the database can be wipted or restores, otherwise postgres complains about open connections.


  # These are the services apart from httpd, that must be stopped/restarted.
  # The httpd is simply restarted, as it will be handling the request.
  def db_services
    ["delayedjobsd", "controld", "modbusd", "commsd", "watchdogd"]
  end

  def stop_services
    logger.info "Stopping services..."
    db_services.each { |serv| output = %x(sudo service #{serv} stop 2>&1); logger.debug "output=#{output}" }
  end

  def restart_services
    logger.info "Restarting services..."
    db_services.each { |serv| output = %x(sudo service #{serv} restart 2>&1); logger.debug "output=#{output}" }
  end

  # Queues a restart of the services.
  # This is useful when you want to respond to the client, but restart services later.
  def queue_restart_services
    logger.info "Queueing restart of services..."
    Thread.new { sleep(1); restart_services; output = %x(sudo service httpd restart 2>&1); logger.debug "output=#{output}" }
  end

end
