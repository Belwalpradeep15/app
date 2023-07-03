# FILENAME:     performance_controller.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2010-01-06
#
# DESCRIPTION:  Performance monitoring sub-application.
#
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.


class Admin::PerformanceController < AdminController

    before_action :security_check

    # Entry point to the performance monitoring page.
    def index
        @menu = setup_admin_menu
        @title = "Fotech Solutions Performance Admin"
        render :layout => "admin"
    end

    # Obtain the statistics.
    def statistics
        @stats = gather_access_statistics
        render :partial => "statistics"
    end

private

    # Perform our permissions checks.
    def security_check
        security_breach unless can? :manage, :webserver
    end

    # Obtain the access statistics from the access log file.
    def gather_access_statistics
        count = 0
        firstdate = nil
        lastdate = nil
        totaltime = 0
        urls = {}

        File.open(APP_CONFIG["monitor"]["usage_log"], "r") do |file|
            while not file.eof?
                line = parse_line(file)
                if !line.nil?
                    count = count + 1
                    firstdate = line[:date] if not firstdate
                    lastdate = line[:date]
                    time = line[:time].to_i / 1000
                    totaltime = totaltime + time

                    url = urls[line[:url]]
                    if not url
                        url = { :url => line[:url], :count => 0, :time => 0, :best => time, :worst => time }
                        urls[line[:url]] = url
                    end
                    url[:count] = url[:count] + 1
                    url[:time] = url[:time] + time
                    url[:best] = time if time < url[:best]
                    url[:worst] = time if time > url[:worst]
                end
            end
        end

        urls = urls.values
        urls.delete_if { |stat| ((stat[:time].to_f / stat[:count]) < 0.01) or ((stat[:time].to_f / totaltime) < 0.0001) }
        urls.sort! { |a,b| b[:time] <=> a[:time] }

        { :count => count, :firstdate => firstdate, :lastdate => lastdate, :time => totaltime, :urls => urls }
    end

    # Parse a single line of the log file.
    def parse_line(file)
        line = file.readline

        begin
            pos = line.index("[Request:") + 9
            endpos = line.index("]", pos) - 1
            req = line[pos..endpos].split("|")
            req[2].gsub!(/[0-9]+/, "###")

            pos = line.index("[Response:", endpos+1) + 10
            endpos = line.index("]", pos) - 1
            resp = line[pos..endpos].split("|")

            return { :date => line[1,26], :url => req[1]+":"+req[2], :time => resp[0] }
        rescue
            logger.warn "Failed to parse line: #{line}"
        end
        return nil
    end
end
