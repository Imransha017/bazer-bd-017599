-- Allow authenticated users to upload/manage images under their own uid folder in 'products' bucket
-- (needed for vendor application logo/banner uploads before role is granted, and for profile-like uploads)

CREATE POLICY "Authenticated upload own folder products" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'products'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated update own folder products" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'products'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated delete own folder products" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'products'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public read products bucket" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'products');