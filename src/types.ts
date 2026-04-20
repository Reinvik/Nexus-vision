export type TicketStatus =
  | 'Ingreso'
  | 'En espera'
  | 'En Mantención'
  | 'Elevador 1'
  | 'Elevador 2'
  | 'Elevador 3'
  | 'Elevador 4'
  | 'Elevador 5'
  | 'En Reparación'
  | 'Listo para entrega'
  | 'Finalizado'
  | 'Entregado'; // Estado oculto para CRM

export type PaymentMethod = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Múltiple';
export type DocumentType = 'Boleta' | 'Factura';

export interface PricingTier {
  label: string;
  price: number;
}

export interface LubriService {
  id: string;
  title: string;
  description: string;
  details?: string;
  price: string;
  category: string;
  icon: string;
  features?: string[];
  pricingTiers?: PricingTier[];
  footerNote?: string;
  image?: string;
  show_from_price?: boolean;
  inventoryItemId?: string;
}

export interface TicketHistoryEntry {
  status: TicketStatus;
  date: string; // ISO string
  user: string;
}

export interface ServiceLogEntry {
  id?: string;
  date: string; // ISO de cuando se despachó o ingresó
  notes: string;
  parts: string[];
  cost?: number;
  mileage?: number;
  job_photos?: string[];
}

export interface ServiceItem {
  descripcion: string;
  costo: number;
  cantidad?: number; // Quantity, defaults to 1
  part_id?: string; // Optional link to inventory Part
}

export interface Ticket {
  id: string; // ID único (UUID o Patente Histórica)
  patente: string; // Placa del vehículo
  brand?: string;
  model: string;
  year?: number;
  displacement?: string;
  status: TicketStatus;
  mechanic_id: string | null;
  mechanic_ids?: string[]; // Multiple mechanics
  mechanic?: string; // Virtual field from join or local fallback
  entry_date: string; // ISO string
  last_status_change: string; // ISO string
  owner_name: string;
  owner_phone: string;
  notes: string;
  photo_url?: string;
  cost?: number; // Total real final
  quotation_total?: number;
  quotation_accepted?: boolean;
  parts_needed?: string[];
  close_date?: string; // ISO string
  vin?: string;
  engine_id?: string;
  mileage?: number;
  status_history?: TicketHistoryEntry[];
  service_log?: ServiceLogEntry[];
  vehicle_notes?: string;
  job_photos?: string[];
  services?: ServiceItem[];
  spare_parts?: ServiceItem[];
  preventive_dismissed?: boolean;
  dismissed_at?: string;
  created_at?: string;
  payment_method?: PaymentMethod;
  document_type?: DocumentType;
  customer_rating?: number;    // 1–5 estrellas (solo el día de creación)
  customer_feedback?: string;  // Comentario escrito del cliente
  rut_empresa?: string;
  razon_social?: string;
  transfer_data?: string;
  email_empresa?: string;
  is_completed_invoice?: boolean;
  numero_factura?: string;
  ingreso_checklist?: ChecklistIngreso;
  inspeccion?: InspeccionDetalle;
  status_general?: InspectionStatus;
  qa_conducted?: boolean;
  qa_mechanic_id?: string | null;
  qa_observations?: string;
  qa_checklist?: Record<string, boolean>;
  cash_amount?: number;
  card_amount?: number;
  transfer_amount?: number;
}

export interface Mechanic {
  id: string;
  name: string;
  is_manual?: boolean;
}

export interface Part {
  id: string;
  name: string;
  stock: number;
  min_stock: number;
  price: number;
  location?: string;
  type?: string;
  category?: string;
  company_id?: string;
  assigned_to?: string; // Patente (Ticket ID)
  is_manual?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicles: string[]; // Array of Patentes
  last_visit: string; // ISO string
  last_mileage?: number;
  last_vin?: string;
  last_engine_id?: string;
  last_brand?: string;
  last_model?: string;
  last_year?: number;
  last_displacement?: string;
}

export interface VehicleBrand {
  id: string;
  name: string;
}

export interface VehicleModel {
  brand: string;
  model: string;
}

export interface Reminder {
  id: string;
  company_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  brand?: string;
  vehicle_model: string;
  year?: number;
  displacement?: string;
  patente: string;
  reminder_type: string;
  planned_date: string; // ISO string (Date only part)
  planned_time: string; // "HH:mm"
  completed: boolean;
  created_at: string;
}

