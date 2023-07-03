# FILENAME:     statistics.rb
# AUTHOR:       Steven Klassen
# CREATED ON:   2009-02-11
# 
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright (c) 2009 by Fotech Solutions. All rights
# reserved.



# Methods and classes used for statistical analysis.
module Statistics

    # Given an array of numbers, return a hash containing a number of basic statistics
    # for the numbers. The hash will have the keys :min, :max, :mean, & :standard_deviation.
    #
    # This method is based on code found in "C/C++ MATHEMATICAL ALGORITHMS FOR SCIENTISTS
    # AND ENGINEERS", ISBN 0-07-912004.
    def self.simple_statistics(values)
        raise "Cannot compute statistics on a single value" if values.length <= 1
        
        min = max = values[0]
        sum = sumX = sumX2 = 0
        values.each { |xx|
            x2 = xx * xx
            sum += 1
            sumX += xx
            sumX2 += x2
            min = xx if xx < min
            max = xx if xx > max
        }
        
        { :min => min, :max => max, :mean => sumX / sum, \
          :standard_deviation => Math.sqrt((sumX2 - (sumX * sumX)/sum) / (sum - 1.0)) }
    end
    
    # This is the same as simple_statistics but its input is a comma-delimited string
    # instead of an array. 
    def self.simple_statistics_str(values)
        min = max = nil
        sum = sumX = sumX2 = 0
        
        values.split(',').each { |xxstr|
            xx = xxstr.to_f
            x2 = xx * xx
            sum += 1
            sumX += xx
            sumX2 += x2
            min = xx if min.nil? or xx < min
            max = xx if max.nil? or xx > max
        }
        
        raise "Cannot compute statistics on a single value" if sum <= 1
        
        { :min => min, :max => max, :mean => sumX / sum, \
          :standard_deviation => Math.sqrt((sumX2 - (sumX * sumX)/sum) / (sum - 1.0)) }
    end
end
