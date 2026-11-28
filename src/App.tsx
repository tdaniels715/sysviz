import {useState} from "react";

type Row = {key: string; value: string; changed: boolean};
type Box = {title: string; rows: Row[]};
type Snap = {title: string; boxes: Box[]};

const initial: Snap[] = [
  {
    title: "start",
    boxes: [
      {
        title: "Special Registers", rows: [
          {key: "sp", value: "0x1000", changed: false},
          {key: "x30", value: "β", changed: false},
          {key: "x29", value: "α", changed: false},

        ]
      },
      {
        title: "Registers", rows: [
        ]
      },
      {
        title: "Memory", rows: [
        ]
      },
    ],
  },
];

const BOX_WIDTH = 260;
const input: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  fontFamily: "monospace", fontSize: 12,
};
const code: React.CSSProperties = {
  width: 400, height: 200, boxSizing: "border-box",
  fontFamily: "monospace", fontSize: 12, textAlign: "left",
  color: "#000", background: "#f4f4f4", border: "1px solid #ccc", padding: 8,
  whiteSpace: "pre", overflow: "auto", resize: "vertical",
};
const card: React.CSSProperties = {
  border: "1px solid #888", borderRadius: 6, padding: 12,
  margin: "0 auto 16px", maxWidth: 900,
};

