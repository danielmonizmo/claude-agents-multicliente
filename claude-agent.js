const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function procesarMensaje(webhookData) {
  try {
    const { contact_id, from, body, locationId } = webhookData;
    const telefonoCorto = from.slice(-10);

    const { data: cliente } = await supabase
      .from('clients')
      .select('*')
      .eq('ghl_location_id', locationId)
      .single();

    if (!cliente) {
      return { error: 'Cliente no encontrado' };
    }

    const { data: contacto } = await supabase
      .from('clientes_kiwid')
      .select('*')
      .eq('contact_id_ghl', contact_id)
      .eq('cliente_id', cliente.id)
      .maybeSingle();

    let contactoId;

    if (!contacto) {
      const { data: nuevo } = await supabase
        .from('clientes_kiwid')
        .insert([{
          contact_id_ghl: contact_id,
          cliente_id: cliente.id,
          telefono: from,
          telefono_corto: telefonoCorto,
          estado: 'Contactado',
          fuente: 'GHL',
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString()
        }])
        .select()
        .single();
      
      contactoId = nuevo.id;
    } else {
      contactoId = contacto.id;
    }

    const respuestaMessage = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 256,
      system: `Eres ANI, asistente digital. Sé profesional y amable.`,
      messages: [{
        role: 'user',
        content: body
      }]
    });

    const respuesta = respuestaMessage.content[0].text;

    await supabase
      .from('interacciones_whatsapp')
      .insert([{
        contacto_id: contactoId,
        cliente_id: cliente.id,
        mensaje_entrada: body,
        mensaje_salida: respuesta,
        fecha: new Date().toISOString()
      }]);

    await supabase
      .from('clientes_kiwid')
      .update({
        estado: 'Respondió',
        fecha_ultima_respuesta: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      })
      .eq('id', contactoId);

    return {
      success: true,
      respuesta: respuesta,
      contactoId: contactoId,
      clienteId: cliente.id
    };

  } catch (error) {
    console.error('Error en Claude Agent:', error);
    return { error: error.message };
  }
}

module.exports = procesarMensaje;