const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const predictor = require('./predictor');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Main endpoint injected by Chrome Extension
app.post('/api/update', (req, res) => {
  const { type, data } = req.body;

  if (type === 'sicbo_result') {
    const { period, dice, sum } = data;
    console.log(`\n🎲 [LIVE GAME] Period: ${period} | Roll: [${dice}] = ${sum}`);

    // Feed real-time data into the prediction engine
    const analysis = predictor.addResult(period, dice, sum);

    // Broadcast to Dashboard UI
    io.emit('game_update', {
      period,
      dice,
      sum,
      prediction: analysis
    });
  }

  res.json({ success: true });
});

server.listen(4000, () => {
  console.log("=========================================");
  console.log("   🎲 SICBO PREDICTION BOT SERVER RUUNING 🎲");
  console.log("   Dashboard: http://localhost:4000");
  console.log("=========================================");
});
