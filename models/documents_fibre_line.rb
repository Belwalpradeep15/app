# COPYRIGHT:
# This file is Copyright © 2010 Fotech Solutions Ltd. All rights reserved.

class DocumentsFibreLine < ApplicationRecord
    belongs_to :document
    belongs_to :fibre_line
end