export interface GarageNotification {
  id: string;
  company_id: string;
  ticket_id: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface DynamicPricingTier {
  id: string;
  name: string;
  price: number;
  inventoryItemId?: string | null;
  description?: string;
}

export interface LandingPageConfig {
  // Hero
  hero_badge?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_cta_text?: string;
  hero_phone?: string;
  hero_image_url?: string;
  hero_stat1_value?: string;
  hero_stat1_label?: string;
  hero_stat2_value?: string;
  hero_stat2_label?: string;
  hero_trust_text?: string;
  hero_search_hint?: string;
  // Services Section
  services_section_tag?: string;
  services_section_title?: string;
  services_section_body?: string;
  // Location Section
  location_tag?: string;
  location_title?: string;
  location_body?: string;
  location_address?: string;
  location_hours_weekday?: string;
  location_hours_saturday?: string;
  location_phone?: string;
  location_maps_url?: string;
  // Footer
  footer_copyright?: string;
  // Brand
  header_logo_url?: string;
  location_image_url?: string;
  gallery_images?: string[];
  // Theme / Colors
  theme_primary_color?: string;
  theme_secondary_color?: string;
  theme_accent_color?: string;
  theme_background_color?: string;
  theme_text_color?: string;
  theme_text_muted_color?: string;
  theme_title_color?: string;
  theme_highlight_color?: string;
  theme_button_text_color?: string;
  agenda_button_bg_color?: string;
  agenda_button_text_color?: string;
  search_button_bg_color?: string;
  search_button_text_color?: string;
  search_button_text?: string;
  // Section Specific Overrides
  hero_title_color?: string;
  hero_text_color?: string;
  hero_subtitle_color?: string;
  hero_cta_text_color?: string;
  hero_badge_color?: string;
  hero_stats_value_color?: string;
  hero_stats_label_color?: string;
  hero_trust_text_color?: string;
  hero_search_hint_color?: string;
  services_tag_color?: string;
  services_title_color?: string;
  services_text_color?: string;
  services_card_title_color?: string;
  services_card_text_color?: string;
  location_tag_color?: string;
  location_title_color?: string;
  location_text_color?: string;
  location_label_color?: string;
  footer_text_color?: string;
  footer_copyright_color?: string;
  header_text_color?: string;
  header_button_bg_color?: string;
  header_button_text_color?: string;
  theme_border_radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  theme_is_dark?: boolean;
  // Social
  social_instagram_url?: string;
  social_facebook_url?: string;
  // Spirit Section (Nosotros)
  spirit_show?: boolean;
  spirit_tag?: string;
  spirit_title?: string;
  spirit_body?: string;
  spirit_image_url?: string;
  spirit_author?: string;
  spirit_role?: string;
}

export interface ServicePricing {
  oil_changes: DynamicPricingTier[];
  brakes: DynamicPricingTier[];
  tune_ups: DynamicPricingTier[];
  [category: string]: DynamicPricingTier[];
}

export interface GarageSettings {
  id: string;
  company_id: string;
  workshop_name: string;
  address: string;
  phone: string;
  whatsapp_template: string;
  logo_url?: string;
  logo_scale?: number;
  logo_x_offset?: number;
  logo_y_offset?: number;
  theme_menu_text?: string;
  theme_menu_highlight?: string;
  theme_button_color?: string;
  theme_sidebar_bg?: string;
  theme_sidebar_active_bg?: string;
  theme_sidebar_text?: string;
  theme_sidebar_active_text?: string;
  theme_main_bg?: string;
  theme_card_bg?: string;
  theme_accent_color?: string;
  theme_header_bg?: string;
  theme_header_text?: string;
  company_slug?: string;
  favicon_url?: string;
  admin_password?: string;
  services_catalog?: LubriService[];
  pricing?: ServicePricing;
  landing_config?: LandingPageConfig;
  agenda_slots?: string[] | { weekdays: string[]; weekends: string[]; saturdays?: string[]; sundays?: string[] };
  agenda_days?: number[];
  // Novos campos para persistência
  email?: string;
  msg_ingreso?: string;
  msg_listo?: string;
  msg_entrega?: string;
  msg_mantenimiento?: string;
  whatsapp_enabled?: boolean;
  days_for_maintenance?: number;
  inspection_required?: boolean;
  kanban_show_waiting?: boolean;
  kanban_elevators?: number;
  cutoff_day?: number;
}

// ─── Sala Ventas (Mostrador / POS) ───────────────────────────────────────────

export interface SalaVentaItem {
  part_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  is_manual?: boolean;
}

export interface SalaVenta {
  id: string;
  company_id: string;
  items: SalaVentaItem[];
  total: number;
  notes?: string;
  payment_method: PaymentMethod;
  document_type: DocumentType;
  sold_at: string; // ISO string
  created_at: string; // ISO string
  rut_empresa?: string;
  razon_social?: string;
  transfer_data?: string;
  email_empresa?: string;
  is_completed_invoice?: boolean;
  numero_factura?: string;
  cash_amount?: number;
  card_amount?: number;
  transfer_amount?: number;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company_id: string;
  is_blocked: boolean;
  created_at?: string;
}

export interface Garantia {
  id: string;
  company_id: string;
  fecha: string; // ISO string
  patente: string;
  brand: string | null;
  model: string | null;
  nombre: string | null;
  telefono: string | null;
  detalle: string | null;
  monto: number;
  comentarios: string | null;
  created_at: string;
}

export type InspectionStatus = 'green' | 'yellow' | 'red' | 'gray';

export interface InspectionItem {
  id: string;
  label: string;
  status: InspectionStatus;
  value: string;
}

export interface InspeccionDetalle {
  status_general: InspectionStatus;
  checklist: InspectionItem[];
  exterior: {
    estado: string;
    fotos: string[];
  };
  objetosValor: {
    detalle: string;
    fotos: string[];
  };
  observaciones: string;
  observacionesUrl?: string; // photo (legacy or general)
  comentarios: string; // legacy or general
}

export const INICIAL_CHECKLIST_ITEMS = [
  { id: 'aceite', label: 'C. ACEITE' },
  { id: 'filtro_aceite', label: 'C.F. ACEITE' },
  { id: 'filtro_aire', label: 'C.F. AIRE' },
  { id: 'filtro_polen', label: 'C.F. POLEN' },
  { id: 'bujias', label: 'C. BUJIAS' },
  { id: 'coolant', label: 'R/C. COOLAN' },
  { id: 'filtro_bencina', label: 'C.F. BENCINA' },
  { id: 'aceite_caja', label: 'C. ACEI. CAJA' },
  { id: 'frenos', label: 'R/C. FRENOS' },
  { id: 'freno_mano', label: 'REG. FRENOMANO' },
  { id: 'discos', label: 'R/C. DISCOS' },
  { id: 'tren_delantero', label: 'R. TRENDELAN' },
  { id: 'amortiguadores', label: 'R. AMORTIG' },
  { id: 'neumaticos', label: 'ROT/C. NEU' },
  { id: 'bateria', label: 'R/C. BATERIA' },
  { id: 'luces', label: 'R. LUCES' },
  { id: 'niveles', label: 'R. NIVELES' },
];

export interface ChecklistItem {
  label: string;
  status: boolean;
}

export interface ChecklistIngreso {
  documentos: { 
    padron: boolean; 
    revisionTecnica: boolean; 
    seguroObligatorio: boolean; 
    permisoCirculacion: boolean 
  };
  luces: { 
    altas: boolean; 
    bajas: boolean; 
    freno: boolean; 
    retroceso: boolean; 
    intermitentes: boolean; 
    patente: boolean; 
    tablero: boolean 
  };
  niveles: { 
    aceiteMotor: boolean; 
    liquidoFrenos: boolean; 
    refrigerante: boolean; 
    liquidoDireccion: boolean; 
    aguaLimpiaParabrisas: boolean 
  };
  accesorios: { 
    radio: boolean; 
    encendedor: boolean; 
    espejos: boolean; 
    plumillas: boolean; 
    tapaBencina: boolean; 
    tapaRueda: boolean; 
    gata: boolean; 
    llaveRueda: boolean; 
    triangulos: boolean; 
    extintor: boolean; 
    botiquin: boolean; 
    chaleco: boolean 
  };
  neumaticos: { 
    delanteroDerecho: boolean; 
    delanteroIzquierdo: boolean; 
    traseroDerecho: boolean; 
    traseroIzquierdo: boolean; 
    repuesto: boolean 
  };
  exterior?: { 
    estado: string; 
    fotos: string[] 
  };
  objetosValor?: { 
    detalle: string; 
    fotos: string[] 
  };
  combustible?: number;
  kilometraje?: number;
  lucesTablero?: string;
  firmaCliente?: string;
  observacionesGenerales?: string;
}

export const INICIAL_INGRESO_CHECKLIST: ChecklistIngreso = {
  documentos: { 
    padron: false, 
    revisionTecnica: false, 
    seguroObligatorio: false, 
    permisoCirculacion: false 
  },
  luces: { 
    altas: false, 
    bajas: false, 
    freno: false, 
    retroceso: false, 
    intermitentes: false, 
    patente: false, 
    tablero: false 
  },
  niveles: { 
    aceiteMotor: false, 
    liquidoFrenos: false, 
    refrigerante: false, 
    liquidoDireccion: false, 
    aguaLimpiaParabrisas: false 
  },
  accesorios: { 
    radio: false, 
    encendedor: false, 
    espejos: false, 
    plumillas: false, 
    tapaBencina: false, 
    tapaRueda: false, 
    gata: false, 
    llaveRueda: false, 
    triangulos: false, 
    extintor: false, 
    botiquin: false, 
    chaleco: false 
  },
  neumaticos: { 
    delanteroDerecho: false, 
    delanteroIzquierdo: false, 
    traseroDerecho: false, 
    traseroIzquierdo: false, 
    repuesto: false 
  },
  exterior: { 
    estado: '', 
    fotos: [] 
  },
  objetosValor: { 
    detalle: '', 
    fotos: [] 
  },
  combustible: 0,
  kilometraje: 0,
  lucesTablero: '',
  observacionesGenerales: '',
  firmaCliente: '',
};
