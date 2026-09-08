CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL,
  employee_name text NOT NULL,
  employee_email text NOT NULL,
  department text,
  vendor text,
  amount numeric NOT NULL DEFAULT 0,
  purpose text,
  payment_method text,
  project_client text,
  additional_notes text,
  expense_date date,
  receipt_url text,
  status text NOT NULL DEFAULT 'pending',
  requires_approval boolean NOT NULL DEFAULT false,
  ai_summary text,
  ai_reviewer_note text,
  manager_comment text,
  approved_by text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.expenses TO anon;
GRANT SELECT, INSERT, UPDATE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can file an expense"
  ON public.expenses FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Managers and admins can read expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers and admins can update expenses"
  ON public.expenses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER expenses_set_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX expenses_status_idx ON public.expenses (status);

CREATE POLICY "Anyone can upload a receipt"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Managers and admins can read receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')));