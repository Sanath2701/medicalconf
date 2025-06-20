const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');

// ✅ GET all schedules by day using query parameter (?day=DAY-1)
router.get('/', async (req, res) => {
  try {
    const { day } = req.query;
    const schedules = await Schedule.find({ day });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST new schedule entry
router.post('/', async (req, res) => {
  try {
    console.log("📩 Received POST:", req.body); // Log for debugging
    const entry = new Schedule(req.body);
    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    console.error("❌ POST Error:", err); // Error log
    res.status(400).json({ error: err.message });
  }
});

// ✅ PUT update schedule entry by ID
router.put('/:id', async (req, res) => {
  try {
    const updated = await Schedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ DELETE schedule entry by ID
router.delete('/:id', async (req, res) => {
  try {
    await Schedule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
