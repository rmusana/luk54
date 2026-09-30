"""Full-year coherent test seed for LUK54 (Oct 2025 -> Sep 2026). Re-runnable: wipes transactional tables first."""
import psycopg2, random, datetime

random.seed(42)
START = datetime.date(2025, 10, 1)
TODAY = datetime.date(2026, 9, 30)
DAYS = [(START + datetime.timedelta(days=i)) for i in range((TODAY - START).days + 1)]

c = psycopg2.connect(host='aws-1-eu-west-1.pooler.supabase.com', port=6543, dbname='postgres',
                     user='postgres.ldftfxpdpkgtoyvfnnex', password='@RMUSANA2026', sslmode='require', connect_timeout=20)
c.autocommit = True
cur = c.cursor()

WIPE = ['daily_production', 'flock_events', 'feed_purchases', 'feed_inventory', 'weekly_feed_mix',
        'sales', 'health_events', 'expenses', 'capital_contributions', 'revenue_allocations',
        'profit_distributions', 'inventory', 'staff_notes', 'workers', 'alerts', 'documents', 'health_options']
for t in WIPE:
    cur.execute(f"delete from {t} where project_id='LUK54'")
cur.execute("delete from audit_log")
cur.execute("update budget_lines set actual_total=0, variance=-budget_total where project_id='LUK54'")
print('wiped', flush=True)

# --- flock over time ---
birds = 2500
spike_days = set(random.sample(DAYS, 8))
dip_weeks = set(random.sample(range(20, 52), 3))
daily_rows = []
for d in DAYS:
    w = (d - START).days // 7
    if w < 18:
        rate = 10 + (70 * w / 18) + random.uniform(-3, 3)
    else:
        rate = 90 + random.uniform(-2.5, 2.5)
        if w in dip_weeks:
            rate = 80 + random.uniform(-2, 2)
    opening = birds
    mort = random.randint(4, 9) if d in spike_days else random.choice([0, 0, 0, 1, 1, 2])
    mort = min(mort, opening)
    closing = opening - mort
    eggs = round(closing * max(0, rate) / 100)
    trays = round(eggs / 30, 1)
    feed = round(closing * 0.115 + random.uniform(-8, 8), 1)
    daily_rows.append((str(d), 'Combined', opening, mort, closing, eggs, trays,
                       random.randint(0, 8), random.choice([0, 0, 0, 1]), feed,
                       'Seed year' if d.day == 1 else ''))
    birds = closing
print('final birds:', birds, flush=True)

cur.executemany(
    "insert into daily_production (project_id, date, section, opening_birds, mortality, closing_birds, eggs_collected, eggs_trays, breakages, eggs_lost, feed_issued_kg, notes) values ('LUK54',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
    daily_rows)
for sid, frac, label in (('A', 0.32, 'Section A — Young'), ('B', 0.35, 'Section B — Medium'), ('C', 0.33, 'Section C — Grown')):
    cur.execute("update flock_sections set bird_count=%s, label=%s where project_id='LUK54' and section_id=%s",
                (round(birds * frac), label, sid))
cur.execute("insert into flock_events (project_id, date, event_type, quantity, notes) values ('LUK54','2025-10-01','Stocking',2500,'Point-of-lay intake')")
for m in range(1, 12):
    d = (START + datetime.timedelta(days=30 * m))
    if d <= TODAY:
        cur.execute("insert into flock_events (project_id, date, event_type, quantity, notes) values ('LUK54',%s,'Culling',%s,'Monthly weak-bird removal')",
                    (str(d), random.randint(3, 9)))

# --- sales (~65% of eggs) ---
total_eggs = sum(r[5] for r in daily_rows)
sale_rows = []
sold_eggs = 0
d = START + datetime.timedelta(days=3)
while d <= TODAY:
    day_eggs = next((r[5] for r in daily_rows if r[0] == str(d)), 0)
    trays = round(min(day_eggs * 0.9 / 30, random.uniform(30, 75)), 1)
    etype, price = random.choices([('Normal', 11000), ('Starter', 9000), ('Medium', 10000)], [0.6, 0.2, 0.2])[0]
    pay = 'Debt' if random.random() < 0.15 else 'Cash'
    sale_rows.append((str(d), random.choice(['Mama Naki Shop', 'Kampala Grocers', 'Nansana Retail', 'Kawempe Stalls']),
                      trays, round(trays * 30), price, round(trays * price), 'Eggs', etype, pay, '', 0, 0, 0, ''))
    sold_eggs += trays * 30
    d += datetime.timedelta(days=random.choice([1, 1, 2]))
