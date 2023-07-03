# This class is used to send a ZeroMQ notification message.

# Note that we don't use this anymore.
# As of 15.0, the rails code (or anyone) just updates the database.
# The tables are setup with triggers, and the controld service has a db_listener
# that gets notified when the tables change.

require 'rubygems'
require 'ffi-rzmq'

class Notifier

	# def self.notifyEventTypesChanged
	# 	notify("/config/eventTypesChanged")
	# end

	# def self.notifyAlertSettingsChanged
	# 	notify("/config/alertSettingsChanged")
	# end

	# def self.notifyFibreLinesChanged
	# 	notify("/config/fibreLinesChanged")
	# end

	# def self.notifyHeliosUnitsChanged
	# 	notify("/config/heliosUnitsChanged")
	# end

  private
	def self.notify(message)
		Timeout::timeout(10) {
			endpoint = SYSTEM_CONFIG['communications']['publisher_queue_endpoint']
			context = ZMQ::Context.new(1)
			requester = context.socket(ZMQ::REQ)
			requester.connect(endpoint)
			requester.send_string(message)

			reply = ''
			rc = requester.recv_string(reply)
			requester.close
		}
	end
end
