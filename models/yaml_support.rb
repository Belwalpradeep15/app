require 'yaml'

module YamlSupport
  # This module handles the system_identity.yml file, which contains identity values like name, uuid, etc.
  # as well as organisation's custom identity values.
  #
  # Note that we cannot mix the YAML.load_file(filename) API with the File.open(filename) API as the former bypasses
  # Ruby's IO buffering, which causes some problems.

  def self.is_key_on_yaml_file?(key)
    return true if key=="identity_custom_name" || key=="identity_custom_id" || key=="identity_name" || key=="identity_uuid" || key=="identity_serial_number"
    false
  end

  def self.create_or_update_through_yaml(key, value, organisation_id = nil)
    begin
      content = File.read(SYSTEM_IDENTITY_FILE)
      system_identity = YAML.load(content)
    rescue
      system_identity = {"identity"=>{"name"=>"","uuid"=>""}}
    end

    system_identity["identity"]["name"] = value           if key=="identity_name"
    system_identity["identity"]["uuid"] = value           if key=="identity_uuid"
    system_identity["identity"]["serial_number"] = value  if key=="identity_serial_number"

    system_identity["organization"] ||= {}
    if organisation_id
      system_identity["organization"]["#{organisation_id}"] ||= {}
      system_identity["organization"]["#{organisation_id}"]["custom_name"] = value  if key=="identity_custom_name"
      system_identity["organization"]["#{organisation_id}"]["custom_id"] = value    if key=="identity_custom_id"
    end

    File.open(SYSTEM_IDENTITY_FILE, 'w')do |file|
      file.write system_identity.to_yaml
    end
  end

  def self.get_yaml_value(key, organisation_id = nil)
    begin
      content = File.read(SYSTEM_IDENTITY_FILE)
      system_identity = YAML.load(content)
    rescue
      return ""
    end

    if system_identity["identity"]
      return system_identity["identity"]["name"]            if key=="identity_name" && system_identity["identity"]["name"]
      return system_identity["identity"]["uuid"]            if key=="identity_uuid" && system_identity["identity"]["uuid"]
      return system_identity["identity"]["serial_number"]   if key=="identity_serial_number" && system_identity["identity"]["serial_number"]
    end

    if organisation_id && system_identity["organization"] && system_identity["organization"]["#{organisation_id}"]
      return system_identity["organization"]["#{organisation_id}"]["custom_name"]   if key=="identity_custom_name" && system_identity["organization"]["#{organisation_id}"]["custom_name"]
      return system_identity["organization"]["#{organisation_id}"]["custom_id"]     if key=="identity_custom_id" && system_identity["organization"]["#{organisation_id}"]["custom_id"]
    end

    return ""
  end

end