export default function App() {
  const [snaps, setSnaps] = useState<Snap[]>(initial);
  const [cur, setCur] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [name, setName] = useState("sequence");
  const [cpp, setCpp] = useState("");
  const [asm, setAsm] = useState("");
  const snap = snaps[cur];

  // i = snap index, b = box index, r = row index
  function updateSnap(i: number, change: (s: Snap) => Snap) {
    setSnaps(snaps.map((s, k) => (k === i ? change(s) : s)));
  }

  function updateBox(i: number, b: number, change: (box: Box) => Box) {
    updateSnap(i, s => ({
      ...s,
      boxes: s.boxes.map((box, k) => (k === b ? change(box) : box)),
    }));
  }

  function updateRow(i: number, b: number, r: number, change: (row: Row) => Row) {
    updateBox(i, b, box => ({
      ...box,
      rows: box.rows.map((row, k) => (k === r ? change(row) : row)),
    }));
  }

  function addRow(i: number, b: number) {
    updateBox(i, b, box => ({
      ...box,
      rows: [...box.rows, {key: "", value: "", changed: false}],
    }));
  }

  function deleteRow(i: number, b: number, r: number) {
    updateBox(i, b, box => ({...box, rows: box.rows.filter((_, k) => k !== r)}));
  }

  function addSnap(i: number) {
    // copy snap i (arrows cleared) and insert it right after
    const copy: Snap = {
      title: "",
      boxes: snaps[i].boxes.map(box => ({
        ...box,
        rows: box.rows.map(row => ({...row, changed: false})),
      })),
    };
    setSnaps([...snaps.slice(0, i + 1), copy, ...snaps.slice(i + 1)]);
    setCur(i + 1);
  }

  function deleteSnap(i: number) {
    if (snaps.length === 1) return;          // always keep at least one snap
    setSnaps(snaps.filter((_, k) => k !== i));
    setCur(Math.min(cur, snaps.length - 2));
  }

  function keepOnlyThisSnap() {
    if (!window.confirm("Delete all other snaps?")) return;
    setSnaps([snap]);
    setCur(0);
  }

  function save() {
    const blob = new Blob([JSON.stringify({cpp, asm, snaps}, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name || "sequence"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function load(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setName(file.name.replace(/\.json$/i, ""));
    e.target.value = "";
    file.text().then(text => {
      const data = JSON.parse(text);
      const loadedSnaps = Array.isArray(data) ? data : data?.snaps;
      if (Array.isArray(loadedSnaps) && loadedSnaps.length > 0) {
        setSnaps(loadedSnaps);
        setCpp(data.cpp ?? "");
        setAsm(data.asm ?? "");
        setCur(0);
      } else {
        window.alert("No snaps found in this file.");
      }
    });
  }

  // one snap's boxes (plus its title, unless the card header shows it); used by both views
  function renderSnap(s: Snap, i: number, showTitle: boolean) {
    return (
      <>
        {showTitle && (
          <input
            style={{...input, width: 400, fontSize: 14, marginBottom: 12}}
            placeholder="e.g. mov x9, #0x45"
            value={s.title}
            onChange={e => updateSnap(i, x => ({...x, title: e.target.value}))}
          />
        )}
        <div
          style={{
            display: "flex", flexWrap: "wrap", gap: 16,
            alignItems: "flex-start", justifyContent: "center"
          }}>
          {s.boxes.map((box, b) => (
            <div key={b} style={{width: BOX_WIDTH, border: "1px solid #888", padding: 8}}>
              <input
                style={{...input, fontWeight: "bold", marginBottom: 4}}
                value={box.title}
                onChange={e => updateBox(i, b, x => ({...x, title: e.target.value}))}
              />
              <table style={{width: "100%", tableLayout: "fixed"}}>
                <colgroup>
                  <col/>
                  <col/>
                  <col style={{width: 24}}/>
                  <col style={{width: 24}}/>
                </colgroup>
                <tbody>
                {box.rows.map((row, r) => (
                  <tr key={r}>
                    <td>
                      <input
                        style={input} value={row.key}
                        onChange={e => updateRow(i, b, r, x => ({...x, key: e.target.value}))}/>
                    </td>
                    <td>
                      <input
                        style={input} value={row.value}
                        onChange={e => updateRow(i, b, r, x => ({...x, value: e.target.value}))}/>
                    </td>
                    <td>
                      <button
                        style={{
                          border: "none", background: "none", cursor: "pointer",
                          display: "block", margin: "0 auto", padding: 0, lineHeight: 1,
                          transform: "translateY(-6px)",
                          fontSize: 24,
                          color: row.changed ? "#e6b800" : "#888",
                          opacity: row.changed ? 1 : 0.15
                        }}
                        onClick={() => updateRow(i, b, r, x => ({...x, changed: !x.changed}))}
                      >
                        {"⬅︎"}
                      </button>
                    </td>
                    <td>
                      <button
                        style={{border: "none", background: "none", cursor: "pointer", opacity: 0.4}}
                        onClick={() => deleteRow(i, b, r)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
              <button onClick={() => addRow(i, b)}>+ row</button>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div style={{fontFamily: "monospace", padding: 16, textAlign: "center"}}>
      <input
        style={{
          ...input, width: 400, fontSize: 18, fontWeight: "bold",
          textAlign: "center", marginBottom: 8
        }}
        value={name}
        onChange={e => setName(e.target.value)}
      />

      <div
        style={{
          display: "flex", flexWrap: "wrap", gap: 16,
          justifyContent: "center", marginBottom: 12
        }}>
        <textarea
          style={code} placeholder="C++" spellCheck={false} wrap="off"
          value={cpp} onChange={e => setCpp(e.target.value)}/>
        <textarea
          style={code} placeholder="Assembly" spellCheck={false} wrap="off"
          value={asm} onChange={e => setAsm(e.target.value)}/>
      </div>

      <div style={{marginBottom: 12}}>
        <button onClick={() => setShowAll(!showAll)}>
          {showAll ? "single snap view" : "all snaps view"}
        </button>
        {" "}
        {!showAll && (
          <>
            <button disabled={cur === 0} onClick={() => setCur(cur-1)}>◀</button>
            {" "}Snap {cur} / {snaps.length-1}{" "}
            <button disabled={cur === snaps.length - 1} onClick={() => setCur(cur + 1)}>▶</button>
            {" "}
            <button onClick={() => addSnap(cur)}>+ snap</button>
            {" "}
            <button onClick={() => deleteSnap(cur)}>delete snap</button>
            {" "}
            <button onClick={keepOnlyThisSnap}>delete all others</button>
            {" "}
          </>
        )}
        <button onClick={save}>save</button>
        {" "}
        load: <input type="file" accept=".json" onChange={load}/>
      </div>

      {showAll
        ? snaps.map((s, i) => (
          <div key={i} style={card}>
            <div
              style={{
                display: "flex", gap: 8, alignItems: "center",
                justifyContent: "center", marginBottom: 12
              }}>
              <strong>Snap {i}</strong>
              <input
                style={{...input, width: 300, fontSize: 14, fontWeight: "bold"}}
                placeholder="e.g. mov x9, #0x45"
                value={s.title}
                onChange={e => updateSnap(i, x => ({...x, title: e.target.value}))}
              />
              <button onClick={() => addSnap(i)}>+ snap after</button>
              <button onClick={() => deleteSnap(i)}>delete</button>
            </div>
            {renderSnap(s, i, false)}
          </div>
        ))
        : renderSnap(snap, cur, true)}
    </div>
  );
}
