CREATE TABLE IF NOT EXISTS public.admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_emails TO authenticated;
GRANT ALL ON public.admin_emails TO service_role;

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage the admin email list" ON public.admin_emails;
CREATE POLICY "Admins manage the admin email list"
ON public.admin_emails FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.admin_emails (email) VALUES ('ade.enoch01@gmail.com')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned public.app_role := 'employee';
BEGIN
  INSERT INTO public.profiles (id, email, full_name, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'department', '')
  )
  ON CONFLICT (id) DO NOTHING;

  IF EXISTS (
    SELECT 1 FROM public.admin_emails a
    WHERE lower(a.email) = lower(NEW.email)
  ) THEN
    assigned := 'admin';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

UPDATE public.user_roles ur
SET role = 'admin'
FROM public.profiles p
WHERE ur.user_id = p.id
  AND lower(p.email) IN (SELECT lower(email) FROM public.admin_emails)
  AND ur.role <> 'admin';