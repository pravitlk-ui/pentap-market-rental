import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { Plus, X, Search, Trash2, Coins } from "lucide-react";

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Noto+Serif+Thai:wght@500;700&family=Noto+Sans+Thai:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap";

const STORAGE_KEY = "pentap-market-units";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const ZONES = {
  shophouse: { label: "ห้องแถว", prefix: "ห้อง ", color: "#2F6F4E", payLog: false },
  dome: { label: "โดมตลาด", color: "#E8A33D", payLog: true },
  outdoor: { label: "พื้นที่ภายนอก", prefix: "น", color: "#C1502E", payLog: true },
};

const DOME_GROUPS = {
  A: { size: "1.5×3 ม." },
  B: { size: "1.5×3 ม." },
  C: { size: "1.5×3 ม." },
  D: { size: "3×3 ม." },
};

const STATUS = {
  vacant: { label: "ว่าง", fg: "#5C6B60", bg: "#FFFFFF", border: "#D8DED9" },
  occupied: { label: "เช่าแล้ว", fg: "#FFFFFF", bg: "#2F6F4E", border: "#2F6F4E" },
  occupiedDaily: { label: "เช่าแล้ว (รายวัน)", fg: "#FFFFFF", bg: "#3D7A99", border: "#3D7A99" },
  occupiedMonthly: { label: "เช่าแล้ว (รายเดือน)", fg: "#FFFFFF", bg: "#2F6F4E", border: "#2F6F4E" },
  reserved: { label: "จอง", fg: "#3A2E12", bg: "#F4C97A", border: "#E8A33D" },
  overdue: { label: "ค้างชำระ", fg: "#FFFFFF", bg: "#C1502E", border: "#C1502E" },
};

function todayStr() { return new Date().toISOString().slice(0, 10); }
function monthStr() { return new Date().toISOString().slice(0, 7); }

function seedUnits() {
  const units = [];

  for (let i = 1; i <= 10; i++) {
    units.push({
      id: `shophouse-${i}`, zone: "shophouse", code: `ห้อง ${i}`, size: "มาตรฐาน",
      status: "vacant", tenantName: "", tenantPhone: "", rent: "", startDate: "", endDate: "",
      rentType: "monthly", payments: [], seed: true,
    });
  }

  const pushDome = (letter, nums) => {
    nums.forEach(i => {
      units.push({
        id: `dome-${letter}${i}`, zone: "dome", code: `${letter}${i}`, size: DOME_GROUPS[letter].size,
        status: "vacant", tenantName: "", tenantPhone: "", rent: "", startDate: "", endDate: "",
        rentType: "daily", payments: [], seed: true,
      });
    });
  };

  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);
  pushDome("A", range(1, 24));
  pushDome("B", [...range(1, 9), ...range(16, 24)]);
  pushDome("C", [...range(1, 9), ...range(16, 24)]);
  pushDome("D", range(1, 14));

  return units;
}

function nextCode(units, zone) {
  const prefix = ZONES[zone].prefix;
  const nums = units.filter(u => u.zone === zone).map(u => {
    const m = u.code.match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}${max + 1}`;
}

function nextDomeCode(units, letter) {
  const nums = units
    .filter(u => u.zone === "dome" && new RegExp(`^${letter}(\\d+)$`).test(u.code))
    .map(u => parseInt(u.code.match(/(\d+)$/)[1], 10));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${letter}${max + 1}`;
}

function displayStatus(unit) {
  if (unit.status !== "occupied" || !ZONES[unit.zone].payLog) return unit.status;
  const payments = unit.payments || [];
  if (unit.rentType === "daily") {
    return payments.some(p => p.date === todayStr()) ? "occupiedDaily" : "overdue";
  }
  return payments.some(p => p.date === monthStr()) ? "occupiedMonthly" : "overdue";
}

function normalizeDbUnit(unit) {
  return {
    id: unit.id,
    zone: unit.zone,
    code: unit.code,
    size: unit.size || "-",
    status: unit.status || "vacant",
    tenantName: unit.tenant_name ?? unit.tenantName ?? "",
    tenantPhone: unit.tenant_phone ?? unit.tenantPhone ?? "",
    rent: unit.rent ?? "",
    startDate: unit.start_date ?? unit.startDate ?? "",
    endDate: unit.end_date ?? unit.endDate ?? "",
    occupiedDate: unit.occupied_date ?? unit.occupiedDate ?? null,
    rentType: unit.rent_type ?? unit.rentType ?? "monthly",
    payments: Array.isArray(unit.payments) ? unit.payments : [],
    seed: Boolean(unit.seed),
  };
}

function toDbUnit(unit) {
  return {
    id: unit.id,
    zone: unit.zone,
    code: unit.code,
    size: unit.size || "-",
    status: unit.status || "vacant",
    tenant_name: unit.tenantName ?? "",
    tenant_phone: unit.tenantPhone ?? "",
    rent: unit.rent ?? "",
    start_date: unit.startDate ?? "",
    end_date: unit.endDate ?? "",
    occupied_date: unit.occupiedDate ?? null,
    rent_type: unit.rentType ?? "monthly",
    payments: Array.isArray(unit.payments) ? unit.payments : [],
    seed: Boolean(unit.seed),
  };
}

async function readStoredUnits() {
  try {
    if (supabase) {
      const { data, error } = await supabase.from("units").select("*");
      if (!error && Array.isArray(data)) {
        return data.map(normalizeDbUnit);
      }
      console.warn("Supabase read failed, falling back to local storage:", error);
    }

    if (typeof window === "undefined") return null;
    if (window.storage && typeof window.storage.get === "function") {
      const res = await window.storage.get(STORAGE_KEY, false);
      if (res && res.value) return JSON.parse(res.value);
      return null;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      }
    } catch (_) {}
    return null;
  }
}

