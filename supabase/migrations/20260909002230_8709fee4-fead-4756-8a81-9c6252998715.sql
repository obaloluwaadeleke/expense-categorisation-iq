CREATE POLICY "Anyone can read receipt files"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'receipts');