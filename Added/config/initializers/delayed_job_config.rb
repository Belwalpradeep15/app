Delayed::Worker.destroy_failed_jobs = Rails.env.production?
Delayed::Worker.max_attempts = 3
Delayed::Worker.max_run_time = 5.minutes
