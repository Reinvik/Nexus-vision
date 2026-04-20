import { useState, useEffect, useCallback } from 'react';
import { Ticket, TicketStatus, Mechanic, Part, Customer, GarageSettings, Reminder, GarageNotification, SalaVenta, SalaVentaItem, PaymentMethod, DocumentType, Garantia, VehicleModel } from '../types';
import { supabase, supabaseGarage } from '../lib/supabase';
import { CAR_MODELS } from '../lib/carData';

export const DEFAULT_AGENDA_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00'
];

export const DEFAULT_AGENDA_DAYS = [1, 2, 3, 4, 5, 6]; // Lun-Sáb


export function useGarageStore(companyId?: string) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notifications, setNotifications] = useState<GarageNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<GarageSettings | null>(null);
  const [salaVentas, setSalaVentas] = useState<SalaVenta[]>([]);
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>(() => {
    const initial: VehicleModel[] = [];
    Object.entries(CAR_MODELS).forEach(([brand, modelList]) => {
      modelList.forEach(model => {
        initial.push({ brand, model });
      });
    });
    return initial;
  });

  const fetchData = useCallback(async (isSilent = false) => {
    if (!companyId) return;
    try {
      if (!isSilent) setLoading(true);

      const fetchAll = async (table: string, orderCol: string = 'created_at', ascending: boolean = false) => {
        let allData: any[] = [];
        let from = 0;
        let hasMore = true;
        const limit = 1000;
        
        // Log auth state before fetching
        const { data: { session } } = await supabase.auth.getSession();
        console.log(`[useGarageStore] fetchAll for ${table}. companyId: ${companyId}. Auth: ${session ? session.user.email : 'anon'}`);

        while (hasMore) {
          let query = supabaseGarage
            .from(table)
            .select('*')
            .eq('company_id', companyId);

          if (table === 'garage_tickets') {
            // Solo tickets activos — sin filtro de fecha para no perder tickets de días anteriores no finalizados
            query = query
              .neq('status', 'Entregado')
              .neq('status', 'Finalizado');
          }

          const { data, error } = await query
            .order(orderCol, { ascending: false })
            .range(from, from + limit - 1);

          if (error) {
            console.error(`[useGarageStore] Error in fetchAll for ${table}:`, error);
            throw error;
          }
          if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += limit;
            if (data.length < limit) hasMore = false;
          } else {
            hasMore = false;
          }
        }
        console.log(`[useGarageStore] fetchAll finished for ${table}. Records:`, allData.length);
        return allData;
      };

      const [
        ticketsData,
        mechanicsData,
        profilesData,
        partsData,
        customersData,
        settingsResponse,
        remindersData,
        notificationsResponse,
        garantiasData,
        vehicleModelsData
      ] = await Promise.all([
        fetchAll('garage_tickets', 'entry_date', false),
        supabaseGarage.from('garage_mechanics').select('*').eq('company_id', companyId).order('name', { ascending: true }).then(r => r.data),
        supabase.from('profiles').select('id, full_name, email').eq('company_id', companyId).then(r => r.data),
        fetchAll('garage_parts', 'name', true),
        fetchAll('garage_customers', 'name', true),
        supabaseGarage.from('garage_settings').select('*').eq('company_id', companyId).maybeSingle(),
        supabaseGarage.from('garage_reminders').select('*').eq('company_id', companyId).order('planned_date', { ascending: true }).then(r => r.data),
        // Fix and trigger new build
        supabaseGarage.from('garage_notifications').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20).then(r => r.data),
        fetchAll('garage_pos_garantias', 'created_at', false),
        supabaseGarage.from('garage_vehicle_models').select('brand, model').order('brand', { ascending: true }).then(r => r.data)
      ]);

      // Combine manual mechanics and platform profiles
      const uniqueMechanicsMap = new Map<string, Mechanic>();
      (mechanicsData || []).forEach(m => uniqueMechanicsMap.set(m.id, { ...m, is_manual: true }));
      (profilesData || []).forEach((p: any) => {
        // Exclude accounts that are not mechanics (admins, superadmins, company account)
        const isExclusionEmail = p.email?.toLowerCase().includes('ariel.mellag') || p.email?.toLowerCase().includes('lubrivespucio');
        const isExclusionName = p.full_name?.toLowerCase().includes('lubrivespucio') || p.full_name?.toLowerCase().includes('ariel mella');
        
        if (!uniqueMechanicsMap.has(p.id) && !isExclusionEmail && !isExclusionName) {
          uniqueMechanicsMap.set(p.id, { id: p.id, name: p.full_name, is_manual: false });
        }
      });
      const combinedMechanics = Array.from(uniqueMechanicsMap.values())
        .filter(m => !m.name.toLowerCase().includes('elevador') && !m.name.toLowerCase().includes('lift'))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Create a map for ALL users to resolve names for display (including admins)
      const allUsersMap = new Map<string, string>();
      (profilesData || []).forEach((p: any) => allUsersMap.set(p.id, p.full_name));
      (mechanicsData || []).forEach(m => {
        if (!allUsersMap.has(m.id)) allUsersMap.set(m.id, m.name);
      });

      // Map mechanic names and customer names to tickets
      const enrichedTickets = (ticketsData || []).map((t: any) => {
        // 1. Resolve Mechanic Name
        const resolveName = (id: string) => {
          if (!id) return null;
          // Exact match
          if (allUsersMap.has(id)) return allUsersMap.get(id);
          // Partial ID match (common with truncated UUIDs)
          for (const [userId, userName] of allUsersMap.entries()) {
            if (userId.toLowerCase().includes(id.toLowerCase()) || id.toLowerCase().includes(userId.toLowerCase())) {
              return userName;
            }
          }
          return null;
        };

        const nameFromMap = resolveName(t.mechanic);
        
        // Resolve names for multi-mechanics
        let mechanicNames = nameFromMap || (t.mechanic && t.mechanic !== 'Sin asignar' ? t.mechanic : null);
        const currentMechanicIds = t.mechanic_ids || (t.mechanic ? [t.mechanic] : []);
        
        if (currentMechanicIds.length > 1) {
          const names = currentMechanicIds
            .map((id: string) => resolveName(id) || id)
            .filter(Boolean);
          if (names.length > 0) {
            mechanicNames = names.join(', ');
          }
        }

        // 2. Resolve Customer Name (Real Name)
        // Try to find the customer in the customersData list to get the "real" name
        let resolvedOwnerName = t.owner_name;
        if (customersData && (customersData as Customer[]).length > 0) {
          const patenteNormalized = t.patente?.replace(/[\s\.\-·]/g, '').toUpperCase();
          const customerMatch = (customersData as Customer[]).find(c => 
            (t.owner_phone && c.phone === t.owner_phone) || 
            (t.owner_name && c.name?.trim().toLowerCase() === t.owner_name.trim().toLowerCase()) ||
            (patenteNormalized && c.vehicles && c.vehicles.some(v => v.replace(/[\s\.\-·]/g, '').toUpperCase() === patenteNormalized))
          );
          if (customerMatch && customerMatch.name) {
            resolvedOwnerName = customerMatch.name;
          }
        }
        
        return {
          ...t,
          mechanic_id: t.mechanic, // Keep raw ID as mechanic_id
          mechanic_ids: currentMechanicIds,
          mechanic: mechanicNames || 'Sin asignar',
          owner_name: resolvedOwnerName || t.owner_name,
          // Initialize QC fields if they are missing/null
          qa_checklist: t.qa_checklist || {},
          qa_observations: t.qa_observations || ''
        };
      });

      setTickets(enrichedTickets as Ticket[]);
      setMechanics(combinedMechanics);
      if (partsData) setParts(partsData as Part[]);
      if (customersData) setCustomers(customersData as Customer[]);
      
      // Enriquecer settings con el slug de la compañía
      const settingsData = settingsResponse?.data;
      if (settingsData) {
        const { data: companyData } = await supabase.from('companies').select('slug').eq('id', settingsData.company_id).single();
        setSettings({ ...settingsData, company_slug: companyData?.slug } as GarageSettings);
      }
      
      if (remindersData) setReminders(remindersData as Reminder[]);
      if (notificationsResponse?.data) setNotifications(notificationsResponse.data as GarageNotification[]);
      if (garantiasData) setGarantias(garantiasData as Garantia[]);
      
      // Combinar modelos locales con remotos (evitar duplicados)
      const remoteModels = (vehicleModelsData || []) as VehicleModel[];
      const combinedModels = [...remoteModels];
      
      Object.entries(CAR_MODELS).forEach(([brand, modelList]) => {
        modelList.forEach(model => {
          if (!remoteModels.some(m => m.brand === brand && m.model === model)) {
            combinedModels.push({ brand, model });
          }
        });
      });
      setVehicleModels(combinedModels);
    } catch (error) {
      console.error('Error fetching garage data:', error);
    } finally {
      console.log('[useGarageStore] fetchData finished for companyId:', companyId);
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
    // Realtime disabled by user request for stability
  }, [fetchData]);

  const ensureVehicleBrandAndModel = useCallback(async (brandName: string, modelName: string) => {
    if (!brandName || !modelName) return;
    
    try {
      // 1. Ensure Brand
      let { data: brand } = await supabase
        .from('vehicle_brands')
        .select('id')
        .ilike('name', brandName.trim())
        .maybeSingle();
      
      if (!brand) {
        const { data: newBrand } = await supabase
          .from('vehicle_brands')
          .insert([{ name: brandName.trim() }])
          .select('id')
          .single();
        brand = newBrand;
      }
      
      if (!brand) return;

      // 2. Ensure Model
      const { data: model } = await supabase
        .from('vehicle_models')
        .select('id')
        .eq('brand_id', brand.id)
        .ilike('name', modelName.trim())
        .maybeSingle();
      
      if (!model) {
        await supabase
          .from('vehicle_models')
          .insert([{ brand_id: brand.id, name: modelName.trim() }]);
      }
    } catch (e) {
      console.error('[useGarageStore] Error in ensureVehicleBrandAndModel:', e);
    }
  }, []);

  const addTicket = useCallback(async (ticket: Partial<Ticket>) => {
    try {
      const patenteClean = (ticket.patente || ticket.id || '')
        .replace(/[\s\.\-·]/g, '')
        .toUpperCase()
        .substring(0, 6);

      if (!patenteClean) {
        throw new Error('La patente es requerida para crear un ticket.');
      }

      // 1. Registrar/Actualizar Cliente automáticamente
      if (ticket.owner_name && ticket.owner_phone) {
        // Normalizar teléfono para la búsqueda
        const normalizedPhone = ticket.owner_phone.replace(/\D/g, '');
        
        // Primero intentamos buscar por teléfono (identificador más fiable)
        let { data: existingCustomer } = await supabaseGarage.from('garage_customers')
          .select('id, vehicles, last_mileage, last_vin, last_engine_id, last_model')
          .eq('company_id', companyId)
          .eq('phone', ticket.owner_phone)
          .maybeSingle();

        // Si no lo encuentra por teléfono exacto, intentamos por nombre (menos fiable, limitamos a 1)
        if (!existingCustomer) {
          const { data: byName } = await supabaseGarage.from('garage_customers')
            .select('id, vehicles, last_mileage, last_vin, last_engine_id, last_model')
            .eq('company_id', companyId)
            .eq('name', ticket.owner_name)
            .limit(1)
            .maybeSingle();
          existingCustomer = byName;
        }

        if (existingCustomer) {
          // Actualizar lista de vehículos y datos de historial si es necesario
          const vehicles = existingCustomer.vehicles || [];
          const updates: any = {
            last_visit: new Date().toISOString(),
            last_mileage: ticket.mileage || existingCustomer.last_mileage,
            last_vin: ticket.vin || existingCustomer.last_vin,
            last_engine_id: ticket.engine_id || existingCustomer.last_engine_id,
            last_brand: ticket.brand || existingCustomer.last_brand,
            last_model: ticket.model || existingCustomer.last_model,
            last_year: ticket.year || existingCustomer.last_year,
            last_displacement: ticket.displacement || existingCustomer.last_displacement
          };

          if (!vehicles.includes(patenteClean)) {
            updates.vehicles = [...vehicles, patenteClean];
          }

          await supabaseGarage.from('garage_customers')
            .update(updates)
            .eq('company_id', companyId)
            .eq('id', existingCustomer.id);
        } else {
          // Crear nuevo cliente con datos iniciales
          await supabaseGarage.from('garage_customers').insert([{
            company_id: companyId,
            name: ticket.owner_name,
            phone: ticket.owner_phone,
            vehicles: [patenteClean],
            last_visit: new Date().toISOString(),
            last_mileage: ticket.mileage,
            last_vin: ticket.vin,
            last_engine_id: ticket.engine_id,
            last_brand: ticket.brand,
            last_model: ticket.model,
            last_year: ticket.year,
            last_displacement: ticket.displacement
          }]);
        }
      }

      // 1b. Ensure Brand and Model in shared list
      if (ticket.brand && ticket.model) {
        await ensureVehicleBrandAndModel(ticket.brand, ticket.model);
      }

      // 2. Comprobar si el vehículo ya tiene un ticket "vivo" (no finalizado ni entregado)
      // Si el auto ya tiene un ticket activo, avisar o manejarlo. Si está cerrado, crear uno nuevo.
      const { data: activeTicket } = await supabaseGarage.from('garage_tickets')
        .select('*')
        .eq('company_id', companyId)
        .eq('patente', patenteClean)
        .not('status', 'in', '("Finalizado","Entregado")')
        .maybeSingle();

      const ticketId = crypto.randomUUID(); 

      const initialHistory = [{
        status: ticket.status || 'Ingreso',
        date: new Date().toISOString(),
        user: 'Sistema / Recepción'
      }];

      if (activeTicket) {
        // Vehículo ya tiene un ticket activo. Opcionalmente podríamos avisar,
        // pero el requerimiento es permitir múltiples tickets.
      }

      // Siempre insertamos un nuevo registro para permitir múltiples tickets por patente
      const { error } = await supabaseGarage.from('garage_tickets').insert([{
        id: ticketId,
        patente: patenteClean,
        company_id: companyId,
        brand: ticket.brand,
        model: ticket.model,
        year: ticket.year,
        displacement: ticket.displacement,
        status: ticket.status || 'Ingreso',
        mechanic: (ticket.mechanic_ids && ticket.mechanic_ids.length > 0) 
          ? ticket.mechanic_ids[0] 
          : (ticket.mechanic_id === 'Sin asignar' ? null : ticket.mechanic_id),
        mechanic_ids: ticket.mechanic_ids || (ticket.mechanic_id && ticket.mechanic_id !== 'Sin asignar' ? [ticket.mechanic_id] : []),
        owner_name: ticket.owner_name,
        owner_phone: ticket.owner_phone,
        notes: ticket.notes,
        parts_needed: ticket.parts_needed || [],
        entry_date: new Date().toISOString(),
        last_status_change: new Date().toISOString(),
        vin: ticket.vin,
        engine_id: ticket.engine_id,
        mileage: ticket.mileage,
        services: ticket.services || [],
        spare_parts: ticket.spare_parts || [],
        cost: ticket.cost || 0,
        status_general: ticket.status_general || 'green',
        inspeccion: ticket.inspeccion || null,
        ingreso_checklist: ticket.ingreso_checklist || null,
        status_history: initialHistory,
        email_empresa: ticket.email_empresa || null,
        is_completed_invoice: ticket.is_completed_invoice || false,
        close_date: (ticket.status === 'Finalizado' || ticket.status === 'Entregado') ? new Date().toISOString() : null
      }]);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error adding ticket:', error);
      throw error;
    }
  }, [companyId, fetchData]);

  const deleteTicket = useCallback(async (id: string) => {
    if (!companyId) return;
    try {
      const { error } = await supabaseGarage
        .from('garage_tickets')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      throw error;
    }
  }, [companyId, fetchData]);

  const updateTicketStatus = useCallback(async (ticketId: string, status: TicketStatus, changedBy: string = 'Recepción/Admin', paymentMethod?: PaymentMethod, documentType?: DocumentType, rutEmpresa?: string, razonSocial?: string, transferData?: string, emailEmpresa?: string, isCompletedInvoice?: boolean, numeroFactura?: string, cashAmount?: number, cardAmount?: number, transferAmount?: number) => {
    const now = new Date().toISOString();
    let originalTicket: Ticket | undefined;

    // 1. Optimistic Update Local
    setTickets(prev => {
      const target = prev.find(t => t.id === ticketId);
      if (target) {
        originalTicket = { ...target };
      }
      return prev.map(t => 
        t.id === ticketId 
          ? { 
              ...t, 
              status, 
              last_status_change: now, 
              status_history: [...(t.status_history || []), { status, date: now, user: changedBy }],
              numero_factura: numeroFactura !== undefined ? numeroFactura : t.numero_factura,
              is_completed_invoice: isCompletedInvoice !== undefined ? isCompletedInvoice : t.is_completed_invoice,
              payment_method: paymentMethod !== undefined ? paymentMethod : t.payment_method,
              document_type: documentType !== undefined ? documentType : t.document_type,
              rut_empresa: rutEmpresa !== undefined ? rutEmpresa : t.rut_empresa,
              razon_social: razonSocial !== undefined ? razonSocial : t.razon_social,
              transfer_data: transferData !== undefined ? transferData : t.transfer_data,
              email_empresa: emailEmpresa !== undefined ? emailEmpresa : t.email_empresa,
              close_date: (status === 'Finalizado' || status === 'Entregado') ? (t.close_date || now) : null, 
              cash_amount: cashAmount !== undefined ? cashAmount : t.cash_amount,
              card_amount: cardAmount !== undefined ? cardAmount : t.card_amount,
              transfer_amount: transferAmount !== undefined ? transferAmount : t.transfer_amount,
            } 
          : t
      );
    });

    try {
      // 2. Build update object selectively to avoid wiping data
      const dbUpdates: any = {
        status,
        last_status_change: now,
        status_history: originalTicket ? [...(originalTicket.status_history || []), { status, date: now, user: changedBy }] : undefined,
        close_date: (status === 'Finalizado' || status === 'Entregado') ? (originalTicket?.close_date || now) : null,
      };

      if (paymentMethod !== undefined) dbUpdates.payment_method = paymentMethod;
      if (documentType !== undefined) dbUpdates.document_type = documentType;
      if (rutEmpresa !== undefined) dbUpdates.rut_empresa = rutEmpresa;
      if (razonSocial !== undefined) dbUpdates.razon_social = razonSocial;
      if (transferData !== undefined) dbUpdates.transfer_data = transferData;
      if (emailEmpresa !== undefined) dbUpdates.email_empresa = emailEmpresa;
      if (isCompletedInvoice !== undefined) dbUpdates.is_completed_invoice = isCompletedInvoice;
      if (numeroFactura !== undefined) dbUpdates.numero_factura = numeroFactura;
      if (cashAmount !== undefined) dbUpdates.cash_amount = cashAmount;
      if (cardAmount !== undefined) dbUpdates.card_amount = cardAmount;
      if (transferAmount !== undefined) dbUpdates.transfer_amount = transferAmount;

      const { error } = await supabaseGarage.from('garage_tickets')
        .update(dbUpdates)
        .eq('id', ticketId)
        .eq('company_id', companyId);

      if (error) throw error;
      
      // 3. Sincronización Silenciosa (fetchData(true) evita el loader global)
      await fetchData(true);
    } catch (error) {
      console.error('Error updating ticket status:', error);
      
      // 4. Rollback visual si falla DB
      if (originalTicket) {
        setTickets(prev => prev.map(t => t.id === ticketId ? originalTicket! : t));
      }
      alert('Error de conexión: No se pudo mover la tarjeta. Se ha revertido el movimiento.');
    }
  }, [fetchData]);

  const addMechanic = useCallback(async (name: string) => {
    try {
      const { error } = await supabaseGarage.from('garage_mechanics').insert([{ 
        name,
        company_id: companyId 
      }]);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error adding mechanic:', error);
      throw error;
    }
  }, [companyId, fetchData]);

  const deleteSalaVenta = useCallback(async (id: string) => {
    try {
      const { error } = await supabaseGarage.from('sala_ventas').delete().eq('id', id).eq('company_id', companyId);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Error deleting sale:', err);
      throw err;
    }
  }, [companyId, fetchData]);


  const deleteMechanic = useCallback(async (id: string) => {
    try {
      const { error } = await supabaseGarage.from('garage_mechanics')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting mechanic:', error);
      throw error;
    }
  }, [companyId, fetchData]);

  const addPart = useCallback(async (part: Partial<Part>) => {
    try {
      if (!companyId) throw new Error('Company ID is required to add parts');
      
      // Omit id if it's null, undefined or empty to allow Supabase to generate a UUID
      const partData: any = {
        company_id: companyId,
        name: part.name,
        stock: part.stock || 0,
        min_stock: part.min_stock || 0,
        price: part.price || 0,
        location: part.location || null,
        type: part.type || 'product'
      };

      if (part.id) {
        partData.id = part.id;
      }

      const { error } = await supabaseGarage.from('garage_parts').insert([partData]);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error adding part:', error);
      throw error;
    }
  }, [companyId, fetchData]);

  const addCustomer = useCallback(async (customer: Partial<Customer>) => {
    try {
      const { error } = await supabaseGarage.from('garage_customers').insert([{
        company_id: companyId,
        name: customer.name,
        phone: customer.phone,
        email: customer.email || null,
        vehicles: customer.vehicles || []
      }]);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  }, [companyId, fetchData]);

  const updateCustomer = useCallback(async (customerId: string, updates: Partial<Customer>) => {
    try {
      const { error } = await supabaseGarage.from('garage_customers')
        .update({
          name: updates.name,
          phone: updates.phone,
          email: updates.email
        })
        .eq('id', customerId)
        .eq('company_id', companyId);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }, [fetchData]);

  const deleteCustomer = useCallback(async (id: string) => {
    try {
      const { error } = await supabaseGarage.from('garage_customers')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }, [fetchData]);

  const updateSettings = useCallback(async (updates: Partial<GarageSettings>) => {
    try {
      console.log('[updateSettings] Starting update with payload:', updates);
      
      // Separamos campos que no van a la tabla garage_settings
      const { 
        company_slug, 
        id: _, 
        company_id: __, 
        branding,       // EXCLUIR: es un objeto calculado en el state
        ...settingsUpdates 
      } = updates as any;

      if (settings?.id) {
        console.log('[updateSettings] Updating existing settings ID:', settings.id);
        const { error } = await supabaseGarage.from('garage_settings')
          .update(settingsUpdates)
          .eq('id', settings.id);
        
        if (error) {
          console.error('[updateSettings] Supabase Update Error Details:', JSON.stringify(error, null, 2));
          console.error('[updateSettings] Supabase Update Error Message:', error.message);
          throw error;
        }
        console.log('[updateSettings] Update SUCCESS');

        // Si se cambió el slug, actualizar la tabla companies
        if (company_slug && settings.company_id) {
          console.log('[updateSettings] Updating company slug to:', company_slug);
          const { error: slugError } = await supabase
            .from('companies')
            .update({ slug: company_slug })
            .eq('id', settings.company_id);
          if (slugError) {
            console.error('[updateSettings] Slug Update Error:', slugError);
            throw slugError;
          }
        }
      } else if (companyId) {
        console.log('[updateSettings] No settings found, inserting for companyId:', companyId);
        const { error } = await supabaseGarage.from('garage_settings').insert([{
           ...settingsUpdates,
           company_id: companyId
        }]);
        if (error) {
          console.error('[updateSettings] Supabase Insert Error:', error);
          throw error;
        }
        console.log('[updateSettings] Insert SUCCESS');
      } else {
        // Fallback for companies created before the trigger
        console.log('[updateSettings] Fallback: Searching profile for company_id');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');
        
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', session.user.id).single();
        if (!profile?.company_id) throw new Error('Usuario sin empresa asginada');

        console.log('[updateSettings] Inserting new settings for company:', profile.company_id);
        const { error } = await supabaseGarage.from('garage_settings').insert([{
           ...settingsUpdates,
           company_id: profile.company_id
        }]);
        if (error) {
          console.error('[updateSettings] Supabase Insert Error (fallback):', error);
          throw error;
        }
      }
      console.log('[updateSettings] Refreshing data...');
      console.log('[updateSettings] Success, refreshing data...');
      await fetchData();
      return { data: settingsUpdates, error: null };
    } catch (error: any) {
      console.error('[updateSettings] CRITICAL ERROR:', error);
      return { data: null, error: error.message || 'Error desconocido al actualizar configuración' };
    }
  }, [settings, companyId, fetchData]);

  const deletePart = useCallback(async (id: string) => {
    try {
      const { error } = await supabaseGarage.from('garage_parts')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting part:', error);
      throw error;
    }
  }, [fetchData]);

  const updatePart = useCallback(async (partId: string, updates: Partial<Part>) => {
    try {
      if (!companyId) throw new Error('Company ID is required to update parts');
      if (!partId) throw new Error('Part ID is required to update parts');

      // Si el ID cambió, Supabase no permite actualizar la PK directamente de forma sencilla si hay FKs
      if (updates.id && updates.id !== partId) {
        // 1. Obtener datos actuales
        const { data: currentPart } = await supabaseGarage.from('garage_parts').select('*').eq('id', partId).single();
        if (!currentPart) throw new Error('Repuesto no encontrado');

        // 2. Insertar nuevo con el nuevo ID
        const { error: insError } = await supabaseGarage.from('garage_parts').insert([{
           ...currentPart,
           ...updates,
           id: updates.id
        }]);
        if (insError) throw insError;

        // 3. Eliminar el viejo
        const { error: delError } = await supabaseGarage.from('garage_parts')
          .delete()
          .eq('id', partId)
          .eq('company_id', companyId);
        if (delError) {
            console.error('Error deleting old part after ID change:', delError);
        }
      } else {
        // Omit id from updates if it's the same or null
        const { id, ...cleanUpdates } = updates;
        
        const { error } = await supabaseGarage.from('garage_parts')
          .update(cleanUpdates)
          .eq('id', partId)
          .eq('company_id', companyId);
        if (error) throw error;
      }
      await fetchData();
    } catch (error) {
      console.error('Error updating part:', error);
      throw error;
    }
  }, [companyId, fetchData]);

  const updateTicket = useCallback(async (ticketId: string, updates: Partial<Ticket>) => {
    try {
      const dbUpdates: any = {};
      const targetTicket = tickets.find(t => t.id === ticketId);
      
      // Solo actualizar last_status_change si el status realmente cambió
      if (updates.status !== undefined && updates.status !== targetTicket?.status) {
        const now = new Date().toISOString();
        dbUpdates.last_status_change = updates.last_status_change || now;
        dbUpdates.status_history = [...(targetTicket?.status_history || []), { 
          status: updates.status, 
          date: now, 
          user: 'Admin/Recepción' 
        }];
      }

      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.model !== undefined) dbUpdates.model = updates.model;
      if (updates.owner_name !== undefined) dbUpdates.owner_name = updates.owner_name;
      if (updates.owner_phone !== undefined) dbUpdates.owner_phone = updates.owner_phone;
      if (updates.close_date !== undefined) dbUpdates.close_date = updates.close_date;
      if (updates.quotation_total !== undefined) dbUpdates.quotation_total = updates.quotation_total;
      if (updates.quotation_accepted !== undefined) dbUpdates.quotation_accepted = updates.quotation_accepted;
      if (updates.vin !== undefined) dbUpdates.vin = updates.vin;
      if (updates.engine_id !== undefined) dbUpdates.engine_id = updates.engine_id;
      if (updates.mileage !== undefined) dbUpdates.mileage = updates.mileage;
      if (updates.job_photos !== undefined) dbUpdates.job_photos = updates.job_photos;
      if (updates.services !== undefined) dbUpdates.services = updates.services;
      if (updates.spare_parts !== undefined) dbUpdates.spare_parts = updates.spare_parts;
      if (updates.cost !== undefined) dbUpdates.cost = updates.cost;
      if (updates.payment_method !== undefined) dbUpdates.payment_method = updates.payment_method;
      if (updates.document_type !== undefined) dbUpdates.document_type = updates.document_type;
      if (updates.rut_empresa !== undefined) dbUpdates.rut_empresa = updates.rut_empresa;
      if (updates.razon_social !== undefined) dbUpdates.razon_social = updates.razon_social;
      if (updates.transfer_data !== undefined) dbUpdates.transfer_data = updates.transfer_data;
      if (updates.status_general !== undefined) dbUpdates.status_general = updates.status_general;
      if (updates.inspeccion !== undefined) dbUpdates.inspeccion = updates.inspeccion;
      if (updates.ingreso_checklist !== undefined) dbUpdates.ingreso_checklist = updates.ingreso_checklist;
      if (updates.vehicle_notes !== undefined) dbUpdates.vehicle_notes = updates.vehicle_notes;
      if (updates.email_empresa !== undefined) dbUpdates.email_empresa = updates.email_empresa;
      if (updates.is_completed_invoice !== undefined) dbUpdates.is_completed_invoice = updates.is_completed_invoice;
      if (updates.numero_factura !== undefined) dbUpdates.numero_factura = updates.numero_factura;
      if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
      if (updates.year !== undefined) dbUpdates.year = updates.year;
      if (updates.displacement !== undefined) dbUpdates.displacement = updates.displacement;
      if (updates.qa_conducted !== undefined) dbUpdates.qa_conducted = updates.qa_conducted;
      if (updates.qa_mechanic_id !== undefined) dbUpdates.qa_mechanic_id = updates.qa_mechanic_id === 'Sin asignar' ? null : updates.qa_mechanic_id;
      if (updates.qa_observations !== undefined) dbUpdates.qa_observations = updates.qa_observations;
      if (updates.qa_checklist !== undefined) dbUpdates.qa_checklist = updates.qa_checklist;
      if (updates.cash_amount !== undefined) dbUpdates.cash_amount = updates.cash_amount;
      if (updates.card_amount !== undefined) dbUpdates.card_amount = updates.card_amount;
      if (updates.transfer_amount !== undefined) dbUpdates.transfer_amount = updates.transfer_amount;

      if (updates.mechanic_id !== undefined) {
        dbUpdates.mechanic = updates.mechanic_id === 'Sin asignar' ? null : updates.mechanic_id;
        // Si se actualiza el ID simple, también actualizamos el array para consistencia
        dbUpdates.mechanic_ids = updates.mechanic_id === 'Sin asignar' ? [] : [updates.mechanic_id];
      }

      if (updates.mechanic_ids !== undefined) {
        dbUpdates.mechanic_ids = updates.mechanic_ids;
        // Sincronizar campo legacy con el primer mecánico del array
        dbUpdates.mechanic = updates.mechanic_ids.length > 0 ? updates.mechanic_ids[0] : null;
      }

      const { error } = await supabaseGarage.from('garage_tickets')
        .update(dbUpdates)
        .eq('id', ticketId)
        .eq('company_id', companyId);

      if (error) throw error;

      // 3. Sincronizar datos actualizados del ticket con el cliente
      if (dbUpdates.owner_name && dbUpdates.owner_phone) {
        const { data: customer } = await supabaseGarage.from('garage_customers')
          .select('id')
          .eq('company_id', companyId)
          .or(`phone.eq.${dbUpdates.owner_phone},name.eq.${dbUpdates.owner_name}`)
          .maybeSingle();
        
        if (customer) {
          await supabaseGarage.from('garage_customers')
            .update({
              last_mileage: dbUpdates.mileage,
              last_vin: dbUpdates.vin,
              last_engine_id: dbUpdates.engine_id,
              last_brand: updates.brand !== undefined ? updates.brand : targetTicket?.brand,
              last_model: dbUpdates.model,
              last_year: updates.year !== undefined ? updates.year : targetTicket?.year,
              last_displacement: updates.displacement !== undefined ? updates.displacement : targetTicket?.displacement,
              last_visit: new Date().toISOString()
            })
            .eq('id', customer.id)
            .eq('company_id', companyId);
        }
      }

      await fetchData();
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  }, [fetchData]);

  const searchTicket = useCallback(async (patente: string): Promise<Ticket | null> => {
    const normalizedInput = patente.replace(/[\s\.\-·]/g, '').toUpperCase();
    
    // 1. Buscar en estado local
    const local = tickets.find(t => {
      const normalizedTicketId = t.id.replace(/[\s\.\-·]/g, '').toUpperCase();
      const normalizedPatente = (t.patente || '').replace(/[\s\.\-·]/g, '').toUpperCase();
      return normalizedTicketId === normalizedInput || normalizedPatente === normalizedInput;
    });

    if (local) return local;

    // 2. Fallback: Buscar en base de datos (para históricos fuera del límite de 5000)
    if (!companyId) return null;
    try {
      const { data, error } = await supabaseGarage
        .from('garage_tickets')
        .select('*')
        .eq('company_id', companyId)
        .or(`id.eq.${normalizedInput},patente.eq.${normalizedInput}`)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;

      // Enriquecer con mecánico si es necesario
      const mechanic = mechanics.find(m => m.id === data.mechanic || m.name.toUpperCase() === (data.mechanic || '').toUpperCase());
      return {
        ...data,
        mechanic_id: mechanic ? mechanic.id : data.mechanic,
        mechanic: mechanic ? mechanic.name : (data.mechanic || 'Sin asignar')
      } as Ticket;
    } catch (e) {
      console.error('Error in deep searchTicket:', e);
      return null;
    }
  }, [companyId, tickets, mechanics]);

  const getModelsByBrand = useCallback(async (brandId: string) => {
    try {
      const { data } = await supabase
        .from('vehicle_models')
        .select('*')
        .eq('brand_id', brandId)
        .order('name', { ascending: true });
      return data as VehicleModel[];
    } catch (e) {
      console.error('[useGarageStore] Error in getModelsByBrand:', e);
      return [];
    }
  }, []);

  const addReminder = useCallback(async (reminder: Partial<Reminder>) => {
    try {
      // Collision prevention
      const nextDay = new Date(reminder.planned_date!);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];

      const { data: existing } = await supabaseGarage
        .from('garage_reminders')
        .select('id')
        .eq('company_id', reminder.company_id)
        .gte('planned_date', reminder.planned_date)
        .lt('planned_date', nextDayStr)
        .ilike('planned_time', `${reminder.planned_time}%`)
        .maybeSingle();

      if (existing) {
        throw new Error('Ese horario ya está ocupado.');
      }

      const { error } = await supabaseGarage.from('garage_reminders').insert([{
        ...reminder,
        company_id: companyId
      }]);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error adding reminder:', error);
      throw error;
    }
  }, [companyId, fetchData]);

  const updateReminder = useCallback(async (id: string, updates: Partial<Reminder>) => {
    try {
      const { error } = await supabaseGarage.from('garage_reminders')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  }, [fetchData]);

  const deleteReminder = useCallback(async (id: string) => {
    try {
      const { error } = await supabaseGarage.from('garage_reminders')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
  }, [fetchData]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    try {
      const { error } = await supabaseGarage.from('garage_notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [fetchData]);

  const uploadTicketPhoto = useCallback(async (patente: string, file: File): Promise<string> => {
    try {
      // 1. Optimización del lado del cliente (Compresión)
      const compressedBlob = await new Promise<Blob>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          const img = new Image();
          img.src = e.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
              height = (MAX_WIDTH / width) * height;
              width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Error al comprimir imagen'));
            }, 'image/jpeg', 0.8); // Calidad 0.8 para balance óptimo
          };
        };
        reader.onerror = reject;
      });

      const fileExt = 'jpg'; // Forzamos jpg por la compresión
      const fileName = `${patente}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('ticket-photos')
        .upload(filePath, compressedBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error('Storage upload error details:', uploadError);
        throw uploadError;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('ticket-photos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error in uploadTicketPhoto:', error);
      throw error;
    }
  }, []);

  const updateVehicle = useCallback(async (patente: string, updates: { ownerName?: string; ownerPhone?: string; model?: string }) => {
    try {
      // No buscamos por id === patente, sino que operamos sobre la patente directamente en la tabla
      const dbUpdates: any = {};
      if (updates.ownerName !== undefined) dbUpdates.owner_name = updates.ownerName;
      if (updates.ownerPhone !== undefined) dbUpdates.owner_phone = updates.ownerPhone;
      if (updates.model !== undefined) dbUpdates.model = updates.model;

      // Actualizar todos los tickets de esta patente para mantener consistencia de dueño/modelo
      const { error: tErr } = await supabaseGarage.from('garage_tickets')
        .update(dbUpdates)
        .eq('patente', patente)
        .eq('company_id', companyId);

      if (tErr) throw tErr;

      // También actualizar en la tabla de clientes si existe
      if (dbUpdates.owner_name && dbUpdates.owner_phone) {
        const { data: customer } = await supabaseGarage.from('garage_customers')
          .select('id')
          .or(`phone.eq.${dbUpdates.owner_phone},name.eq.${dbUpdates.owner_name}`)
          .maybeSingle();
        
        if (customer) {
          await supabaseGarage.from('garage_customers')
            .update({
              last_model: dbUpdates.model,
              last_visit: new Date().toISOString()
            })
            .eq('id', customer.id)
            .eq('company_id', companyId);
        }
      }

      await fetchData();
    } catch (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }
  }, [companyId, tickets, fetchData]);

  const deleteVehicle = useCallback(async (patente: string) => {
    try {
      // Eliminar todos los tickets asociados a esta patente para esta empresa
      const { error } = await supabaseGarage.from('garage_tickets')
        .delete()
        .eq('patente', patente)
        .eq('company_id', companyId);
      
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      throw error;
    }
  }, [companyId, fetchData]);

  const acceptQuotation = useCallback(async (ticketId: string) => {
    try {
      const now = new Date().toISOString();
      const statusEntry = { status: 'En Mantención' as TicketStatus, date: now, user: 'Cliente (Portal)' };
      
      // 1. Obtener el historial actual de la base de datos para evitar pisar datos previos
      // Especialmente importante en el portal público donde el array 'tickets' local puede estar vacío.
      const { data: currentTicket, error: fetchError } = await supabaseGarage
        .from('garage_tickets')
        .select('status_history, company_id')
        .eq('id', ticketId)
        .single();
      
      if (fetchError) throw fetchError;

      const statusHistory = [...(currentTicket.status_history || []), statusEntry];
      const targetCompanyId = currentTicket.company_id;

      // 2. Ejecutar el update
      let query = supabaseGarage.from('garage_tickets')
        .update({ 
            quotation_accepted: true,
            status: 'En Mantención',
            last_status_change: now,
            status_history: statusHistory
        })
        .eq('id', ticketId);
      
      // Solo aplicar filtro de company_id si lo tenemos para mayor seguridad en RLS
      if (targetCompanyId) {
        query = query.eq('company_id', targetCompanyId);
      }

      const { error } = await query;
      if (error) throw error;
      
      // 3. Actualizar localmente si tenemos el ticket en la lista del store
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { 
          ...t, 
          quotation_accepted: true, 
          status: 'En Mantención',
          last_status_change: now,
          status_history: statusHistory
        } : t
      ));

      // 4. Refrescar datos globales
      await fetchData();
    } catch (error) {
      console.error('Error accepting quotation:', error);
      throw error;
    }
  }, [fetchData]);

  const searchTicketsHistory = useCallback(async (patenteOrPhone: string, targetCompanyId?: string): Promise<Ticket[]> => {
    try {
      const cleanInput = patenteOrPhone.replace(/[\s\.\-·]/g, '').toUpperCase();
      const effectiveCompanyId = targetCompanyId || companyId;
      
      let query = supabaseGarage
        .from('garage_tickets')
        .select('*')
        .or(`id.ilike.%${cleanInput}%,patente.ilike.%${cleanInput}%,owner_phone.ilike.%${cleanInput}%`)
        .order('entry_date', { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq('company_id', effectiveCompanyId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as Ticket[];
    } catch (error) {
      console.error('Error searching tickets history:', error);
      return [];
    }
  }, [companyId]);

  const fetchCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
  }, []);

  const addIntelligentReminder = useCallback(async (reminder: any) => {
    const timestamp = new Date().toISOString();
    const requestId = Math.random().toString(36).substring(7);

    // 0. Strict check if slot is already taken (Collision prevention)
    // Normalizamos la fecha a YYYY-MM-DD para la búsqueda
    const dateOnly = reminder.planned_date.includes('T') ? reminder.planned_date.split('T')[0] : reminder.planned_date;
    
    const nextDay = new Date(dateOnly);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];

    const effectiveCompanyId = reminder.company_id || companyId;
    
    console.log(`[${timestamp}] [Req:${requestId}] Starting addIntelligentReminder`, {
        effectiveCompanyId,
        reminder_company_id: reminder.company_id,
        store_company_id: companyId,
        date: dateOnly,
        time: reminder.planned_time
    });

    if (!effectiveCompanyId) {
      console.error(`[${timestamp}] [Req:${requestId}] Error: MISSING_COMPANY_ID`);
      throw new Error('MISSING_COMPANY_ID');
    }

    const { data: existing } = await supabaseGarage
      .from('garage_reminders')
      .select('id')
      .eq('company_id', effectiveCompanyId)
      .gte('planned_date', dateOnly)
      .lt('planned_date', nextDayStr)
      .ilike('planned_time', `${reminder.planned_time}%`)
      .maybeSingle();

    if (existing) {
      console.warn(`[${timestamp}] [Req:${requestId}] Slot already taken`);
      throw new Error('Ese horario ya fue reservado recientemente por otro usuario. Por favor intenta con otro bloque.');
    }

    // 1. Create the reminder
    console.log(`[${timestamp}] [Req:${requestId}] Step 1: Inserting garage_reminders`);
    
    // Extraer campos que NO pertenecen a la tabla garage_reminders (como 'status')
    const { status: _s, ...cleanReminderData } = reminder;

    const { data: newReminder, error } = await supabaseGarage
      .from('garage_reminders')
      .insert([{
          ...cleanReminderData,
          company_id: effectiveCompanyId,
          planned_date: dateOnly // Guardamos solo la fecha para consistencia
      }])
      .select()
      .single();
      
    if (error) {
      console.error(`[${timestamp}] [Req:${requestId}] Supabase error adding public reminder:`, error);
      throw error;
    }

    // 2. Create a notification for the garage
    try {
      console.log(`[${timestamp}] [Req:${requestId}] Step 2: Inserting garage_notifications for company ${effectiveCompanyId}`);
      await supabaseGarage.from('garage_notifications').insert([{
        company_id: effectiveCompanyId, // Using effectiveCompanyId
        title: 'Nueva Reserva Web',
        message: `El cliente ${reminder.customer_name} ha reservado para el ${reminder.planned_date} a las ${reminder.planned_time} (Vehículo: ${reminder.patente})${reminder.customer_email ? ` - Email: ${reminder.customer_email}` : ''}`,
        type: 'booking',
        read: false
      }]);
    } catch (notifyError) {
      console.error(`[${timestamp}] [Req:${requestId}] Error creating notification:`, notifyError);
    }

    // 3. Proactively refresh data if we are in the admin context
    if (companyId) {
      await fetchData();
    }

    // 4. Automatic Ticket Creation removed to keep bookings in Agenda only
    console.log(`[${timestamp}] [Req:${requestId}] Success! Booking created (auto-ticket disabled by user request).`);


    return newReminder;
  }, [companyId, fetchData]);

  const fetchActiveReminder = useCallback(async (identifier: string, targetCompanyId?: string): Promise<Reminder | null> => {
    try {
        const cleanInput = identifier.replace(/[\s\.\-·]/g, '').toUpperCase();
        const effectiveCompanyId = targetCompanyId || companyId;
        
        let query = supabaseGarage
            .from('garage_reminders')
            .select('*')
            .or(`patente.eq.${cleanInput},customer_phone.eq.${cleanInput}`)
            .gte('planned_date', new Date().toISOString().split('T')[0])
            .order('planned_date', { ascending: true })
            .limit(1);

        if (effectiveCompanyId) {
            query = query.eq('company_id', effectiveCompanyId);
        }

        const { data, error } = await query.maybeSingle();
        
        if (error) throw error;
        return data as Reminder;
    } catch (e) {
        return null;
    }
  }, []);

  const fetchPublicSettingsBySlug = useCallback(async (slug: string) => {
    // 1. Encontrar la empresa por slug
    const { data: company, error: cError } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    
    if (cError) throw cError;
    if (!company) {
        return null;
    }

    // 2. Obtener los settings de esa empresa
    const { data: settings, error: sError } = await supabaseGarage
      .from('garage_settings')
      .select('*')
      .eq('company_id', company.id)
      .maybeSingle();
    
    if (sError) throw sError;
    return settings;
  }, []);

  const fetchOccupiedReminders = useCallback(async (companyId: string, date: string) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];

    const { data, error } = await supabaseGarage
      .from('garage_reminders')
      .select('planned_time')
      .eq('company_id', companyId)
      .gte('planned_date', date)
      .lt('planned_date', nextDayStr);
    
    if (error) throw error;
    // Normalizamos a HH:mm ya que Postgres puede devolver HH:mm:ss
    return (data || []).map(r => r.planned_time?.substring(0, 5));
  }, []);

  const fetchPublicVehicleInfo = useCallback(async (company_id: string, identificador: string) => {
    let customerData: any = null;
    let ticketData: any = null;

    // Normalizar input (remover espacios y guiones para patentes)
    const normalizedInput = identificador.trim().replace(/[-\s\.\-·]/g, '').toUpperCase();
    const numericInput = identificador.replace(/\D/g, '');

    // 1. Buscar en garage_tickets (historial de trabajos) para obtener datos rápidos del vehículo
    try {
      const { data: ticket } = await supabaseGarage
        .from('garage_tickets')
        .select('*')
        .eq('company_id', company_id)
        .or(`id.eq.${normalizedInput},patente.eq.${normalizedInput}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ticket) ticketData = ticket;
    } catch (e) {}

    // 2. Buscar en garage_customers (base de datos de clientes)
    // Nota: 'last_vehicle_id' no existe en la tabla, usamos 'vehicles'
    try {
      // Usamos filter con el operador 'cs' (contains) y JSON.stringify para asegurar compatibilidad con JSONB
      const { data: customers } = await supabaseGarage
        .from('garage_customers')
        .select('name, phone, last_model, vehicles')
        .eq('company_id', company_id)
        .filter('vehicles', 'cs', JSON.stringify([normalizedInput]));
      
      if (customers && customers.length > 0) {
        customerData = customers[0];
      }
    } catch (e) {
      console.error('[fetchPublicVehicleInfo] Error in customer search:', e);
    }

    // 3. Fallback: Intentar buscar por teléfono si el input es numérico
    if (!customerData && !ticketData) {
      // Chile: números móviles son de 9 dígitos, fijos de 8 o 9. Buscamos al menos 8.
      if (numericInput.length >= 8) {
          try {
              // Buscamos todos los que coincidan con el patrón, para evitar error de maybeSingle
              const { data: multipleByPhone } = await supabaseGarage
                  .from('garage_customers')
                  .select('name, phone, last_model, vehicles')
                  .eq('company_id', company_id)
                  .ilike('phone', `%${numericInput}%`);
              
              if (multipleByPhone && multipleByPhone.length > 0) {
                  // Priorizamos el que tenga vehículos asociados si hay varios
                  customerData = multipleByPhone.find(c => Array.isArray(c.vehicles) && c.vehicles.length > 0) || multipleByPhone[0];
              }
          } catch (e) {}
      }
    }

    if (!customerData && !ticketData) return null;

    // Determinamos el vehicle_id (patente)
    // Si vino de customerData, usamos el primero de su lista de vehículos
    const customerPlate = (Array.isArray(customerData?.vehicles) && customerData.vehicles.length > 0) 
      ? customerData.vehicles[0] 
      : null;

    return {
      owner_name: customerData?.name || ticketData?.owner_name || '',
      owner_phone: customerData?.phone || ticketData?.owner_phone || '',
      model: customerData?.last_model || ticketData?.model || '',
      vehicle_id: customerPlate || ticketData?.patente || ticketData?.id || (numericInput.length >= 8 ? '' : normalizedInput)
    };
  }, []);

  const clearFinishedTickets = useCallback(async () => {
    try {
      const { error } = await supabaseGarage.from('garage_tickets')
        .update({ status: 'Entregado', close_date: new Date().toISOString() })
        .eq('company_id', companyId)
        .eq('status', 'Finalizado');
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error clearing finished tickets:', error);
      throw error;
    }
  }, [fetchData]);

  const dismissPreventive = useCallback(async (ticketId: string) => {
    if (!companyId) return;
    try {
      const { error } = await supabaseGarage.from('garage_tickets')
        .update({ 
            preventive_dismissed: true, 
            dismissed_at: new Date().toISOString() 
        })
        .eq('id', ticketId)
        .eq('company_id', companyId);
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error dismissing preventive:', error);
      throw error;
    }
  }, [fetchData]);

  const fetchSalaVentas = useCallback(async (days: number = 30) => {
    if (!companyId) {
      console.warn('fetchSalaVentas: No companyId found');
      return [];
    }
    try {
      let query = supabaseGarage
        .from('garage_sala_ventas')
        .select('*')
        .eq('company_id', companyId)
        .order('sold_at', { ascending: false });

      if (days > 0) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        query = query.gte('sold_at', since.toISOString());
      }
      
      const { data, error } = await query;

      if (error) throw error;
      
      const result = (data || []) as SalaVenta[];
      setSalaVentas(result);
      return result;
    } catch (error) {
      console.error('Error fetching sala ventas:', error);
      return [];
    }
  }, [companyId]);

  const addSalaVenta = useCallback(async (items: SalaVentaItem[], paymentMethod: PaymentMethod, documentType: DocumentType, rutEmpresa?: string, razonSocial?: string, notes?: string, transferData?: string, emailEmpresa?: string, isCompletedInvoice?: boolean, soldAt?: string, numeroFactura?: string, cashAmount?: number, cardAmount?: number, transferAmount?: number) => {
    if (!companyId) return;
    const total = items.reduce((acc, i) => acc + i.subtotal, 0);
    try {
      // 1. Insert the sale
      const { error } = await supabaseGarage.from('garage_sala_ventas').insert([{
        company_id: companyId,
        items,
        total,
        payment_method: paymentMethod,
        document_type: documentType,
        rut_empresa: rutEmpresa || null,
        razon_social: razonSocial || null,
        notes: notes || null,
        transfer_data: transferData || null,
        email_empresa: emailEmpresa || null,
        is_completed_invoice: isCompletedInvoice || false,
        numero_factura: numeroFactura || null,
        cash_amount: cashAmount || 0,
        card_amount: cardAmount || 0,
        transfer_amount: transferAmount || 0,
        sold_at: soldAt ? (soldAt.includes('T') ? soldAt : `${soldAt}T${new Date().toISOString().split('T')[1]}`) : new Date().toISOString()
      }]);
      if (error) throw error;

      // 2. Deduct stock for each item
      for (const item of items) {
        if (item.is_manual) continue;
        
        const part = parts.find(p => p.id === item.part_id);
        if (part) {
          const newStock = Math.max(0, part.stock - item.cantidad);
          await supabaseGarage.from('garage_parts')
            .update({ stock: newStock })
            .eq('id', item.part_id);
        }
      }

      // 3. Refresh data
      await Promise.all([fetchSalaVentas(), fetchData(true)]);
    } catch (error) {
      console.error('Error adding sala venta:', error);
      throw error;
    }
  }, [companyId, parts, fetchSalaVentas, fetchData]);

  const updateSalaVenta = useCallback(async (id: string, updates: Partial<SalaVenta>) => {
    if (!companyId) return;
    try {
      const { error } = await supabaseGarage.from('garage_sala_ventas')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      await fetchSalaVentas();
    } catch (error) {
      console.error('Error updating sala venta:', error);
      throw error;
    }
  }, [companyId, fetchSalaVentas]);

  /**
   * Guarda el feedback del cliente (rating 1-5 + comentario) en Supabase.
   * No requiere autenticación: el cliente accede vía link público.
   * Solo se debe llamar el mismo día de creación del ticket (restricción en UI).
   */
  const saveCustomerFeedback = async (ticketId: string, rating: number, feedback: string) => {
    const { error } = await supabaseGarage
      .from('garage_tickets')
      .update({
        customer_rating: rating,
        customer_feedback: feedback || null,
      })
      .eq('id', ticketId);

    if (error) throw error;

    // Actualizar localmente para reflejar inmediatamente sin refetch
    setTickets(prev =>
      prev.map(t => t.id === ticketId ? { ...t, customer_rating: rating, customer_feedback: feedback } : t)
    );
  };

  return {
    tickets,
    mechanics,
    parts,
    customers,
    settings,
    reminders,
    notifications,
    loading,
    salaVentas,
    // ─── Feedback del cliente ─────────────────────────────────────────
    addTicket,
    updateTicketStatus,
    addMechanic,
    deleteMechanic,
    addPart,
    updatePart,
    deletePart,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    updateSettings,
    updateTicket,
    deleteTicket,
    uploadTicketPhoto,
    updateVehicle,
    deleteVehicle,
    addReminder,
    updateReminder,
    deleteReminder,
    markNotificationAsRead,
    acceptQuotation,
    clearFinishedTickets,
    dismissPreventive,
    refreshData: fetchData,
    searchTicket,
    searchTicketsHistory,
    fetchCompanies,
    addIntelligentReminder,
    fetchActiveReminder,
    fetchPublicSettingsBySlug,
    fetchOccupiedReminders,
    fetchPublicVehicleInfo,
    fetchSalaVentas,
    addSalaVenta,
    updateSalaVenta,
    deleteSalaVenta: async (id: string) => {
      try {
        // 1. Obtener la venta para saber qué productos devolver al stock
        const { data: sale } = await supabaseGarage.from('garage_sala_ventas')
          .select('items')
          .eq('id', id)
          .eq('company_id', companyId)
          .single();

        if (sale && Array.isArray(sale.items)) {
          // 2. Devolver stock
          for (const item of sale.items as SalaVentaItem[]) {
            const part = parts.find(p => p.id === item.part_id);
            if (part) {
              await supabaseGarage.from('garage_parts')
                .update({ stock: part.stock + item.cantidad })
                .eq('id', item.part_id);
            }
          }
        }

        // 3. Eliminar la venta
        const { error } = await supabaseGarage.from('garage_sala_ventas')
          .delete()
          .eq('id', id)
          .eq('company_id', companyId);

        if (error) throw error;
        await Promise.all([fetchSalaVentas(), fetchData(true)]);
      } catch (error) {
        console.error('Error deleting sala venta:', error);
        throw error;
      }
    },
    saveCustomerFeedback,
    fetchDomainConfig: useCallback(async (domain: string) => {
      console.log('[useGarageStore] fetchDomainConfig called for:', domain);
      const cleanDomain = (domain || '').toLowerCase().trim();
      
      try {
        const { data: config, error } = await supabase
          .from('talleres_config')
          .select('*')
          .ilike('dominio', cleanDomain)
          .maybeSingle();
        
        if (error) {
          console.error('[useGarageStore] Error fetching domain config from talleres_config:', error);
          return null;
        }

        if (config) {
          console.log('[useGarageStore] Found config in talleres_config:', config.nombre, 'Company ID:', config.company_id);
          // También necesitamos los settings (logo, colores) para el Landing
          const { data: settings, error: settingsError } = await supabaseGarage
            .from('garage_settings')
            .select('logo_url, favicon_url, landing_config, workshop_name')
            .eq('company_id', config.company_id)
            .maybeSingle();
          
          if (settingsError) {
            console.warn('[useGarageStore] Non-critical error fetching garage_settings:', settingsError);
          }
          
          return {
            ...config,
            ...settings
          };
        }

        console.warn('[useGarageStore] No config found for domain:', cleanDomain);
        return null;
      } catch (err) {
        console.error('[useGarageStore] Unexpected error in fetchDomainConfig:', err);
        return null;
      }
    }, []),
    // ─── Garantías ──────────────────────────────────────────────────
    garantias,
    updateGarantia: async (id: string, updates: Partial<Garantia>) => {
      try {
        const { error } = await supabaseGarage.from('garage_pos_garantias')
          .update(updates)
          .eq('id', id)
          .eq('company_id', companyId);
        if (error) throw error;
        await fetchData();
      } catch (error) {
        console.error('Error updating garantia:', error);
        throw error;
      }
    },
    addGarantia: async (garantia: Partial<Garantia>) => {
      try {
        const { error } = await supabaseGarage.from('garage_pos_garantias').insert([{
          ...garantia,
          company_id: companyId,
          created_at: new Date().toISOString()
        }]);
        if (error) throw error;
        await fetchData();
      } catch (error) {
        console.error('Error adding garantia:', error);
        throw error;
      }
    },
    deleteGarantia: async (id: string) => {
      try {
        const { error } = await supabaseGarage.from('garage_pos_garantias')
          .delete()
          .eq('id', id)
          .eq('company_id', companyId);
        if (error) throw error;
        await fetchData();
      } catch (error) {
        console.error('Error deleting garantia:', error);
        throw error;
      }
    },
    vehicleModels,
    ensureVehicleModelExists: async (brand: string, model: string) => {
      if (!brand || !model) return;
      try {
        // Normalizar
        const nBrand = brand.trim();
        const nModel = model.trim();

        // Verificar si ya existe en el estado local (optimización)
        const exists = vehicleModels.some(m => 
          m.brand.toLowerCase() === nBrand.toLowerCase() && 
          m.model.toLowerCase() === nModel.toLowerCase()
        );

        if (!exists) {
          const { error } = await supabaseGarage
            .from('garage_vehicle_models')
            .upsert({ brand: nBrand, model: nModel }, { onConflict: 'brand,model' });
          
          if (!error) {
            // Actualizar estado local
            setVehicleModels(prev => [...prev, { brand: nBrand, model: nModel }]);
          }
        }
      } catch (error) {
        console.error('Error ensuring vehicle model exists:', error);
      }
    }
  };
}
