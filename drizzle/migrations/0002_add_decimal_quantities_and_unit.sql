ALTER TABLE public.items ADD COLUMN qty numeric NOT NULL DEFAULT 0;
ALTER TABLE public.items ADD COLUMN target_qty numeric NOT NULL DEFAULT 1;
ALTER TABLE public.items ADD COLUMN unit text NOT NULL DEFAULT 'pcs';
UPDATE public.items SET qty = quantity, target_qty = target_quantity;
COMMENT ON COLUMN public.items.quantity IS 'DEPRECATED: replaced by qty (numeric)';
COMMENT ON COLUMN public.items.target_quantity IS 'DEPRECATED: replaced by target_qty (numeric)';
COMMENT ON COLUMN public.items.unit IS 'Unit of measure: pcs, kg, g, L, ml, pack…';