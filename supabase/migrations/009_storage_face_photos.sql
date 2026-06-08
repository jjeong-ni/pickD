-- Ensure face-photos storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-photos', 'face-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload their own face photo
CREATE POLICY IF NOT EXISTS "auth users upload face photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'face-photos');

-- Allow public read access for face photos (needed for skin report display)
CREATE POLICY IF NOT EXISTS "public read face photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'face-photos');

-- Allow authenticated users to update/replace their own photo
CREATE POLICY IF NOT EXISTS "auth users update face photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'face-photos');
