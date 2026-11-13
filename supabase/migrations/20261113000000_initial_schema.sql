-- Chequely: Personal Cheque and Bill Tracker Database Schema
-- Supabase Postgres Migration
-- Best practices applied:
--  - Identity columns instead of serial
--  - numeric(14,2) for all monetary values
--  - timestamptz with default now()
--  - RLS enabled on all tables with (select auth.uid()) = user_id for fast cached evaluation
--  - Views created with security_invoker = true
--  - Triggers for updated_at, audit_log, link amount validation, and status history tracking

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name text,
    gstin text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname text NOT NULL,
    bank_name text NOT NULL,
    branch text,
    ifsc text,
    last_four_digits text NOT NULL,
    account_type text NOT NULL CHECK (account_type IN ('current', 'savings', 'od_cc')),
    opening_balance numeric(14,2) NOT NULL DEFAULT 0.00,
    opening_balance_date date NOT NULL DEFAULT current_date,
    is_default boolean NOT NULL DEFAULT false,
    is_archived boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. PARTIES
CREATE TABLE IF NOT EXISTS public.parties (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    party_type text NOT NULL CHECK (party_type IN ('customer', 'supplier', 'both')),
    phone text,
    gstin text,
    address text,
    notes text,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. BILLS
CREATE TABLE IF NOT EXISTS public.bills (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    party_id bigint NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    direction text NOT NULL CHECK (direction IN ('sale', 'purchase')),
    bill_number text NOT NULL,
    bill_date date NOT NULL DEFAULT current_date,
    due_date date,
    amount numeric(14,2) NOT NULL CHECK (amount > 0),
    notes text,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- BL-2: A bill number cannot repeat for the same party, direction, and user (excluding deleted)
CREATE UNIQUE INDEX IF NOT EXISTS unique_bill_number_per_party 
ON public.bills (user_id, party_id, direction, bill_number) 
WHERE is_deleted = false;

-- 5. CHEQUES
CREATE TABLE IF NOT EXISTS public.cheques (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    party_id bigint NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    bank_account_id bigint REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
    direction text NOT NULL CHECK (direction IN ('received', 'issued')),
    cheque_number text NOT NULL,
    cheque_date date NOT NULL,
    amount numeric(14,2) NOT NULL CHECK (amount > 0),
    payer_bank text,
    payer_branch text,
    payee_type text NOT NULL DEFAULT 'account_payee' CHECK (payee_type IN ('account_payee', 'bearer')),
    is_post_dated boolean NOT NULL DEFAULT false,
    deposit_date date,
    status text NOT NULL,
    bounce_reason text,
    bounce_charges numeric(14,2) DEFAULT 0.00,
    cleared_date date,
    remarks text,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    -- CH-4: Issued cheques must have a bank account selected
    CONSTRAINT check_issued_has_bank_account CHECK (
        direction != 'issued' OR bank_account_id IS NOT NULL
    ),
    
    -- Section 7: Allowed statuses depend strictly on direction
    CONSTRAINT check_status_valid_for_direction CHECK (
        (direction = 'received' AND status IN ('received', 'deposited', 'cleared', 'bounced')) OR
        (direction = 'issued' AND status IN ('issued', 'presented', 'cleared', 'bounced', 'stopped', 'cancelled'))
    )
);

-- CH-3: Duplicate protection
-- Issued cheque number unique per bank account
CREATE UNIQUE INDEX IF NOT EXISTS unique_issued_cheque_per_account
ON public.cheques (user_id, bank_account_id, cheque_number)
WHERE direction = 'issued' AND is_deleted = false;

-- Received cheque unique per party, payer bank, and number
CREATE UNIQUE INDEX IF NOT EXISTS unique_received_cheque_per_party
ON public.cheques (user_id, party_id, coalesce(payer_bank, ''), cheque_number)
WHERE direction = 'received' AND is_deleted = false;

-- 6. CHEQUE STATUS HISTORY
CREATE TABLE IF NOT EXISTS public.cheque_status_history (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cheque_id bigint NOT NULL REFERENCES public.cheques(id) ON DELETE CASCADE,
    old_status text,
    new_status text NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now(),
    notes text
);

-- 7. CHEQUE TO BILL LINKS (Many-to-Many with amount applied)
CREATE TABLE IF NOT EXISTS public.cheque_bill_links (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cheque_id bigint NOT NULL REFERENCES public.cheques(id) ON DELETE CASCADE,
    bill_id bigint NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    amount_applied numeric(14,2) NOT NULL CHECK (amount_applied > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT unique_cheque_bill_link UNIQUE (cheque_id, bill_id)
);

-- 8. CHEQUE BOOKS (R3)
CREATE TABLE IF NOT EXISTS public.cheque_books (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_account_id bigint NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    series_start text NOT NULL,
    series_end text NOT NULL,
    total_leaves integer NOT NULL CHECK (total_leaves > 0),
    used_leaves integer NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. ATTACHMENTS (R3)
CREATE TABLE IF NOT EXISTS public.attachments (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type text NOT NULL CHECK (entity_type IN ('cheque', 'bill')),
    entity_id bigint NOT NULL,
    file_path text NOT NULL,
    thumbnail_path text,
    file_name text NOT NULL,
    file_size integer,
    mime_type text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. AUDIT LOG (PRD Section 8 Rule 6)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    table_name text NOT NULL,
    record_id bigint NOT NULL,
    action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data jsonb,
    new_data jsonb,
    changed_at timestamptz NOT NULL DEFAULT now()
);

--------------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE AND RLS
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON public.bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_parties_user ON public.parties(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_user ON public.bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_party ON public.bills(party_id);
CREATE INDEX IF NOT EXISTS idx_bills_date ON public.bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_cheques_user ON public.cheques(user_id);
CREATE INDEX IF NOT EXISTS idx_cheques_party ON public.cheques(party_id);
CREATE INDEX IF NOT EXISTS idx_cheques_bank ON public.cheques(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_cheques_date ON public.cheques(cheque_date);
CREATE INDEX IF NOT EXISTS idx_cheques_status ON public.cheques(status);
CREATE INDEX IF NOT EXISTS idx_cheques_direction ON public.cheques(direction);
CREATE INDEX IF NOT EXISTS idx_cheque_status_history_cheque ON public.cheque_status_history(cheque_id);
CREATE INDEX IF NOT EXISTS idx_cheque_bill_links_cheque ON public.cheque_bill_links(cheque_id);
CREATE INDEX IF NOT EXISTS idx_cheque_bill_links_bill ON public.cheque_bill_links(bill_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_table ON public.audit_log(user_id, table_name);

--------------------------------------------------------------------------------
-- VIEWS (Postgres 15+ WITH security_invoker = true)
--------------------------------------------------------------------------------

-- View 1: bill_status
-- Calculates paid_amount, unpaid_amount, payment_status, is_overdue
CREATE OR REPLACE VIEW public.bill_status WITH (security_invoker = true) AS
SELECT 
    b.id AS bill_id,
    b.user_id,
    b.party_id,
    b.direction,
    b.bill_number,
    b.bill_date,
    b.due_date,
    b.amount AS bill_amount,
    b.notes,
    b.is_deleted,
    COALESCE(SUM(cbl.amount_applied), 0.00)::numeric(14,2) AS paid_amount,
    (b.amount - COALESCE(SUM(cbl.amount_applied), 0.00))::numeric(14,2) AS unpaid_amount,
    CASE 
        WHEN COALESCE(SUM(cbl.amount_applied), 0.00) = 0 THEN 'unpaid'
        WHEN COALESCE(SUM(cbl.amount_applied), 0.00) >= b.amount THEN 'paid'
        ELSE 'partly_paid'
    END AS payment_status,
    CASE
        WHEN b.due_date IS NOT NULL 
             AND b.due_date < CURRENT_DATE 
             AND (b.amount - COALESCE(SUM(cbl.amount_applied), 0.00)) > 0 
        THEN true
        ELSE false
    END AS is_overdue
FROM public.bills b
LEFT JOIN public.cheque_bill_links cbl ON cbl.bill_id = b.id
LEFT JOIN public.cheques c ON c.id = cbl.cheque_id 
    AND c.is_deleted = false 
    AND c.status NOT IN ('bounced', 'stopped', 'cancelled')
GROUP BY b.id;

-- View 2: party_outstanding
-- Calculates total_receivable (sale bills), total_payable (purchase bills), net_balance
CREATE OR REPLACE VIEW public.party_outstanding WITH (security_invoker = true) AS
SELECT 
    p.id AS party_id,
    p.user_id,
    p.name AS party_name,
    p.party_type,
    p.phone,
    p.is_deleted,
    COALESCE(SUM(CASE WHEN bs.direction = 'sale' THEN bs.unpaid_amount ELSE 0 END), 0.00)::numeric(14,2) AS total_receivable,
    COALESCE(SUM(CASE WHEN bs.direction = 'purchase' THEN bs.unpaid_amount ELSE 0 END), 0.00)::numeric(14,2) AS total_payable,
    (COALESCE(SUM(CASE WHEN bs.direction = 'sale' THEN bs.unpaid_amount ELSE 0 END), 0.00) - 
     COALESCE(SUM(CASE WHEN bs.direction = 'purchase' THEN bs.unpaid_amount ELSE 0 END), 0.00))::numeric(14,2) AS net_balance
FROM public.parties p
LEFT JOIN public.bill_status bs ON bs.party_id = p.id AND bs.is_deleted = false
GROUP BY p.id;

-- View 3: cheque_alerts (PRD Section 9)
CREATE OR REPLACE VIEW public.cheque_alerts WITH (security_invoker = true) AS
-- Alert 1: Post-dated cheque due (received, not yet deposited, deposit date within 7 days or passed)
SELECT 
    c.id AS entity_id,
    c.user_id,
    'post_dated_due' AS alert_type,
    'High' AS severity,
    'Post-dated Cheque Due' AS title,
    'Cheque #' || c.cheque_number || ' (' || coalesce(p.name, 'Party') || ') of ₹' || c.amount || ' is due for deposit on ' || to_char(c.deposit_date, 'DD/MM/YYYY') AS description,
    c.deposit_date AS alert_date,
    c.amount
FROM public.cheques c
JOIN public.parties p ON p.id = c.party_id
WHERE c.is_deleted = false
  AND c.direction = 'received'
  AND c.status = 'received'
  AND c.is_post_dated = true
  AND c.deposit_date IS NOT NULL
  AND c.deposit_date <= (CURRENT_DATE + interval '7 days')

UNION ALL

-- Alert 2: Issued cheque not cleared (issued, status in 'issued' or 'presented')
SELECT 
    c.id AS entity_id,
    c.user_id,
    'issued_uncleared' AS alert_type,
    'Medium' AS severity,
    'Issued Cheque Uncleared' AS title,
    'Cheque #' || c.cheque_number || ' to ' || coalesce(p.name, 'Party') || ' for ₹' || c.amount || ' is uncleared (' || c.status || ')' AS description,
    c.cheque_date AS alert_date,
    c.amount
FROM public.cheques c
JOIN public.parties p ON p.id = c.party_id
WHERE c.is_deleted = false
  AND c.direction = 'issued'
  AND c.status IN ('issued', 'presented')

UNION ALL

-- Alert 3: Bounced cheque
SELECT 
    c.id AS entity_id,
    c.user_id,
    'bounced' AS alert_type,
    'High' AS severity,
    'Bounced Cheque' AS title,
    'Cheque #' || c.cheque_number || ' (' || coalesce(p.name, 'Party') || ') of ₹' || c.amount || ' bounced. Reason: ' || coalesce(c.bounce_reason, 'Not specified') AS description,
    c.cheque_date AS alert_date,
    c.amount
FROM public.cheques c
JOIN public.parties p ON p.id = c.party_id
WHERE c.is_deleted = false
  AND c.status = 'bounced'

UNION ALL

-- Alert 4: Expiring cheque (validity is cheque_date + 3 months, within 10 days or passed)
SELECT 
    c.id AS entity_id,
    c.user_id,
    'expiring_soon' AS alert_type,
    'High' AS severity,
    'Expiring Cheque' AS title,
    'Cheque #' || c.cheque_number || ' (' || coalesce(p.name, 'Party') || ') of ₹' || c.amount || ' expires on ' || to_char((c.cheque_date + interval '3 months')::date, 'DD/MM/YYYY') AS description,
    (c.cheque_date + interval '3 months')::date AS alert_date,
    c.amount
FROM public.cheques c
JOIN public.parties p ON p.id = c.party_id
WHERE c.is_deleted = false
  AND c.status IN ('received', 'issued')
  AND (c.cheque_date + interval '3 months')::date <= (CURRENT_DATE + interval '10 days')

UNION ALL

-- Alert 5: Overdue bill
SELECT 
    b.id AS entity_id,
    b.user_id,
    'overdue_bill' AS alert_type,
    'Medium' AS severity,
    'Overdue Bill' AS title,
    'Bill #' || b.bill_number || ' (' || coalesce(p.name, 'Party') || ') for ₹' || b.unpaid_amount || ' was due on ' || to_char(b.due_date, 'DD/MM/YYYY') AS description,
    b.due_date AS alert_date,
    b.unpaid_amount AS amount
FROM public.bill_status b
JOIN public.parties p ON p.id = b.party_id
WHERE b.is_deleted = false
  AND b.is_overdue = true;

--------------------------------------------------------------------------------
-- TRIGGERS & FUNCTIONS
--------------------------------------------------------------------------------

-- 1. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_bank_accounts_updated_at ON public.bank_accounts;
CREATE TRIGGER trigger_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_parties_updated_at ON public.parties;
CREATE TRIGGER trigger_parties_updated_at BEFORE UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_bills_updated_at ON public.bills;
CREATE TRIGGER trigger_bills_updated_at BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_cheques_updated_at ON public.cheques;
CREATE TRIGGER trigger_cheques_updated_at BEFORE UPDATE ON public.cheques FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. LK-3: Enforce total applied across bills cannot exceed cheque amount
CREATE OR REPLACE FUNCTION public.validate_cheque_link_total()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE
    v_cheque_amount numeric(14,2);
    v_total_applied numeric(14,2);
BEGIN
    SELECT amount INTO v_cheque_amount FROM public.cheques WHERE id = NEW.cheque_id;
    
    SELECT COALESCE(SUM(amount_applied), 0) INTO v_total_applied 
    FROM public.cheque_bill_links 
    WHERE cheque_id = NEW.cheque_id AND id != COALESCE(NEW.id, -1);
    
    IF (v_total_applied + NEW.amount_applied) > v_cheque_amount THEN
        RAISE EXCEPTION 'Total amount applied (₹%) across bills exceeds cheque amount (₹%)', 
            (v_total_applied + NEW.amount_applied), v_cheque_amount;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_cheque_link_total ON public.cheque_bill_links;
CREATE TRIGGER trigger_validate_cheque_link_total 
BEFORE INSERT OR UPDATE ON public.cheque_bill_links 
FOR EACH ROW EXECUTE FUNCTION public.validate_cheque_link_total();

-- 3. Auto-record cheque status change into cheque_status_history
CREATE OR REPLACE FUNCTION public.record_cheque_status_history()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.cheque_status_history (user_id, cheque_id, old_status, new_status, notes)
        VALUES (NEW.user_id, NEW.id, NULL, NEW.status, 'Cheque created');
    ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.cheque_status_history (user_id, cheque_id, old_status, new_status, notes)
        VALUES (NEW.user_id, NEW.id, OLD.status, NEW.status, 
                CASE 
                    WHEN NEW.status = 'bounced' AND NEW.bounce_reason IS NOT NULL THEN 'Bounced: ' || NEW.bounce_reason
                    WHEN NEW.status = 'cleared' AND NEW.cleared_date IS NOT NULL THEN 'Cleared on ' || to_char(NEW.cleared_date, 'DD/MM/YYYY')
                    ELSE 'Status updated'
                END);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_record_cheque_status_history ON public.cheques;
CREATE TRIGGER trigger_record_cheque_status_history
AFTER INSERT OR UPDATE ON public.cheques
FOR EACH ROW EXECUTE FUNCTION public.record_cheque_status_history();

-- 4. BA-4: Ensure only one default bank account per user
CREATE OR REPLACE FUNCTION public.handle_single_default_bank_account()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE public.bank_accounts 
        SET is_default = false 
        WHERE user_id = NEW.user_id AND id != COALESCE(NEW.id, -1);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_single_default_bank_account ON public.bank_accounts;
CREATE TRIGGER trigger_single_default_bank_account
BEFORE INSERT OR UPDATE ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.handle_single_default_bank_account();

-- 5. Audit log trigger for business entities
CREATE OR REPLACE FUNCTION public.record_audit_log()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid;
    v_record_id bigint;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_user_id := OLD.user_id;
        v_record_id := OLD.id;
        INSERT INTO public.audit_log (user_id, table_name, record_id, action, old_data, new_data)
        VALUES (v_user_id, TG_TABLE_NAME, v_record_id, 'DELETE', to_jsonb(OLD), NULL);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        v_user_id := NEW.user_id;
        v_record_id := NEW.id;
        INSERT INTO public.audit_log (user_id, table_name, record_id, action, old_data, new_data)
        VALUES (v_user_id, TG_TABLE_NAME, v_record_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        v_user_id := NEW.user_id;
        v_record_id := NEW.id;
        INSERT INTO public.audit_log (user_id, table_name, record_id, action, old_data, new_data)
        VALUES (v_user_id, TG_TABLE_NAME, v_record_id, 'INSERT', NULL, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_cheques ON public.cheques;
CREATE TRIGGER audit_cheques AFTER INSERT OR UPDATE OR DELETE ON public.cheques FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

DROP TRIGGER IF EXISTS audit_bills ON public.bills;
CREATE TRIGGER audit_bills AFTER INSERT OR UPDATE OR DELETE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

DROP TRIGGER IF EXISTS audit_parties ON public.parties;
CREATE TRIGGER audit_parties AFTER INSERT OR UPDATE OR DELETE ON public.parties FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

DROP TRIGGER IF EXISTS audit_bank_accounts ON public.bank_accounts;
CREATE TRIGGER audit_bank_accounts AFTER INSERT OR UPDATE OR DELETE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.record_audit_log();

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheque_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheque_bill_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheque_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 1. profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- 2. bank_accounts
CREATE POLICY "bank_accounts_select" ON public.bank_accounts FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "bank_accounts_insert" ON public.bank_accounts FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "bank_accounts_update" ON public.bank_accounts FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "bank_accounts_delete" ON public.bank_accounts FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 3. parties
CREATE POLICY "parties_select" ON public.parties FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "parties_insert" ON public.parties FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "parties_update" ON public.parties FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "parties_delete" ON public.parties FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 4. bills
CREATE POLICY "bills_select" ON public.bills FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "bills_insert" ON public.bills FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "bills_update" ON public.bills FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "bills_delete" ON public.bills FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 5. cheques
CREATE POLICY "cheques_select" ON public.cheques FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "cheques_insert" ON public.cheques FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "cheques_update" ON public.cheques FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "cheques_delete" ON public.cheques FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 6. cheque_status_history
CREATE POLICY "cheque_status_history_select" ON public.cheque_status_history FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "cheque_status_history_insert" ON public.cheque_status_history FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- 7. cheque_bill_links
CREATE POLICY "cheque_bill_links_select" ON public.cheque_bill_links FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "cheque_bill_links_insert" ON public.cheque_bill_links FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "cheque_bill_links_update" ON public.cheque_bill_links FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "cheque_bill_links_delete" ON public.cheque_bill_links FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 8. cheque_books
CREATE POLICY "cheque_books_select" ON public.cheque_books FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "cheque_books_insert" ON public.cheque_books FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "cheque_books_update" ON public.cheque_books FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "cheque_books_delete" ON public.cheque_books FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 9. attachments
CREATE POLICY "attachments_select" ON public.attachments FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "attachments_insert" ON public.attachments FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "attachments_update" ON public.attachments FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "attachments_delete" ON public.attachments FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- 10. audit_log (User can only read audit log entries)
CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
