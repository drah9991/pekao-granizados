-- 1. Eliminar políticas antiguas
DROP POLICY IF EXISTS "Enable read access for all users in same store" ON public.machine_tanks;
DROP POLICY IF EXISTS "Enable all access for admins and managers" ON public.machine_tanks;

-- 2. Crear nueva política de lectura amplia
CREATE POLICY "Enable read access for all authorized users" 
ON public.machine_tanks FOR SELECT 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'owner') OR
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- 3. Crear nueva política de escritura para roles globales
CREATE POLICY "Enable all access for admins, managers and owners" 
ON public.machine_tanks FOR ALL 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'manager') OR 
  public.has_role(auth.uid(), 'owner')
);

-- 4. Crear política de escritura para directores de tienda (store_manager) sobre su tienda
CREATE POLICY "Enable write access for store managers in their store"
ON public.machine_tanks FOR ALL
USING (
  public.has_role(auth.uid(), 'store_manager') AND
  store_id IN (
    SELECT store_id FROM public.profiles WHERE id = auth.uid()
  )
);
