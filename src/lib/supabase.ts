import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

// Client principal — schema público (auth: profiles, companies, talleres_config)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
        params: { eventsPerSecond: 0 }
    }
});

// Schema unificado de negocio — todas las empresas comparten este schema
// La separación de datos se garantiza por company_id + RLS
export const GARAGE_SCHEMA = 'garage';

// supabaseGarage — Cliente apuntando al schema 'garage'
// Todas las tablas: garage_tickets, garage_customers, garage_parts, etc.
export const supabaseGarage = supabase.schema(GARAGE_SCHEMA);
