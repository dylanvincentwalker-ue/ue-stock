const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const db = new Database('./stock.db');

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Create tables ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS locations (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    location   TEXT NOT NULL,
    list_type  TEXT NOT NULL,
    cat        TEXT NOT NULL,
    name       TEXT NOT NULL,
    unit       TEXT DEFAULT '',
    wd_par     TEXT DEFAULT '',
    we_par     TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (location) REFERENCES locations(slug)
  );

  CREATE TABLE IF NOT EXISTS current_counts (
    location  TEXT NOT NULL,
    list_type TEXT NOT NULL,
    day       TEXT NOT NULL,
    items     TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (location, list_type)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    location  TEXT NOT NULL,
    list_type TEXT NOT NULL,
    day       TEXT NOT NULL,
    par_type  TEXT NOT NULL,
    label     TEXT NOT NULL,
    saved_at  TEXT NOT NULL,
    time      TEXT NOT NULL,
    summary   TEXT NOT NULL,
    items     TEXT NOT NULL
  );
`);

// ── Seed locations ─────────────────────────────────────────────────────────────
const seedLocations = db.prepare('INSERT OR IGNORE INTO locations (slug, name) VALUES (?, ?)');
seedLocations.run('palm-beach', 'Palm Beach');
seedLocations.run('varsity-lakes', 'Varsity Lakes');
seedLocations.run('miami', 'Miami');

// ── Seed items if location has none ───────────────────────────────────────────
function seedItems(location, listType, itemList) {
  const count = db.prepare('SELECT COUNT(*) as c FROM items WHERE location = ? AND list_type = ?').get(location, listType);
  if (count.c > 0) return;
  const insert = db.prepare('INSERT INTO items (location, list_type, cat, name, unit, wd_par, we_par, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const insertMany = db.transaction((items) => {
    items.forEach((item, idx) => {
      insert.run(location, listType, item.cat, item.name, item.unit || '', item.wdPar || '', item.wePar || '', idx);
    });
  });
  insertMany(itemList);
}

const FOH_ITEMS = [
  {cat:'Packaging',name:'4-Cup Trays',unit:'Trays',wdPar:'15',wePar:'15'},
  {cat:'Packaging',name:'Small Coffee Lids',unit:'Sleeves',wdPar:'3',wePar:'3'},
  {cat:'Packaging',name:'Medium/Large Coffee Lids',unit:'Sleeves',wdPar:'4',wePar:'4'},
  {cat:'Packaging',name:'Small Coffee Cups',unit:'Sleeves',wdPar:'3',wePar:'3'},
  {cat:'Packaging',name:'Medium Coffee Cups',unit:'Sleeves',wdPar:'4',wePar:'4'},
  {cat:'Packaging',name:'Large Coffee Cups',unit:'Sleeves',wdPar:'4',wePar:'4'},
  {cat:'Packaging',name:'4oz Coffee Cups',unit:'Sleeve',wdPar:'1',wePar:'1'},
  {cat:'Packaging',name:'4oz Coffee Cup Lids',unit:'Sleeve',wdPar:'1',wePar:'1'},
  {cat:'Packaging',name:'14oz Cold Brew Cups',unit:'Sleeve',wdPar:'1',wePar:'1'},
  {cat:'Packaging',name:'16oz Cold Cups',unit:'Sleeves',wdPar:'3',wePar:'3'},
  {cat:'Packaging',name:'Cold Cup Lids',unit:'Sleeves',wdPar:'3',wePar:'3'},
  {cat:'Packaging',name:'Napkins',unit:'Packets',wdPar:'2',wePar:'2'},
  {cat:'Packaging',name:'Dispenser Napkins',unit:'Packets',wdPar:'3',wePar:'3'},
  {cat:'Packaging',name:'Straws',unit:'Packets',wdPar:'2',wePar:'2'},
  {cat:'Packaging',name:'Uber Bags',unit:'Boxes',wdPar:'0.5',wePar:'0.5'},
  {cat:'Packaging',name:'White Single Bagel Bags',unit:'Individual',wdPar:'40',wePar:'40'},
  {cat:'Packaging',name:'Portion Cups',unit:'Cups',wdPar:'20',wePar:'20'},
  {cat:'Packaging',name:'Bamboo Forks',unit:'Packet',wdPar:'1',wePar:'1'},
  {cat:'Packaging',name:'Bamboo Knives',unit:'Packet',wdPar:'1',wePar:'1'},
  {cat:'Packaging',name:'Bamboo Spoons',unit:'Packet',wdPar:'1',wePar:'1'},
  {cat:'Packaging',name:'Red Checked Paper',unit:'Packs',wdPar:'2',wePar:'2'},
  {cat:'Packaging',name:'Take Away Clam Shells',unit:'Sleeves',wdPar:'3',wePar:'3'},
  {cat:'Packaging',name:'Brown Take Away Bagel Pack',unit:'Packs',wdPar:'2',wePar:'2'},
  {cat:'Packaging',name:'Clear Bagel Bags',unit:'Packet',wdPar:'1',wePar:'1'},
  {cat:'Packaging',name:'Twist Ties',unit:'Packet',wdPar:'1',wePar:'1'},
  {cat:'Packaging',name:'Coffee Lid Stoppers',unit:'Container',wdPar:'0.33',wePar:'0.33'},
  {cat:'Packaging',name:'Staples',unit:'Box',wdPar:'1',wePar:'1'},
  {cat:'Packaging',name:'Till Rolls',unit:'Rolls',wdPar:'4',wePar:'4'},
  {cat:'Packaging',name:'Eftpos Rolls',unit:'Rolls',wdPar:'2',wePar:'2'},
  {cat:'Packaging',name:'Brown Paper Bags',unit:'Large Stack',wdPar:'1',wePar:'1'},
  {cat:'Packaging',name:'Chux',unit:'Roll',wdPar:'1',wePar:'1'},
  {cat:'Packaging',name:'Green Scrubs',unit:'Packet',wdPar:'1',wePar:'1'},
  {cat:'Packaging',name:'Metal Scourers',unit:'Packet',wdPar:'1',wePar:'1'},
  {cat:'Packaging',name:'Paper Towel',unit:'Roll',wdPar:'1',wePar:'1'},
  {cat:'Packaging',name:'Hand Towel',unit:'Sleeves',wdPar:'3',wePar:'3'},
  {cat:'Packaging',name:'Sanitizer Spray (Return)',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Packaging',name:'Multipurpose Cleaner (Return)',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Packaging',name:'Glass Cleaner (Return)',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Packaging',name:'Dishwashing Detergent',unit:'Bottle',wdPar:'1',wePar:'1'},
  {cat:'Packaging',name:'Garbage Bags',unit:'Box',wdPar:'1',wePar:'1'},
  {cat:'Packaging',name:'Knock Box Coffee Bags',unit:'Sleeve',wdPar:'1',wePar:'1'},
  {cat:'Packaging',name:'Grill Cleaner',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Packaging',name:'Floor Cleaner',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Packaging',name:'Bleach',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Packaging',name:'Cleaning Vinegar',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Coffee Station',name:'Ice Cream',unit:'Containers',wdPar:'3',wePar:'3'},
  {cat:'Coffee Station',name:'Apple Juice',unit:'Bottles',wdPar:'8',wePar:'8'},
  {cat:'Coffee Station',name:'Tropical Juice',unit:'Bottles',wdPar:'8',wePar:'8'},
  {cat:'Coffee Station',name:'Green Supreme Juice',unit:'Bottles',wdPar:'8',wePar:'8'},
  {cat:'Coffee Station',name:'Orange Juice',unit:'Bottles',wdPar:'8',wePar:'8'},
  {cat:'Coffee Station',name:'Burleigh Drinks Sparkling Water',unit:'Cans',wdPar:'6',wePar:'6'},
  {cat:'Coffee Station',name:'Burleigh Drinks LL Sparkling',unit:'Cans',wdPar:'6',wePar:'6'},
  {cat:'Coffee Station',name:'Burleigh Drinks Traditional Lemonade',unit:'Cans',wdPar:'6',wePar:'6'},
  {cat:'Coffee Station',name:'Burleigh Drinks Dragon Fruit Lemonade',unit:'Cans',wdPar:'6',wePar:'6'},
  {cat:'Coffee Station',name:'Red Bull Original',unit:'Cans',wdPar:'6',wePar:'6'},
  {cat:'Coffee Station',name:'Red Bull Sugar Free',unit:'Cans',wdPar:'6',wePar:'6'},
  {cat:'Coffee Station',name:'English Breakfast Tea',unit:'Container',wdPar:'0.5',wePar:'0.5'},
  {cat:'Coffee Station',name:'Lemon Grass & Ginger Tea',unit:'Container',wdPar:'0.5',wePar:'0.5'},
  {cat:'Coffee Station',name:'Earl Grey Tea',unit:'Container',wdPar:'0.5',wePar:'0.5'},
  {cat:'Coffee Station',name:'Green Tea',unit:'Container',wdPar:'0.5',wePar:'0.5'},
  {cat:'Coffee Station',name:'Forest Fruits Tea',unit:'Container',wdPar:'0.5',wePar:'0.5'},
  {cat:'Coffee Station',name:'Peppermint Tea',unit:'Container',wdPar:'0.5',wePar:'0.5'},
  {cat:'Coffee Station',name:'Oat Milk',unit:'Milks',wdPar:'12',wePar:'12'},
  {cat:'Coffee Station',name:'Almond Milk',unit:'Milks',wdPar:'12',wePar:'12'},
  {cat:'Coffee Station',name:'Soy Milk',unit:'Milks',wdPar:'9',wePar:'9'},
  {cat:'Coffee Station',name:'Coconut Milk',unit:'Milks',wdPar:'6',wePar:'6'},
  {cat:'Coffee Station',name:'Maple Syrup (Return Bottle)',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Coffee Station',name:'Honey',unit:'Bucket',wdPar:'1',wePar:'1'},
  {cat:'Coffee Station',name:'Hot Chocolate',unit:'Packet',wdPar:'1',wePar:'1'},
  {cat:'Coffee Station',name:'White Hot Chocolate',unit:'Container',wdPar:'0.5',wePar:'0.5'},
  {cat:'Coffee Station',name:'Sweeteners',unit:'Container',wdPar:'0.5',wePar:'0.5'},
  {cat:'Coffee Station',name:'Marshmallows',unit:'Container',wdPar:'0.5',wePar:'0.5'},
  {cat:'Coffee Station',name:'Iced Teas',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Coffee Station',name:'Caramel Syrup',unit:'Full bottle',wdPar:'1',wePar:'1'},
  {cat:'Coffee Station',name:'Vanilla Syrup',unit:'Full bottle',wdPar:'1',wePar:'1'},
  {cat:'Coffee Station',name:'Chai Syrup',unit:'Full bottle',wdPar:'1',wePar:'1'},
  {cat:'Coffee Station',name:'Decaf Coffee',unit:'(1x Out front, 1x Freezer)',wdPar:'2',wePar:'2'},
  {cat:'Coffee Station',name:'Single Origin Coffee',unit:'(1x Out front, 1x Freezer)',wdPar:'2',wePar:'2'},
  {cat:'Coffee Station',name:'Cinnamon (Return)',unit:'Container',wdPar:'0.5',wePar:'0.5'},
  {cat:'Coffee Station',name:'Coffee 1KG Bags',unit:'kg',wdPar:'6',wePar:'6'},
  {cat:'Coffee Station',name:'Raw Sugar',unit:'Packet',wdPar:'0.5',wePar:'0.5'},
  {cat:'Coffee Station',name:'Bagel Chips',unit:'Packets',wdPar:'4',wePar:'4'},
  {cat:'Coffee Station',name:'Everything Seasoning Jars',unit:'Jars',wdPar:'4',wePar:'4'},
  {cat:'Coffee Station',name:'UE Caps',unit:'(2x Black, 2x Khaki)',wdPar:'4',wePar:'4'},
  {cat:'Fridge',name:'Milk 2L',unit:'Bottles',wdPar:'15',wePar:'20'},
  {cat:'Fridge',name:'Skim Milk 2L',unit:'Bottles',wdPar:'4',wePar:'5'},
  {cat:'Fridge',name:'Lactose Free 2L',unit:'Bottles',wdPar:'3',wePar:'4'},
  {cat:'Fridge',name:'Spiced Chai Bottles',unit:'Full Bottle',wdPar:'1',wePar:'1'},
  {cat:'Fridge',name:'Cold Brew',unit:'Bottles',wdPar:'2',wePar:'2'},
  {cat:'Fridge',name:'Bottled Water',unit:'Bottles',wdPar:'12',wePar:'12'},
];

const BOH_ITEMS = [
  {cat:'Dairy / Meat / Protein',name:'Sliced Cheese',unit:'Packets',wdPar:'2',wePar:'3'},
  {cat:'Dairy / Meat / Protein',name:'Mozzarella',unit:'Blocks',wdPar:'1',wePar:'2'},
  {cat:'Dairy / Meat / Protein',name:'Halloumi',unit:'Containers',wdPar:'1',wePar:'2'},
  {cat:'Dairy / Meat / Protein',name:'Eggs',unit:'Eggs',wdPar:'120',wePar:'180'},
  {cat:'Dairy / Meat / Protein',name:'Bacon',unit:'kg',wdPar:'7.5',wePar:'10'},
  {cat:'Dairy / Meat / Protein',name:'Sausage',unit:'Sausages',wdPar:'20',wePar:'40'},
  {cat:'Dairy / Meat / Protein',name:'Brisket',unit:'kg',wdPar:'1',wePar:'2'},
  {cat:'Dairy / Meat / Protein',name:'Mojo Pork',unit:'kg',wdPar:'1',wePar:'2'},
  {cat:'Dairy / Meat / Protein',name:'Crumbed Chicken',unit:'Pieces',wdPar:'15',wePar:'20'},
  {cat:'Dairy / Meat / Protein',name:'Ham',unit:'Pack',wdPar:'1',wePar:'1'},
  {cat:'Dairy / Meat / Protein',name:'Salami',unit:'Pack',wdPar:'1',wePar:'1'},
  {cat:'Vegetables',name:'Vegan Lox',unit:'Pack',wdPar:'1',wePar:'1'},
  {cat:'Vegetables',name:'Mushrooms',unit:'Mushrooms',wdPar:'10',wePar:'15'},
  {cat:'Vegetables',name:'Avocados',unit:'Avocados',wdPar:'15',wePar:'25'},
  {cat:'Vegetables',name:'Tomatoes',unit:'Tomatoes',wdPar:'10',wePar:'15'},
  {cat:'Vegetables',name:'Red Onions',unit:'Onions',wdPar:'10',wePar:'10'},
  {cat:'Vegetables',name:'Rocket',unit:'Box',wdPar:'0.5',wePar:'1'},
  {cat:'Vegetables',name:'Capsicum',unit:'Capsicums',wdPar:'5',wePar:'5'},
  {cat:'Vegetables',name:'Capers',unit:'Jar',wdPar:'0.5',wePar:'1'},
  {cat:'Vegetables',name:'Cucumber',unit:'Cucumbers',wdPar:'1',wePar:'3'},
  {cat:'Vegetables',name:'Pickles',unit:'Jar',wdPar:'0.5',wePar:'1'},
  {cat:'Vegetables',name:'Jalapenos',unit:'Container',wdPar:'1',wePar:'1'},
  {cat:'Sauces',name:'Chipotle',unit:'Bottle',wdPar:'1',wePar:'2'},
  {cat:'Sauces',name:'Mayonnaise',unit:'Bottle',wdPar:'1',wePar:'1'},
  {cat:'Sauces',name:'BBQ',unit:'Big Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Sauces',name:'Pesto Aioli',unit:'Bottle',wdPar:'1',wePar:'1'},
  {cat:'Sauces',name:'Ketchup',unit:'Bottle',wdPar:'1',wePar:'1'},
  {cat:'Sauces',name:'Gochujang Mayo',unit:'Bottle',wdPar:'1',wePar:'1'},
  {cat:'Sauces',name:'Buffalo Sauce',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Sauces',name:'Dijionaise',unit:'Bottle',wdPar:'1',wePar:'1'},
  {cat:'Sauces',name:'Pizza Sauce',unit:'Bottle',wdPar:'1',wePar:'1'},
  {cat:'Spreads',name:'Hot Honey',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Spreads',name:'Cream Cheese',unit:'Inserts',wdPar:'1.5',wePar:'2'},
  {cat:'Spreads',name:'Flavored Cream Cheese',unit:'Container',wdPar:'1',wePar:'1'},
  {cat:'Spreads',name:'Vegan Cream Cheese',unit:'Insert',wdPar:'1',wePar:'1'},
  {cat:'Spreads',name:'Lemon Curd',unit:'Tub',wdPar:'0.5',wePar:'0.5'},
  {cat:'Spreads',name:'Nutella',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Spreads',name:'Peanut Butter',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Spreads',name:'Vegemite',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Spreads',name:'Honey',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Spreads',name:'Jam',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Spreads',name:'Butter',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Spreads',name:'Nuttlex',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Spreads',name:'Meringue Nest',unit:'Nests',wdPar:'8',wePar:'10'},
  {cat:'Extras',name:'Bagel Chips',unit:'Packets',wdPar:'4',wePar:'6'},
  {cat:'Extras',name:'Cream Cheese Tubs',unit:'Tubs',wdPar:'4',wePar:'6'},
  {cat:'Extras',name:'Flavoured Cream Cheese Tubs',unit:'Tubs',wdPar:'3',wePar:'3'},
  {cat:'Extras',name:'Gluten Free Poppy Seed',unit:'Packs',wdPar:'2',wePar:'3'},
  {cat:'Extras',name:'Gluten Free Plain',unit:'Packs',wdPar:'2',wePar:'3'},
  {cat:'Extras',name:'Bagel Triangles',unit:'Inch Stack',wdPar:'1',wePar:'1'},
  {cat:'Extras',name:'Tea Towels',unit:'Tea Towels',wdPar:'4',wePar:'4'},
  {cat:'Extras',name:'Spray Oil',unit:'Cans',wdPar:'2',wePar:'2'},
  {cat:'Cleaning Supplies',name:'Floor Cleaner',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Cleaning Supplies',name:'Bleach',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Cleaning Supplies',name:'Grill Cleaner',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Cleaning Supplies',name:'Vinegar',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Cleaning Supplies',name:'Dish Soap',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Cleaning Supplies',name:'Hand Soap Refil',unit:'Bottle',wdPar:'0.5',wePar:'0.5'},
  {cat:'Freezer Count',name:'GF Plain',unit:'',wdPar:'',wePar:''},
  {cat:'Freezer Count',name:'GF Poppy',unit:'',wdPar:'',wePar:''},
  {cat:'Freezer Count',name:'Salmon',unit:'',wdPar:'',wePar:''},
  {cat:'Freezer Count',name:'Chicken Cutlet',unit:'',wdPar:'',wePar:''},
  {cat:'Freezer Count',name:'Vegan Lox',unit:'',wdPar:'',wePar:''},
  {cat:'Freezer Count',name:'Ham',unit:'',wdPar:'',wePar:''},
  {cat:'Freezer Count',name:'Salami',unit:'',wdPar:'',wePar:''},
  {cat:'Freezer Count',name:'Mojo Pork',unit:'',wdPar:'',wePar:''},
  {cat:'Freezer Count',name:'Brisket',unit:'',wdPar:'',wePar:''},
];

// Seed all 3 locations with same base list
['palm-beach','varsity-lakes','miami'].forEach(loc => {
  seedItems(loc, 'foh', FOH_ITEMS);
  seedItems(loc, 'boh', BOH_ITEMS);
});

// ── API Routes ────────────────────────────────────────────────────────────────

// Get all locations
app.get('/api/locations', (req, res) => {
  const rows = db.prepare('SELECT * FROM locations ORDER BY name').all();
  res.json(rows);
});

// Get items for a location+list (used by app on load)
app.get('/api/:location/:list/items', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM items WHERE location = ? AND list_type = ? ORDER BY sort_order, id'
  ).all(req.params.location, req.params.list);
  res.json(rows);
});

// Add item
app.post('/api/:location/:list/items', (req, res) => {
  const { cat, name, unit, wd_par, we_par } = req.body;
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM items WHERE location = ? AND list_type = ?').get(req.params.location, req.params.list);
  const result = db.prepare(
    'INSERT INTO items (location, list_type, cat, name, unit, wd_par, we_par, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.params.location, req.params.list, cat, name, unit || '', wd_par || '', we_par || '', (maxOrder.m || 0) + 1);
  res.json({ id: result.lastInsertRowid });
});

// Update item par levels
app.patch('/api/:location/:list/items/:id', (req, res) => {
  const { wd_par, we_par, name, unit } = req.body;
  db.prepare('UPDATE items SET wd_par = ?, we_par = ?, name = ?, unit = ? WHERE id = ? AND location = ?')
    .run(wd_par, we_par, name, unit, req.params.id, req.params.location);
  res.json({ ok: true });
});

// Delete item
app.delete('/api/:location/:list/items/:id', (req, res) => {
  db.prepare('DELETE FROM items WHERE id = ? AND location = ?').run(req.params.id, req.params.location);
  res.json({ ok: true });
});

// Save current count (auto-saves every change)
app.post('/api/:location/:list/count', (req, res) => {
  const { day, date, items } = req.body;
  db.prepare(`
    INSERT INTO current_counts (location, list_type, day, items, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(location, list_type) DO UPDATE SET
      day = excluded.day, items = excluded.items, updated_at = excluded.updated_at
  `).run(req.params.location, req.params.list, day, JSON.stringify(items), date || new Date().toISOString());
  res.json({ ok: true });
});

// Load current count
app.get('/api/:location/:list/count', (req, res) => {
  const row = db.prepare('SELECT * FROM current_counts WHERE location = ? AND list_type = ?')
    .get(req.params.location, req.params.list);
  if (!row) return res.json(null);
  res.json({ day: row.day, items: JSON.parse(row.items) });
});

// Save finalised report
app.post('/api/:location/:list/reports', (req, res) => {
  const { day, parType, label, time, summary, items } = req.body;
  const result = db.prepare(`
    INSERT INTO reports (location, list_type, day, par_type, label, saved_at, time, summary, items)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.location, req.params.list, day, parType, label,
         new Date().toISOString(), time, JSON.stringify(summary), JSON.stringify(items));
  res.json({ id: result.lastInsertRowid });
});

// Get all reports
app.get('/api/:location/:list/reports', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM reports WHERE location = ? AND list_type = ? ORDER BY saved_at DESC LIMIT 120'
  ).all(req.params.location, req.params.list);
  res.json(rows.map(r => ({ ...r, summary: JSON.parse(r.summary), items: JSON.parse(r.items) })));
});

// Delete report
app.delete('/api/:location/:list/reports/:id', (req, res) => {
  db.prepare('DELETE FROM reports WHERE id = ? AND location = ?').run(req.params.id, req.params.location);
  res.json({ ok: true });
});

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`UE Bagels Stock Manager running on port ${PORT}`));