async function writeStoredUnits(data) {
  try {
    if (supabase) {
      const dbRows = data.map(toDbUnit);
      const { error } = await supabase.from("units").upsert(dbRows, { onConflict: "id" });
      if (!error) return true;
      console.warn("Supabase write failed, falling back to local storage:", error);
    }

    if (typeof window === "undefined") return false;
    if (window.storage && typeof window.storage.set === "function") {
      const result = await window.storage.set(STORAGE_KEY, JSON.stringify(data), false);
      return !!result;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
      }
    } catch (_) {}
    return false;
  }
}

export default function App() {
  const [units, setUnits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeZone, setActiveZone] = useState("overview");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const stored = await readStoredUnits();
        let list;
        let isFresh = false;

        if (stored && Array.isArray(stored) && stored.length) {
          list = stored.map(u => ({ rentType: "monthly", payments: [], occupiedDate: null, ...u }));
        } else {
          list = seedUnits();
          isFresh = true;
        }

        const today = todayStr();
        let changed = false;
        list = list.map(u => {
          if (u.zone !== "shophouse" && u.rentType === "daily" && u.status === "occupied" && u.occupiedDate !== today) {
            changed = true;
            return { ...u, status: "vacant", tenantName: "", tenantPhone: "", occupiedDate: null };
          }
          return u;
        });

        setUnits(list);
        if (isFresh || changed) {
          await writeStoredUnits(list);
        }
      } catch (error) {
        const seeded = seedUnits();
        setUnits(seeded);
        try {
          await writeStoredUnits(seeded);
        } catch (_) {}
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setUnits(next);
    const ok = await writeStoredUnits(next);
    if (!ok) showToast("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  const zoneUnits = useMemo(() => {
    if (!units) return [];
    let list = units.filter(u => u.zone === activeZone);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(u =>
        u.code.toLowerCase().includes(q) ||
        (u.tenantName || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      const la = a.code.match(/^[A-Za-z]+/); const lb = b.code.match(/^[A-Za-z]+/);
      const pa = la ? la[0] : ""; const pb = lb ? lb[0] : "";
      if (pa !== pb) return pa.localeCompare(pb);
      const na = parseInt((a.code.match(/\d+/) || ["0"])[0], 10);
      const nb = parseInt((b.code.match(/\d+/) || ["0"])[0], 10);
      return na - nb;
    });
  }, [units, activeZone, search]);

  const counts = useMemo(() => {
    if (!units) return {};
    const out = {};
    const occupiedLike = new Set(["occupied", "occupiedDaily", "occupiedMonthly", "overdue"]);
    Object.keys(ZONES).forEach(z => {
      const list = units.filter(u => u.zone === z);
      out[z] = {
        total: list.length,
        occupied: list.filter(u => occupiedLike.has(displayStatus(u))).length,
      };
    });
    return out;
  }, [units]);

  const overview = useMemo(() => {
    if (!units) return null;
    const today = todayStr(); const month = monthStr();
    const byZone = {};
    let todayCollected = 0, monthCollected = 0;
    const todayPayments = [], monthPayments = [];
    const occupiedLike = new Set(["occupied", "occupiedDaily", "occupiedMonthly", "overdue"]);

    Object.keys(ZONES).forEach(z => {
      const list = units.filter(u => u.zone === z);
      const byStatus = { vacant: 0, occupied: 0, occupiedDaily: 0, occupiedMonthly: 0, reserved: 0, overdue: 0 };
      let rentSum = 0;
      list.forEach(u => {
        const ds = displayStatus(u);
        if (byStatus[ds] !== undefined) byStatus[ds]++;
        if (occupiedLike.has(ds) && u.rent) rentSum += parseFloat(u.rent) || 0;
        (u.payments || []).forEach(p => {
          const amt = parseFloat(p.amount) || 0;
          const entry = { code: u.code, zone: u.zone, tenantName: u.tenantName, rentType: u.rentType, amount: amt, date: p.date };
          if (p.date === today) { todayCollected += amt; todayPayments.push(entry); }
          if (p.date === month || (p.date && p.date.startsWith(month))) { monthCollected += amt; monthPayments.push(entry); }
        });
      });
      byZone[z] = { total: list.length, byStatus, rentSum };
    });

    const totals = { total: 0, vacant: 0, occupied: 0, reserved: 0, overdue: 0, rentSum: 0 };
    Object.values(byZone).forEach(z => {
      totals.total += z.total;
      totals.vacant += z.byStatus.vacant;
      totals.occupied += z.byStatus.occupied + z.byStatus.occupiedDaily + z.byStatus.occupiedMonthly;
      totals.reserved += z.byStatus.reserved;
      totals.overdue += z.byStatus.overdue;
      totals.rentSum += z.rentSum;
    });
    return { byZone, totals, todayCollected, monthCollected, todayPayments, monthPayments };
  }, [units]);

  function updateUnit(id, patch) {
    const next = units.map(u => {
      if (u.id !== id) return u;
      const merged = { ...u, ...patch };
      if (merged.zone !== "shophouse" && merged.rentType === "daily" && merged.status === "occupied") {
        merged.occupiedDate = todayStr();
      }
      return merged;
    });
    persist(next);
  }

  function addPayment(id, payment) {
    const next = units.map(u => {
      if (u.id !== id) return u;
      const updated = { ...u, payments: [...(u.payments || []), payment] };
      if (updated.rentType === "daily") updated.occupiedDate = todayStr();
      return updated;
    });
    persist(next);
    showToast("บันทึกการรับเงินแล้ว");
  }

  function removePayment(id, paymentId) {
    const next = units.map(u => u.id === id ? { ...u, payments: (u.payments || []).filter(p => p.id !== paymentId) } : u);
    persist(next);
  }

  function addUnit(payload) {
    const id = `${payload.zone}-new-${Date.now()}`;
    const unit = {
      id, zone: payload.zone, code: payload.code, size: payload.size,
      status: "vacant", tenantName: "", tenantPhone: "", rent: payload.rent || "",
      startDate: "", endDate: "", rentType: payload.rentType || "monthly", payments: [], seed: false,
    };
    persist([...units, unit]);
    setAddOpen(false);
    setActiveZone(payload.zone);
    showToast(`เพิ่ม ${payload.code} แล้ว`);
  }

  function deleteUnit(id) {
    persist(units.filter(u => u.id !== id));
    setSelected(null);
    showToast("ลบช่องเช่าแล้ว");
  }

  const selectedUnit = selected ? units?.find(u => u.id === selected) : null;

  return (
    <div style={{ background: "#F2F4F1", minHeight: "100vh", fontFamily: "'Noto Sans Thai', sans-serif", color: "#1F2A24" }}>
      <style>{`
        @import url('${FONT_LINK}');
        .disp { font-family: 'Noto Serif Thai', serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        * { box-sizing: border-box; }
        button { font-family: inherit; }
        input, select { font-family: inherit; }
        .cell { transition: transform .12s ease, box-shadow .12s ease; }
        .cell:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(31,42,36,0.12); }
        .cell:focus-visible, button:focus-visible { outline: 2px solid #2F6F4E; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .cell { transition: none; } }
      `}</style>

      <header style={{ borderBottom: "1px solid #D8DED9", background: "#FFFFFF" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PentaPLogo size={46} />
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontSize: 23, fontWeight: 800, color: "#1F2A24", letterSpacing: 0.2 }}>Penta P</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#5C6B60" }}>เพนต้า พี ฟาร์ม · ระบบบันทึกการเช่าพื้นที่ตลาด</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 4, marginTop: 18, overflowX: "auto" }}>
            <button
              onClick={() => { setActiveZone("overview"); setSearch(""); }}
              style={{
                padding: "10px 16px", border: "none", background: "transparent",
                borderBottom: activeZone === "overview" ? "3px solid #1F2A24" : "3px solid transparent",
                cursor: "pointer", minWidth: 110, textAlign: "left",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: activeZone === "overview" ? "#1F2A24" : "#5C6B60" }}>ภาพรวม</div>
              <div className="mono" style={{ fontSize: 11.5, color: "#8A9A8E", marginTop: 2 }}>ทุกโซน</div>
            </button>
            {Object.entries(ZONES).map(([key, z]) => {
              const active = activeZone === key;
              const c = counts[key] || { total: 0, occupied: 0 };
              return (
                <button
                  key={key}
                  onClick={() => { setActiveZone(key); setSearch(""); }}
                  style={{
                    padding: "10px 16px", border: "none", background: "transparent",
                    borderBottom: active ? `3px solid ${z.color}` : "3px solid transparent",
                    cursor: "pointer", minWidth: 140, textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: active ? "#1F2A24" : "#5C6B60" }}>{z.label}</div>
                  <div className="mono" style={{ fontSize: 11.5, color: "#8A9A8E", marginTop: 2 }}>{c.occupied}/{c.total} ช่องเช่าแล้ว</div>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px 80px" }}>
        {activeZone === "overview" ? (
          loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8A9A8E" }}>กำลังโหลดข้อมูล…</div>
          ) : (
            <Overview overview={overview} />
          )
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "1 1 220px" }}>
                <Search size={16} color="#8A9A8E" style={{ position: "absolute", left: 12, top: 11 }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ค้นหารหัสช่องหรือชื่อผู้เช่า"
                  style={{
                    width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8,
                    border: "1px solid #D8DED9", fontSize: 13.5, background: "#FFFFFF",
                  }}
                />
              </div>
              <button
                onClick={() => setAddOpen(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "9px 16px",
                  background: "#2F6F4E", color: "#fff", border: "none", borderRadius: 8,
                  fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                }}
              >
                <Plus size={16} /> เพิ่มช่องใหม่
              </button>
            </div>

            <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
              {(ZONES[activeZone].payLog
                ? ["vacant", "occupiedDaily", "occupiedMonthly", "reserved", "overdue"]
                : ["vacant", "occupied", "reserved", "overdue"]
              ).map(k => {
                const s = STATUS[k];
                return (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#5C6B60" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: s.bg, border: `1px solid ${s.border}`, display: "inline-block" }} />
                    {s.label}
                  </div>
                );
              })}
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#8A9A8E" }}>กำลังโหลดข้อมูล…</div>
            ) : zoneUnits.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "#8A9A8E", border: "1px dashed #D8DED9", borderRadius: 12, background: "#FFFFFF" }}>
                <p style={{ margin: 0, fontSize: 14 }}>ยังไม่มีช่องเช่าในโซนนี้ กด "เพิ่มช่องใหม่" เพื่อเริ่มต้น</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10 }}>
                {zoneUnits.map(u => {
                  const ds = displayStatus(u);
                  const s = STATUS[ds];
                  return (
                    <button
                      key={u.id}
                      className="cell"
                      onClick={() => setSelected(u.id)}
                      style={{
                        background: s.bg, color: s.fg, border: `1.5px solid ${s.border}`,
                        borderRadius: 10, padding: "12px 8px", cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <div className="mono" style={{ fontSize: 13.5, fontWeight: 700 }}>{u.code}</div>
                      <div style={{ fontSize: 10.5, opacity: 0.85, marginTop: 4, lineHeight: 1.3 }}>{u.size}</div>
                      <div style={{ fontSize: 10.5, marginTop: 6, fontWeight: 600 }}>{s.label}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {selectedUnit && (
        <UnitDrawer
          unit={selectedUnit}
          onClose={() => setSelected(null)}
          onSave={(patch) => { updateUnit(selectedUnit.id, patch); showToast("บันทึกข้อมูลแล้ว"); }}
          onDelete={() => deleteUnit(selectedUnit.id)}
          onAddPayment={(payment) => addPayment(selectedUnit.id, payment)}
          onRemovePayment={(paymentId) => removePayment(selectedUnit.id, paymentId)}
        />
      )}

      {addOpen && (
        <AddUnitModal
          units={units}
          defaultZone={activeZone === "overview" ? "shophouse" : activeZone}
          onClose={() => setAddOpen(false)}
          onAdd={addUnit}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#1F2A24", color: "#fff", padding: "10px 18px", borderRadius: 8,
          fontSize: 13, boxShadow: "0 8px 20px rgba(0,0,0,0.2)", zIndex: 60,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function Overview({ overview }) {
  if (!overview) return null;
  const { byZone, totals, todayCollected, monthCollected, todayPayments, monthPayments } = overview;
  const occupancyPct = totals.total ? Math.round(((totals.occupied + totals.overdue) / totals.total) * 100) : 0;
  const [openToday, setOpenToday] = useState(false);
  const [openMonth, setOpenMonth] = useState(false);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard label="ช่องเช่าทั้งหมด" value={totals.total} />
        <StatCard label="เช่าแล้ว" value={totals.occupied} accent="#2F6F4E" />
        <StatCard label="ว่าง" value={totals.vacant} accent="#5C6B60" />
        <StatCard label="จอง" value={totals.reserved} accent="#E8A33D" />
        <StatCard label="ค้างชำระ" value={totals.overdue} accent="#C1502E" />
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ flex: "1 1 220px", background: "#FFFFFF", border: "1px solid #D8DED9", borderRadius: 12, padding: 18 }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: "#5C6B60", fontWeight: 600 }}>อัตราการเช่าโดยรวม</p>
          <p className="disp" style={{ margin: 0, fontSize: 30, fontWeight: 700 }}>{occupancyPct}%</p>
          <div style={{ height: 8, background: "#F2F4F1", borderRadius: 4, marginTop: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${occupancyPct}%`, background: "#2F6F4E" }} />
          </div>
        </div>
        <div style={{ flex: "1 1 220px", background: "#FFFFFF", border: "1px solid #D8DED9", borderRadius: 12, padding: 18 }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: "#5C6B60", fontWeight: 600 }}>ค่าเช่าคาดการณ์รวม/เดือน (บาท)</p>
          <p className="mono" style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>{totals.rentSum.toLocaleString("th-TH")}</p>
          <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "#8A9A8E" }}>ประเมินจากอัตราค่าเช่าที่กรอกไว้ ไม่ใช่ยอดที่เก็บได้จริง</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        <button
          onClick={() => setOpenToday(v => !v)}
          style={{ flex: "1 1 220px", background: "#2F6F4E", borderRadius: 12, padding: 18, color: "#fff", border: "none", cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Coins size={14} />
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, opacity: 0.9 }}>รับเงินจริงวันนี้ (รายวัน)</p>
          </div>
          <p className="mono" style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>{todayCollected.toLocaleString("th-TH")} บาท</p>
          <p style={{ margin: "6px 0 0", fontSize: 11, opacity: 0.85 }}>{openToday ? "ซ่อนรายการ ▲" : `ดูรายการ (${todayPayments.length}) ▾`}</p>
        </button>
        <button
          onClick={() => setOpenMonth(v => !v)}
          style={{ flex: "1 1 220px", background: "#1F2A24", borderRadius: 12, padding: 18, color: "#fff", border: "none", cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Coins size={14} />
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, opacity: 0.9 }}>รับเงินจริงเดือนนี้ (รวมรายวัน+รายเดือน)</p>
          </div>
          <p className="mono" style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>{monthCollected.toLocaleString("th-TH")} บาท</p>
          <p style={{ margin: "6px 0 0", fontSize: 11, opacity: 0.85 }}>{openMonth ? "ซ่อนรายการ ▲" : `ดูรายการ (${monthPayments.length}) ▾`}</p>
        </button>
      </div>

      {openToday && <PaymentList title="รายการรับเงินวันนี้" payments={todayPayments} dateFormat="day" />}
      {openMonth && <PaymentList title="รายการรับเงินเดือนนี้" payments={monthPayments} dateFormat="month" />}

      <p style={{ fontSize: 13, fontWeight: 600, color: "#5C6B60", margin: "0 0 10px" }}>แยกตามโซน</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        {Object.entries(ZONES).map(([key, z]) => {
          const d = byZone[key];
          const occTotal = d.byStatus.occupied + d.byStatus.occupiedDaily + d.byStatus.occupiedMonthly;
          const pct = d.total ? Math.round(((occTotal + d.byStatus.overdue) / d.total) * 100) : 0;
          return (
            <div key={key} style={{ background: "#FFFFFF", border: "1px solid #D8DED9", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{z.label}</span>
                <span className="mono" style={{ fontSize: 12, color: "#8A9A8E" }}>{d.total} ช่อง</span>
              </div>
              <div style={{ height: 6, background: "#F2F4F1", borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: z.color }} />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 11.5, color: "#5C6B60", flexWrap: "wrap" }}>
                {z.payLog ? (
                  <>
                    <span>เช่าแล้ว(รายวัน) {d.byStatus.occupiedDaily}</span>
                    <span>เช่าแล้ว(รายเดือน) {d.byStatus.occupiedMonthly}</span>
                  </>
                ) : (
                  <span>เช่าแล้ว {d.byStatus.occupied}</span>
                )}
                <span>ว่าง {d.byStatus.vacant}</span>
                <span>จอง {d.byStatus.reserved}</span>
                <span style={{ color: d.byStatus.overdue ? "#C1502E" : "#5C6B60", fontWeight: d.byStatus.overdue ? 700 : 400 }}>ค้างชำระ {d.byStatus.overdue}</span>
              </div>
              <p className="mono" style={{ margin: "10px 0 0", fontSize: 12.5, color: "#1F2A24" }}>{d.rentSum.toLocaleString("th-TH")} บาท/เดือน (คาดการณ์)</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaymentList({ title, payments, dateFormat }) {
  const sorted = [...payments].sort((a, b) => b.date.localeCompare(a.date));
  const total = payments.reduce((s, p) => s + p.amount, 0);
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #D8DED9", borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{title}</p>
        <span className="mono" style={{ fontSize: 12, color: "#8A9A8E" }}>{payments.length} รายการ</span>
      </div>
      {sorted.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12.5, color: "#8A9A8E" }}>ยังไม่มีรายการรับเงิน</p>
      ) : (
        <div style={{ maxHeight: 260, overflowY: "auto" }}>
          {sorted.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #F2F4F1", fontSize: 12.5 }}>
              <div>
                <span className="mono" style={{ fontWeight: 700 }}>{p.code}</span>
                <span style={{ color: "#8A9A8E", marginLeft: 8 }}>{ZONES[p.zone].label}</span>
                {p.tenantName && <span style={{ color: "#5C6B60", marginLeft: 8 }}>· {p.tenantName}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="mono" style={{ color: "#8A9A8E", fontSize: 11 }}>{dateFormat === "day" ? p.date : p.date.slice(0, 7)}</span>
                <span className="mono" style={{ fontWeight: 700 }}>{p.amount.toLocaleString("th-TH")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid #D8DED9" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#5C6B60" }}>รวม</span>
        <span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{total.toLocaleString("th-TH")} บาท</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = "#1F2A24" }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #D8DED9", borderRadius: 12, padding: "14px 16px" }}>
      <p style={{ margin: "0 0 4px", fontSize: 11.5, color: "#5C6B60", fontWeight: 600 }}>{label}</p>
      <p className="disp" style={{ margin: 0, fontSize: 24, fontWeight: 700, color: accent }}>{value}</p>
    </div>
  );
}

function PentaPLogo({ size = 40 }) {
  const petalColors = ["#1F6B3B", "#8CC63F", "#F5D76E", "#6FA24A", "#F4A93B"];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {petalColors.map((color, i) => (
        <ellipse
          key={i}
          cx="50" cy="27" rx="13.5" ry="23"
          fill={color}
          transform={`rotate(${-90 + i * 72} 50 50)`}
        />
      ))}
    </svg>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, color: "#5C6B60", marginBottom: 5, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 11px", borderRadius: 7, border: "1px solid #D8DED9",
  fontSize: 13.5, background: "#FFFFFF",
};

function UnitDrawer({ unit, onClose, onSave, onDelete, onAddPayment, onRemovePayment }) {
  const [form, setForm] = useState({ ...unit });
  useEffect(() => { setForm({ ...unit }); }, [unit.id]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const usesPayLog = ZONES[unit.zone].payLog;
  const ds = displayStatus(unit);

  const [payAmount, setPayAmount] = useState(unit.rent || "");
  useEffect(() => { setPayAmount(unit.rent || ""); }, [unit.id, unit.rent]);

  const period = unit.rentType === "daily" ? todayStr() : monthStr();
  const alreadyPaid = (unit.payments || []).some(p => p.date === period);

  function recordPayment() {
    if (alreadyPaid) return;
    onAddPayment({ id: `pay-${Date.now()}`, date: period, amount: payAmount || unit.rent || "0" });
  }

  const sortedPayments = [...(unit.payments || [])].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(31,42,36,0.35)", zIndex: 50, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: "min(400px, 100%)", background: "#F2F4F1", height: "100%", overflowY: "auto", padding: 22, boxShadow: "-8px 0 24px rgba(0,0,0,0.15)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div className="mono" style={{ fontSize: 19, fontWeight: 700 }}>{unit.code}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}><X size={20} color="#5C6B60" /></button>
        </div>
        <p style={{ margin: "0 0 20px", fontSize: 12.5, color: "#8A9A8E" }}>{ZONES[unit.zone].label} · {unit.size}</p>

        <Field label="สถานะผู้เช่า">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(usesPayLog ? ["vacant", "occupied", "reserved"] : Object.keys(STATUS)).map(k => {
              const s = STATUS[k];
              const isActiveDisplay = form.status === k;
              return (
                <button
                  key={k}
                  onClick={() => setForm({ ...form, status: k })}
                  style={{
                    padding: "7px 12px", borderRadius: 7, fontSize: 12.5, cursor: "pointer",
                    border: `1.5px solid ${s.border}`, background: isActiveDisplay ? s.bg : "#fff",
                    color: isActiveDisplay ? s.fg : "#5C6B60", fontWeight: 600,
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          {usesPayLog && form.status === "occupied" && (
            <p style={{ margin: "8px 0 0", fontSize: 11.5, color: ds === "overdue" ? "#C1502E" : "#5C6B60" }}>
              {ds === "overdue" ? `ยังไม่รับเงิน${unit.rentType === "daily" ? "วันนี้" : "เดือนนี้"}` : `รับเงิน${unit.rentType === "daily" ? "วันนี้" : "เดือนนี้"}แล้ว`}
            </p>
          )}
        </Field>

        {usesPayLog && (
          <Field label="รูปแบบการเช่า">
            <div style={{ display: "flex", gap: 6 }}>
              {[['daily', 'รายวัน'], ['monthly', 'รายเดือน']].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setForm({ ...form, rentType: k })}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 7, fontSize: 12.5, cursor: "pointer", fontWeight: 600,
                    border: `1.5px solid ${form.rentType === k ? "#2F6F4E" : "#D8DED9"}`,
                    background: form.rentType === k ? "#2F6F4E" : "#fff",
                    color: form.rentType === k ? "#fff" : "#5C6B60",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
        )}

        <Field label="ชื่อผู้เช่า"><input style={inputStyle} value={form.tenantName} onChange={set("tenantName")} placeholder="ชื่อ-นามสกุล / ชื่อร้าน" /></Field>
        <Field label="เบอร์โทรผู้เช่า"><input style={inputStyle} value={form.tenantPhone} onChange={set("tenantPhone")} placeholder="0xx-xxx-xxxx" /></Field>
        <Field label={usesPayLog ? `ค่าเช่า (บาท/${form.rentType === "daily" ? "วัน" : "เดือน"})` : "ค่าเช่า/เดือน (บาท)"}>
          <input style={inputStyle} type="number" value={form.rent} onChange={set("rent")} placeholder="0" />
        </Field>

        {!usesPayLog && (
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Field label="วันเริ่มสัญญา"><input style={inputStyle} type="date" value={form.startDate} onChange={set("startDate")} /></Field></div>
            <div style={{ flex: 1 }}><Field label="วันสิ้นสุดสัญญา"><input style={inputStyle} type="date" value={form.endDate} onChange={set("endDate")} /></Field></div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 10, marginBottom: usesPayLog ? 26 : 0 }}>
          <button
            onClick={() => onSave(form)}
            style={{ flex: 1, padding: "10px 0", background: "#2F6F4E", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}
          >
            บันทึกการเปลี่ยนแปลง
          </button>
        </div>

        {usesPayLog && unit.status === "occupied" && (
          <div style={{ background: "#FFFFFF", border: "1px solid #D8DED9", borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700 }}>รับเงิน{unit.rentType === "daily" ? "รายวัน" : "รายเดือน"}</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input style={{ ...inputStyle, flex: 1 }} type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="จำนวนเงิน" />
              <button
                onClick={recordPayment}
                disabled={alreadyPaid}
                style={{
                  padding: "0 14px", borderRadius: 7, border: "none", fontSize: 12.5, fontWeight: 600,
                  background: alreadyPaid ? "#B9C4BC" : "#2F6F4E", color: "#fff",
                  cursor: alreadyPaid ? "not-allowed" : "pointer", whiteSpace: "nowrap",
                }}
              >
                {alreadyPaid ? "รับแล้ว" : `รับเงิน${unit.rentType === "daily" ? "วันนี้" : "เดือนนี้"}`}
              </button>
            </div>

            {sortedPayments.length > 0 && (
              <div style={{ maxHeight: 180, overflowY: "auto" }}>
                {sortedPayments.map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #F2F4F1" }}>
                    <span className="mono" style={{ fontSize: 12 }}>{p.date}</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{Number(p.amount).toLocaleString("th-TH")} บาท</span>
                    <button onClick={() => onRemovePayment(p.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                      <Trash2 size={13} color="#8A9A8E" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {sortedPayments.length === 0 && <p style={{ margin: 0, fontSize: 11.5, color: "#8A9A8E" }}>ยังไม่มีประวัติการรับเงิน</p>}
          </div>
        )}

        {!unit.seed && (
          <button
            onClick={onDelete}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#C1502E", fontSize: 12.5, cursor: "pointer", padding: 4 }}
          >
            <Trash2 size={14} /> ลบช่องนี้ออก
          </button>
        )}
      </div>
    </div>
  );
}

function AddUnitModal({ units, defaultZone, onClose, onAdd }) {
  const [zone, setZone] = useState(defaultZone);
  const [domeGroup, setDomeGroup] = useState("A");
  const [size, setSize] = useState(zone === "shophouse" ? "มาตรฐาน" : "");
  const [customSize, setCustomSize] = useState("");
  const [rent, setRent] = useState("");
  const [rentType, setRentType] = useState("daily");

  const suggestedCode = useMemo(() => {
    if (zone === "dome") return nextDomeCode(units, domeGroup);
    return nextCode(units, zone);
  }, [units, zone, domeGroup]);

  const [code, setCode] = useState(suggestedCode);

  useEffect(() => {
    if (zone === "dome") {
      setCode(nextDomeCode(units, domeGroup));
      setSize(DOME_GROUPS[domeGroup].size);
    } else {
      setCode(nextCode(units, zone));
      setSize(zone === "shophouse" ? "มาตรฐาน" : "");
    }
  }, [zone, domeGroup]);

  const finalSize = size === "__custom" ? customSize : size;
  const usesPayLog = ZONES[zone].payLog;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(31,42,36,0.35)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(420px, 100%)", background: "#FFFFFF", borderRadius: 14, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 className="disp" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>เพิ่มช่องเช่าใหม่</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color="#5C6B60" /></button>
        </div>

        <Field label="โซน">
          <select style={inputStyle} value={zone} onChange={e => setZone(e.target.value)}>
            {Object.entries(ZONES).map(([k, z]) => <option key={k} value={k}>{z.label}</option>)}
          </select>
        </Field>

        {zone === "dome" && (
          <Field label="กลุ่มโดม">
            <select style={inputStyle} value={domeGroup} onChange={e => setDomeGroup(e.target.value)}>
              <option value="A">กลุ่ม A — 1.5×3 ม.</option>
              <option value="B">กลุ่ม B — 1.5×3 ม.</option>
              <option value="C">กลุ่ม C — 1.5×3 ม.</option>
              <option value="D">กลุ่ม D — 3×3 ม.</option>
            </select>
          </Field>
        )}

        <Field label="รหัสช่อง">
          <input style={inputStyle} value={code} onChange={e => setCode(e.target.value)} className="mono" />
        </Field>

        {zone === "shophouse" && (
          <Field label="ขนาดพื้นที่">
            <select style={inputStyle} value={size} onChange={e => setSize(e.target.value)}>
              <option value="มาตรฐาน">มาตรฐาน</option>
              <option value="__custom">กำหนดขนาดเอง…</option>
            </select>
          </Field>
        )}
        {zone === "outdoor" && (
          <Field label="ขนาดพื้นที่">
            <input style={inputStyle} value={size} onChange={e => setSize(e.target.value)} placeholder="เช่น 4×5 ม." />
          </Field>
        )}
        {size === "__custom" && (
          <Field label="ระบุขนาด">
            <input style={inputStyle} value={customSize} onChange={e => setCustomSize(e.target.value)} placeholder="เช่น 4×5 ม." />
          </Field>
        )}

        {usesPayLog && (
          <Field label="รูปแบบการเช่า">
            <div style={{ display: "flex", gap: 6 }}>
              {[['daily', 'รายวัน'], ['monthly', 'รายเดือน']].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setRentType(k)}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 7, fontSize: 12.5, cursor: "pointer", fontWeight: 600,
                    border: `1.5px solid ${rentType === k ? "#2F6F4E" : "#D8DED9"}`,
                    background: rentType === k ? "#2F6F4E" : "#fff",
                    color: rentType === k ? "#fff" : "#5C6B60",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
        )}

        <Field label={usesPayLog ? `ค่าเช่าเริ่มต้น (บาท/${rentType === "daily" ? "วัน" : "เดือน"}) — ไม่บังคับ` : "ค่าเช่าเริ่มต้น/เดือน (บาท) — ไม่บังคับ"}>
          <input style={inputStyle} type="number" value={rent} onChange={e => setRent(e.target.value)} placeholder="0" />
        </Field>

        <button
          onClick={() => code.trim() && onAdd({ zone, code: code.trim(), size: finalSize || "-", rent, rentType })}
          disabled={!code.trim()}
          style={{
            width: "100%", padding: "11px 0", marginTop: 6, background: code.trim() ? "#2F6F4E" : "#B9C4BC",
            color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13.5,
            cursor: code.trim() ? "pointer" : "not-allowed",
          }}
        >
          เพิ่มช่องเช่า
        </button>
      </div>
    </div>
  );
}
