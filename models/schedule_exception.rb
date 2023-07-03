class ScheduleException < ApplicationRecord
   has_paper_trail
   #don't bother retrieving exceptions that are expired.
   belongs_to :schedule
end
