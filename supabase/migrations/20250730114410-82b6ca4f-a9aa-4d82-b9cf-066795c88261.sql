-- Update the video-uploads bucket to allow 200MB files
UPDATE storage.buckets 
SET file_size_limit = 209715200  -- 200MB in bytes
WHERE id = 'video-uploads';

-- First, check if there are any rows in upload_configs
DO $$
BEGIN
    -- If no rows exist, insert a default config
    IF NOT EXISTS (SELECT 1 FROM upload_configs) THEN
        INSERT INTO upload_configs (max_file_size_mb, allowed_formats) 
        VALUES (200, ARRAY['mp4', 'mov', 'avi', 'mkv']);
    ELSE
        -- Update existing config (assuming the first row is the active config)
        UPDATE upload_configs 
        SET max_file_size_mb = 200 
        WHERE id = (SELECT id FROM upload_configs LIMIT 1);
    END IF;
END $$;