for m in range(12):
    d = datetime.date(2025, 10, 15) + datetime.timedelta(days=30 * m)
    if d <= TODAY:
        sale_rows.append((str(d), 'Garden Project', 5, 150, 5000, 25000, 'Litter', '', 'Cash', '', 0, 0, 0, 'Manure'))
cur.executemany(
    "insert into sales (project_id, date, customer, quantity_trays, quantity_eggs, unit_price, total_revenue, sale_category, egg_type, payment_status, payment_ref, breakage_trays_sold, damaged_trays_sold, lost_trays, notes) values ('LUK54',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
    sale_rows)
print('eggs collected:', total_eggs, 'sold:', round(sold_eggs), 'pct:', round(sold_eggs / total_eggs * 100), flush=True)

# --- feed ---
for m in range(12):
    d = datetime.date(2025, 10, 5) + datetime.timedelta(days=30 * m)
    if d > TODAY:
        continue
    ds = str(d)
    cur.execute("insert into feed_purchases (project_id, date, product, qty_kg, unit_cost, total_cost, supplier) values ('LUK54',%s,'Brand',2000,1800,3600000,'Uganda Feeds')", (ds,))
    cur.execute("insert into feed_purchases (project_id, date, product, qty_kg, unit_cost, total_cost, supplier) values ('LUK54',%s,'Concentrate',800,4500,3600000,'Hendrix Agent')", (ds,))
    cur.execute("insert into feed_purchases (project_id, date, product, qty_kg, unit_cost, total_cost, supplier) values ('LUK54',%s,'Maize',1200,1500,1800000,'Local mill')", (ds,))
ws = START - datetime.timedelta(days=START.weekday())
while ws <= TODAY:
    cur.execute("insert into weekly_feed_mix (project_id, week_start, week_end, brand_kg, concentrate_kg, lime_powder_kg, limestone_kg, soya_kg, sunflower_kg, broken_kg, maize_kg, others_kg, total_kg) values ('LUK54',%s,%s,1400,350,70,60,280,140,90,700,20,3110)",
                (str(ws), str(ws + datetime.timedelta(days=6))))
    ws += datetime.timedelta(days=7)
cur.execute("insert into feed_inventory (project_id, product, closing_stock, purchases, consumption, unit_cost) values ('LUK54','Brand',640,24000,23360,1800),('LUK54','Concentrate',410,9600,9190,4500),('LUK54','Maize',520,14400,13880,1500),('LUK54','Soya',180,2000,1820,2600)")

# --- health ---
cur.execute("update vaccination_schedule set status='Completed' where project_id='LUK54'")
for m in [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48]:
    d = START + datetime.timedelta(weeks=m)
    if d <= TODAY:
        cur.execute("insert into health_events (project_id, date, type, product, notes) values ('LUK54',%s,'Vaccination','NEWCASTLE LASOTA','Monthly booster')", (str(d),))
for v, w in (('NEWCASTLE IB', 1), ('GUMBOLO 1', 2), ('GUMBOLO 2', 3), ('FOWL POX', 6), ('DEWORMING', 8), ('FOWL TYPHOID', 12)):
    cur.execute("insert into health_events (project_id, date, type, product, notes) values ('LUK54',%s,'Vaccination',%s,'Schedule')",
                (str(START + datetime.timedelta(weeks=w)), v))
for i in range(6):
    d = START + datetime.timedelta(days=random.randint(0, 364))
    cur.execute("insert into health_events (project_id, date, type, product, notes) values ('LUK54',%s,'Medication',%s,'Routine')",
                (str(d), random.choice(['GLUCOVIT', 'OXYVITAMIN', 'LEVACIDE'])))

# --- money ---
for date, amt, purpose, ref in (('2025-10-01', 30000000, 'Birds', 'TRN-001'), ('2026-01-15', 20000000, 'Feed', 'TRN-002'), ('2026-05-10', 15000000, 'General', 'TRN-003')):
    cur.execute("insert into capital_contributions (project_id, date, amount, purpose, reference) values ('LUK54',%s,%s,%s,%s)", (date, amt, purpose, ref))
