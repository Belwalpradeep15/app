class Location < ApplicationRecord
    belongs_to  :document
    belongs_to  :marker
end
