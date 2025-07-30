-- Update the video-uploads bucket to allow 200MB files
UPDATE storage.buckets 
SET file_size_limit = 209715200  -- 200MB in bytes
WHERE id = 'video-uploads';

-- Update the upload configuration to 200MB
UPDATE upload_configs 
SET max_file_size_mb = 200 
WHERE id = 1;