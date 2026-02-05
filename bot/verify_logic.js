const WingoPredictor = require('./prediction');

const predictor = new WingoPredictor();

console.log("Testing Wingo Logic...");

// Test 1: Data Entry
predictor.addResult('20240001', 1); // Small, Green
predictor.addResult('20240002', 6); // Big, Red
predictor.addResult('20240003', 3); // Small, Green
predictor.addResult('20240004', 8); // Big, Red
predictor.addResult('20240005', 1); // Small, Green
// Sequence: S, B, S, B, S -> ZigZag continues
const p1 = predictor.predictNext();
console.log(`Test 1 (ZigZag S B S B S): Predicted Size: ${p1.size} (Expected Big), Reason: ${p1.reasoning}`);

// Test 2: Dragon
predictor.clearHistory();
predictor.addResult('1', 5); // B
predictor.addResult('2', 6); // B
predictor.addResult('3', 7); // B
predictor.addResult('4', 8); // B
predictor.addResult('5', 9); // B
const p2 = predictor.predictNext();
console.log(`Test 2 (Dragon BBBBB): Predicted Size: ${p2.size} (Expected Big), Reason: ${p2.reasoning}`);

// Test 3: Color
predictor.clearHistory();
predictor.addResult('1', 2); // R
predictor.addResult('2', 4); // R
predictor.addResult('3', 6); // R
const p3 = predictor.predictNext();
console.log(`Test 3 (Color RRR): Predicted Color: ${p3.color} (Expected Red), Reason: ${p3.reasoning}`);

console.log("Done.");
