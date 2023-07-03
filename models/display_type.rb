class DisplayType < ApplicationRecord
  def description
    # TODO: Determine a better way of getting description
    I18n.t("model.display_type.description.#{self[:name]}")
  end
end
