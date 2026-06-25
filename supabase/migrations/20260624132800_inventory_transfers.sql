-- Create inventory_transfers table
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  destination_store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'shipped', 'completed', 'completed_with_discrepancies')) DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  shipped_at timestamp with time zone,
  received_at timestamp with time zone
);

-- Create inventory_transfer_items table
CREATE TABLE IF NOT EXISTS inventory_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES inventory_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_shipped numeric NOT NULL CHECK (quantity_shipped >= 0),
  quantity_received numeric CHECK (quantity_received >= 0)
);

-- Create transfer_discrepancies table
CREATE TABLE IF NOT EXISTS transfer_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES inventory_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_difference numeric NOT NULL,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_discrepancies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_transfers
CREATE POLICY "Permitir select de traslados relacionados con mi sucursal" ON inventory_transfers
  FOR SELECT
  USING (
    destination_store_id = (SELECT store_id FROM profiles WHERE id = auth.uid()) OR
    source_store_id = (SELECT store_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Permitir insert de traslados a admins/managers" ON inventory_transfers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'manager')
    )
  );

CREATE POLICY "Permitir update de traslados relacionados" ON inventory_transfers
  FOR UPDATE
  USING (
    destination_store_id = (SELECT store_id FROM profiles WHERE id = auth.uid()) OR
    source_store_id = (SELECT store_id FROM profiles WHERE id = auth.uid())
  );

-- RLS Policies for inventory_transfer_items
CREATE POLICY "Permitir select de items de traslados visibles" ON inventory_transfer_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM inventory_transfers
      WHERE id = transfer_id
    )
  );

CREATE POLICY "Permitir insert de items de traslados" ON inventory_transfer_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'manager')
    )
  );

CREATE POLICY "Permitir update de items de traslados destinados" ON inventory_transfer_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM inventory_transfers
      WHERE id = transfer_id AND destination_store_id = (SELECT store_id FROM profiles WHERE id = auth.uid())
    )
  );

-- RLS Policies for transfer_discrepancies
CREATE POLICY "Permitir select de discrepancias a admins/managers" ON transfer_discrepancies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'manager')
    )
  );

CREATE POLICY "Permitir insert de discrepancias en recepcion" ON transfer_discrepancies
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventory_transfers
      WHERE id = transfer_id AND destination_store_id = (SELECT store_id FROM profiles WHERE id = auth.uid())
    )
  );

-- RPC for processing receipt at destination store
CREATE OR REPLACE FUNCTION process_transfer_receipt(
  p_transfer_id UUID,
  p_received_by UUID,
  p_store_id UUID,
  p_items JSONB -- Array of {product_id, qty_received, notes}
) RETURNS BOOLEAN AS $$
DECLARE
  v_transfer_status text;
  v_dest_store_id UUID;
  v_source_store_id UUID;
  item record;
  v_shipped_qty numeric;
  v_received_qty numeric;
  v_notes text;
  v_difference numeric;
  v_has_discrepancies boolean := false;
BEGIN
  -- 1. Lock and check the transfer
  SELECT status, destination_store_id, source_store_id
  INTO v_transfer_status, v_dest_store_id, v_source_store_id
  FROM inventory_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transferencia no encontrada.';
  END IF;

  IF v_transfer_status != 'shipped' THEN
    RAISE EXCEPTION 'La transferencia no se encuentra en estado enviado y no puede ser recibida.';
  END IF;

  IF v_dest_store_id != p_store_id THEN
    RAISE EXCEPTION 'Operación no autorizada: la sucursal de destino no coincide.';
  END IF;

  -- 2. Loop over items and update stock, discrepancies, and movements
  FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, qty_received numeric, notes text) LOOP
    v_received_qty := item.qty_received;
    v_notes := item.notes;

    -- Get shipped quantity
    SELECT quantity_shipped INTO v_shipped_qty
    FROM inventory_transfer_items
    WHERE transfer_id = p_transfer_id AND product_id = item.product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'El producto no pertenece a la transferencia original.';
    END IF;

    -- Update received quantity in items
    UPDATE inventory_transfer_items
    SET quantity_received = v_received_qty
    WHERE transfer_id = p_transfer_id AND product_id = item.product_id;

    -- Update store_stock in destination store
    INSERT INTO store_stock (store_id, product_id, qty, min_qty, updated_at)
    VALUES (p_store_id, item.product_id, v_received_qty, 10, now())
    ON CONFLICT (store_id, product_id)
    DO UPDATE SET qty = COALESCE(store_stock.qty, 0) + v_received_qty, updated_at = now();

    -- Insert movement entry
    INSERT INTO movements (product_id, store_id, qty, type, reason, user_id, created_at)
    VALUES (
      item.product_id,
      p_store_id,
      v_received_qty,
      'entry',
      'Recepcion de Traslado (ID: ' || p_transfer_id || ')',
      p_received_by,
      now()
    );

    -- Calculate difference and record discrepancy if any
    v_difference := v_received_qty - v_shipped_qty;
    IF v_difference != 0 THEN
      v_has_discrepancies := true;
      INSERT INTO transfer_discrepancies (transfer_id, product_id, quantity_difference, reported_by, notes, created_at)
      VALUES (p_transfer_id, item.product_id, v_difference, p_received_by, v_notes, now());
    END IF;
  END LOOP;

  -- 3. Update transfer status
  UPDATE inventory_transfers
  SET status = CASE WHEN v_has_discrepancies THEN 'completed_with_discrepancies' ELSE 'completed' END,
      received_by = p_received_by,
      received_at = now()
  WHERE id = p_transfer_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
