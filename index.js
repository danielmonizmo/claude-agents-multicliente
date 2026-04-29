export default async function handler(req, res) {
  try {
    const procesarMensaje = require('./api/claude-agent.js');
    const resultado = await procesarMensaje(req.body);
    return res.json(resultado);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}