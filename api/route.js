const procesarMensaje = require('./claude-agent.js');

exports.default = async (req, res) => {
  if (req.method === 'POST') {
    try {
      const resultado = await procesarMensaje(req.body);
      res.status(200).json(resultado);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};