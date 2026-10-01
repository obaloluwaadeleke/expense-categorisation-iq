-- Tighten expenses: submissions go through the validated server function (service role),
-- not through anonymous direct inserts.
DROP POLICY IF EXISTS "Anyone can file an expense" ON public.expenses;

-- Tighten receipt storage: uploads and downloads go through the server pipeline
-- (validated upload + signed URLs created with the service role).
DROP POLICY IF EXISTS "Anyone can upload a receipt" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read receipt files" ON storage.objects;