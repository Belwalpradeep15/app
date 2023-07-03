# LAST CHANGE:
# $Author$
#   $Date$
#    $Rev$
#    $URL$
#
# COPYRIGHT:
# This file is Copyright © 2009 Fotech Solutions Ltd. All rights reserved.

class Document < ApplicationRecord
  has_attachment :storage => :file_system, :path_prefix => 'public/images/uploads', #:storage => :db_file,
                 :processor => :MiniMagick,
                 :content_type => :image
  has_and_belongs_to_many :fibre_lines
  belongs_to :organization
  has_many :documents_reference_points, dependent: :destroy
  has_many :locations

  # Find the document associated with a fibre line section calibration, if any. This also
  # enforces a permission check.
  def self.find_for_section_calibration(fibreLineId, loginname)
    section_calibration = SectionCalibration.where(fibre_line_id: fibreLineId).first
    return self.find(:first,
                     :conditions => ['documents.id = ? AND fibre_lines.id = ? AND users.loginname = ?', section_calibration.document_id, fibreLineId, loginname],
                     :joins => {:fibre_lines => {:organization => :users }})
  end

  def dimensions
    #identify requires ImageMagick brought in by the attachment_fu gem
    fileInfo = `/usr/bin/identify #{Rails.root}/public#{public_filename}`
    fileInfo = fileInfo[/ \d+x\d+ /]
    return fileInfo.split('x')
  end
end
