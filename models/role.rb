class Role < ApplicationRecord
  has_and_belongs_to_many :users

  validates_uniqueness_of :title
end
