# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2016 Fotech Solutions Ltd. All rights reserved.

class Path < FotechActiveRecord
  before_update :mark_updated
  before_destroy :mark_destroyed

  belongs_to :organization, foreign_key: :organization_id

  has_many :path_segments, -> { order :segment_order }, dependent: :delete_all

  # Use this scope when you want to ignore entities marked as deleted. We may want to
  # consider making this the default and providing a separate scope that will include
  # the deleted items when necessary.
  scope :not_deleted, -> { where deleted_at: nil }

  def mark_updated
    if self.deleted_at.nil?
      self.updated_at = Time.now
    end
  end

  def mark_destroyed
    self.deleted_at = Time.now
    self.save

    false
  end

  def self.get_system_paths(organization_ids)
     Path.not_deleted.where(organization_id: organization_ids).order("upper(name)")
  end
end
