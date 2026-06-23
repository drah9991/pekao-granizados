import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ConfigStoreState {
  loading: boolean;
  storeConfig: Record<string, unknown> | null;
  roles: Record<string, unknown>[];
  rolePermissions: Record<string, unknown>[];
  receiptTemplate: Record<string, unknown> | null;
  sizes: Record<string, unknown>[];
  skuAcronyms: Record<string, unknown>[];
  notificationSettings: Record<string, unknown>[];
  productTypes: Record<string, unknown>[];
  
  fetchConfig: (storeId: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  
  updateStoreConfig: (storeId: string, updates: Record<string, unknown>) => Promise<void>;
  updateReceiptTemplate: (storeId: string, template: Record<string, unknown>) => Promise<void>;
  updateSizes: (sizes: Record<string, unknown>[]) => void;
  updateSkuAcronyms: (acronyms: Record<string, unknown>[]) => void;
  updateNotificationSettings: (settings: Record<string, unknown>[]) => void;
  updateProductTypes: (types: Record<string, unknown>[]) => void;
  setRoles: (roles: Record<string, unknown>[]) => void;
  setRolePermissions: (permissions: Record<string, unknown>[]) => void;
}

export const useConfigStore = create<ConfigStoreState>((set) => ({
  loading: false,
  storeConfig: null,
  roles: [],
  rolePermissions: [],
  receiptTemplate: null,
  sizes: [],
  skuAcronyms: [],
  notificationSettings: [],
  productTypes: [],

  setLoading: (loading) => set({ loading }),

  fetchConfig: async (storeId) => {
    if (!storeId) return;
    set({ loading: true });
    try {
      // Concurrently fetch configurations to optimize performance
      const [
        storeRes,
        rolesRes,
        permsRes,
        receiptRes,
        sizesRes,
        acronymsRes,
        notificationsRes,
        productTypesRes
      ] = await Promise.all([
        supabase.from("stores").select("config").eq("id", storeId).maybeSingle(),
        supabase.from("roles").select("*").order("name", { ascending: true }),
        supabase.from("role_permissions").select("*"),
        supabase.from("receipt_templates").select("*").eq("store_id", storeId).maybeSingle(),
        supabase.from("sizes").select("*").order("created_at", { ascending: true }),
        supabase.from("sku_acronyms").select("*").order("type", { ascending: true }),
        supabase.from("notification_settings").select("*").eq("store_id", storeId),
        supabase.from("product_types_config").select("*").order("created_at", { ascending: true })
      ]);

      if (storeRes.error) console.error("Error fetching stores:", storeRes.error);
      if (rolesRes.error) console.error("Error fetching roles:", rolesRes.error);
      if (permsRes.error) console.error("Error fetching role_permissions:", permsRes.error);
      if (receiptRes.error) console.error("Error fetching receipt_templates:", receiptRes.error);
      if (sizesRes.error) console.error("Error fetching sizes:", sizesRes.error);
      if (acronymsRes.error) console.error("Error fetching sku_acronyms:", acronymsRes.error);
      if (notificationsRes.error) console.error("Error fetching notification_settings:", notificationsRes.error);
      if (productTypesRes.error) console.error("Error fetching product_types_config:", productTypesRes.error);

      set({
        storeConfig: storeRes.data?.config || null,
        roles: rolesRes.data || [],
        rolePermissions: permsRes.data || [],
        receiptTemplate: receiptRes.data || null,
        sizes: sizesRes.data || [],
        skuAcronyms: acronymsRes.data || [],
        notificationSettings: notificationsRes.data || [],
        productTypes: productTypesRes.data || [],
        loading: false
      });
    } catch (err: unknown) {
      console.error("Critical error batch caching config store:", err);
      toast.error("Fallo de sincronización en caché global.");
      set({ loading: false });
    }
  },

  updateStoreConfig: async (storeId, updates) => {
    try {
      const { error } = await supabase
        .from("stores")
        .update({ config: updates })
        .eq("id", storeId);
      if (error) throw error;
      set({ storeConfig: updates });
    } catch (err: unknown) {
      console.error("Error updating store config:", err);
      toast.error("Error al actualizar la configuración de sucursal.");
      throw err;
    }
  },

  updateReceiptTemplate: async (storeId, template) => {
    try {
      const { error } = await supabase
        .from("receipt_templates")
        .upsert({ ...template, store_id: storeId })
        .eq("store_id", storeId);
      if (error) throw error;
      set({ receiptTemplate: template });
    } catch (err: unknown) {
      console.error("Error updating receipt template:", err);
      toast.error("Error al guardar la plantilla de recibo.");
      throw err;
    }
  },

  updateSizes: (sizes) => set({ sizes }),
  updateSkuAcronyms: (acronyms) => set({ skuAcronyms }),
  updateNotificationSettings: (settings) => set({ notificationSettings }),
  updateProductTypes: (types) => set({ productTypes }),
  setRoles: (roles) => set({ roles }),
  setRolePermissions: (rolePermissions) => set({ rolePermissions })
}));
