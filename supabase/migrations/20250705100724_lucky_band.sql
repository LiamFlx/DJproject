-- Create storage bucket for tracks
INSERT INTO storage.buckets (id, name, public)
VALUES ('tracks', 'tracks', true)
ON CONFLICT (id) DO NOTHING;

-- Set up public read policy for tracks bucket
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'tracks');

-- Allow authenticated users to upload tracks
CREATE POLICY "Authenticated users can upload tracks" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tracks');

-- Allow users to update their own tracks
CREATE POLICY "Users can update their own tracks" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'tracks' AND owner = auth.uid());

-- Allow users to delete their own tracks
CREATE POLICY "Users can delete their own tracks" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'tracks' AND owner = auth.uid());