dday = START
while dday <= TODAY:
    ds = str(dday)
    cur.execute("insert into expenses (project_id, date, category, sub_category, amount, supplier) values ('LUK54',%s,'Feeds','Weekly feed',%s,'Uganda Feeds')", (ds, random.randint(1800000, 2400000)))
    cur.execute("insert into expenses (project_id, date, category, sub_category, amount) values ('LUK54',%s,'Labour','Weekly wages',150000)", (ds,))
    if dday.day <= 7:
        cur.execute("insert into expenses (project_id, date, category, sub_category, amount) values ('LUK54',%s,'Utilities','Power and water',80000)", (ds,))
        cur.execute("insert into expenses (project_id, date, category, sub_category, amount) values ('LUK54',%s,'Transport','Feed transport',120000)", (ds,))
    if dday.month % 3 == 1 and dday.day <= 7:
        cur.execute("insert into expenses (project_id, date, category, sub_category, amount) values ('LUK54',%s,'Medication','Quarterly stock',450000)", (ds,))
        cur.execute("insert into expenses (project_id, date, category, sub_category, amount) values ('LUK54',%s,'Vaccination','Quarterly vaccines',200000)", (ds,))
    dday += datetime.timedelta(days=7)
cur.execute("select id, category, sub_item, budget_total from budget_lines where project_id='LUK54'")
lines = cur.fetchall()
cur.execute("select category, sub_category, sum(amount) from expenses where project_id='LUK54' group by 1,2")
for cat, sub, total in cur.fetchall():
    hit = next((l for l in lines if l[1] == cat and sub and sub in (l[2] or '')), None) or next((l for l in lines if l[1] == cat), None)
    if hit:
        cur.execute("update budget_lines set actual_total = coalesce(actual_total,0)+%s where id=%s", (float(total), hit[0]))
cur.execute("update budget_lines set variance = coalesce(actual_total,0) - coalesce(budget_total,0) where project_id='LUK54'")
for mon in ('2026-07', '2026-08'):
    mon_rev = sum(r[5] for r in sale_rows if r[0].startswith(mon))
    gp = mon_rev * 0.5
    cur.execute("insert into revenue_allocations (project_id, month, gross_sales_revenue, feed_allocation, gross_profit, operating_partner_share, net_profit_to_investor, status) values ('LUK54',%s,%s,%s,%s,%s,%s,'Finalized')",
                (mon, mon_rev, mon_rev * 0.5, gp, gp * 0.25, gp * 0.75))
cur.execute("insert into profit_distributions (project_id, month, amount, paid_date, reference, status) values ('LUK54','2026-07',2000000,'2026-08-05','TRN-P01','Paid'),('LUK54','2026-08',1500000,'','','Pending')")

# --- misc ---
for name, pay, adv in (('Okello James', 300000, 50000), ('Amina Yusuf', 250000, 0), ('Ssemakula Peter', 280000, 20000)):
    cur.execute("insert into workers (project_id, name, payroll, advance, notes) values ('LUK54',%s,%s,%s,'Seed year')", (name, pay, adv))
for name, qty, unit, rl in (('Egg trays (empty)', 400, 'pcs', 100), ('Disinfectant', 5, 'litres', 2), ('Feed sacks', 120, 'pcs', 50), ('Charcoal bags', 12, 'bags', 5)):
    cur.execute("insert into inventory (project_id, name, quantity, unit, reorder_level) values ('LUK54',%s,%s,%s,%s)", (name, qty, unit, rl))
notes = [('General', 'Year-end stock count scheduled.'), ('Health', 'Booster campaign completed for all sections.'),
         ('Staff', 'Night watch rota updated.'), ('Production', 'Best laying week recorded in August.'),
         ('Feed', 'New maize supplier trial approved.'), ('General', 'Fence repairs finished.')]
for i, (cat, txt) in enumerate(notes):
    cur.execute("insert into staff_notes (project_id, date, content, category) values ('LUK54',%s,%s,%s)",
                (str(TODAY - datetime.timedelta(days=i * 45)), txt, cat))

for t in ['daily_production', 'sales', 'expenses', 'capital_contributions', 'feed_purchases', 'weekly_feed_mix', 'health_events', 'flock_events']:
    cur.execute(f"select count(*) from {t} where project_id='LUK54'")
    print(t, cur.fetchone()[0], flush=True)
cur.close()
c.close()
print('SEED DONE', flush=True)
