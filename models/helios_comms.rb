# FILENAME:     helios_comms.rb
# AUTHOR:       Karina Simard
# CREATED ON:   10-06-01
# 
# DESCRIPTION:  A class to encapsulate some of the comms between panoptes and
# the helios units.
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.


class HeliosCommands
	def initialize
		@expected_responses = {:get_laser_status => ["ON\nOK\n", "OFF\nOK\n", "LOCKED OUT\nOK\n"],
		 				   :get_fdel_status => ["process running\nOK\n", "No fdel or sim_fdel process is running\nOK\n"]
						  }
	     @commands_in_xml = 	{:get_laser_status => "<get_laser_status/>",
		 :get_fdel_status  => "<get_fdel_status/>",
		 :start_fdel => "<start_fdel/>",
		 :stop_fdel => "<stop_fdel/>" }
	    @asynchronous_commands = [:start_fdel, :stop_fdel, :start_laser, :stop_laser, :update_threat_tables]
	    @synchronous_commands = [:get_fdel_status, :get_laser_status]
	end
	
	def fixed_length_command_to_xml(command)
		return @commands_in_xml[command]
    end

	def check_for_asynchronous_response(response)		
		matched = /\AOK\n\z/.match(response)
		if not matched.nil?
			Rails.logger.info "========================== Command is asynchronous"
		end
		return matched
	end

	#TODO: Maybe match against specific responses as defined in @expected_responses
	def check_for_synchronous_response(response)
		matched = /.*\nOK.*\n\z/.match(response)
		if not matched.nil?
			Rails.logger.info "========================== Command is synchronous"
		end
		return matched
    end
   
	def check_for_unsupported_response(response)
		matched = /ERR: Unsupported command.*\n\z/.match(response)
		if not matched.nil?
			Rails.logger.info "========================== Command is unsupported"
		end
		return matched	
    end

	def check_if_command_caused_exception(response)
		matched = /ERR:.*\n\z/.match(response)
        if not matched.nil?
			Rails.logger.info "========================== Command caused an exception"
	    end
		return matched
    end

	def check_response(response)
		return (self.check_for_asynchronous_response(response) || 
		        self.check_for_synchronous_response(response) ||
		        self.check_for_unsupported_response(response) || 
		        self.check_if_command_caused_exception(response))
	end
end

class HeliosComms
    @@default_timeout = 15
    attr_accessor :protocol_string

    def initialize(helios_unit, options = {})
        @helios_commands = HeliosCommands.new
        @helios_unit = helios_unit
        @timeout = options[:timeout] || @@default_timeout
    end

    def protocol
        if @protocol_string.nil?
            sock = nil
            begin
                Timeout::timeout(@timeout){
                    sock = TCPSocket.new(@helios_unit.host_name, @helios_unit.port)
                    @protocol_string = sock.gets
                }
            rescue Exception => ex
                Rails.logger.warn "Helios Status: #{ex}, skipping #{@helios_unit.host_name}"
                raise ex
            ensure
                sock.close if sock
            end
        end
        @protocol_string[/(\d+\.?)+$/] || "default"
    end
    
    def write(messages)
        message_array = messages.is_a?(Array) ? messages : [messages]
        response_array = Array.new(message_array.length);
        sock = nil
        index = 0
        begin
            Timeout::timeout(@timeout) {
                sock = TCPSocket.new(@helios_unit.host_name, @helios_unit.port)
            }
            message_array.each do |message|
                begin
                    Timeout::timeout(@timeout) {
                        @protocol_string = sock.gets if index == 0 || (index > 0 and protocol == 'default')
                        Rails.logger.info "==========================sending message:\n #{build_message(message)}"
                        puts "==========================sending message:\n #{build_message(message)}"
                        sock.puts(build_message(message))
                        
                        response = sock.gets
                        response = maintain_backwards_compatible_response(response)

                        Rails.logger.info "========================== response: #{response}"
						puts "========================== response: #{response}"
                        while ((@helios_commands.check_response(response)).nil?)
                            response << sock.gets
                        end
                        Rails.logger.info "==========================response: #{response}"
                        puts "==========================response: #{response}"
                    	response_array[index] = validate_and_strip(response)
                    }
                ensure
                    index += 1
                end
            end
        rescue Timeout::Error => ex
            Rails.logger.info "=====================================Timeout error"
            puts "=====================================Timeout error"
            response_array[index] = "Connection timed out"
        rescue Exception => ex
            Rails.logger.info "HeliosComms.status: #{ex}, skipping #{@helios_unit.host_name}"
            puts "HeliosComms.status: #{ex}, skipping #{@helios_unit.host_name}"
            response_array[index] = ex.message
        ensure
            Rails.logger.info "=====================================Done with comms"
            puts "=====================================Done with comms"
            sock.close if sock
            return messages.is_a?(Array) ? response_array : response_array.first
        end
    end
   
    # CNCD has been including an extra null character
    # because it's been constructing messages based on string literals
    # Not that those aren't being included we still need to ensure we can
    # parse responses from older Helios units.
    def maintain_backwards_compatible_response(response)
    	if response.bytes.to_a[0] == 0
			len = response.length
			response = response[-len+1..-1]
		end
		return response
    end
    
    def build_message(message)
        protocol_method = "build_message_version_#{protocol.gsub('.','_')}"
        if respond_to? protocol_method
            return self.send(protocol_method, message)
        else
            raise "CNC Comms Protocol #{protocol_version} is unrecognized"
        end
    end

    def validate_and_strip(response_string)
        protocol_method = "validate_and_strip_version_#{protocol.gsub('.','_')}"
        if respond_to? protocol_method
            return self.send(protocol_method, response_string)
        else
            raise "CNC Comms Protocol #{protocol_version} is unrecognized"
        end
    end

#-------- Message building functions -------------------------------------------

    def build_message_version_default(message)
        message
    end
    
    def build_message_version_1_1(message)
        wrapped_message = "<message>#{message}</message>"
        header = "Protocol: 1.1\nMessage Length: #{wrapped_message.length}\n"
        header + wrapped_message
    end

#-------- Response Validation functions ----------------------------------------
    def validate_and_strip_version_default(response_string)
        response_string
    end

    def validate_and_strip_version_1_1(response_string)
        header = response_string[/^Protocol: 1\.1\nMessage Length: (\d+)\n/]
        return response_string if header.nil?  #no header is there just return the message
        length = response_string[/^Protocol: 1\.1\nMessage Length: (\d+)\n/,1].to_i
        message = response_string[/<message>(.*)<\/message>/m]  #/m at the end makes the . match newlines
        if message.nil? 
            return "Invalid response format.  Message must be wrapped in <message> tag: #{response_string}"
        elsif message.length != length
            raise <<-STRING
                Message doesn't match the length specified by header
                    header:#{length}
                    message length:#{message.length}
                    full response: #{response_string}
            STRING
            
            # 'to fix xcode parsing issues
        end
        return response_string[/<message>(.*)<\/message>/m,1]
    end
end
