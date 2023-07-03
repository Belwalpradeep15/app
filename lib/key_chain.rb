# FILENAME:     key_chain.rb
# AUTHOR:       Matthew Stuart <matthew.stuart@fotechsolutions.com>
# CREATED ON:   2016-01-26
#
# DESCRIPTION:
#   Provides a library of functions to support checking for existance of key chains in objects
# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2016 Fotech Solutions Ltd. All rights reserved.

# Checks a HASH to determine if the defined keychain exists. If not a Hash return false
def has_key_chain?(hash, chain)
  return false unless hash.kind_of?(Hash)

  ptr = hash
  chain.each do |c|
    return false unless ptr.kind_of?(Hash) && ptr.has_key?(c)
    ptr = ptr[c]
  end

  true
end