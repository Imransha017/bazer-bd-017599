
DROP POLICY IF EXISTS "Public read products bucket" ON storage.objects;
CREATE POLICY "Public read products bucket"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Authenticated upload products bucket" ON storage.objects;
CREATE POLICY "Authenticated upload products bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'products');

DROP POLICY IF EXISTS "Authenticated update products bucket" ON storage.objects;
CREATE POLICY "Authenticated update products bucket"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Authenticated delete products bucket" ON storage.objects;
CREATE POLICY "Authenticated delete products bucket"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'products');
