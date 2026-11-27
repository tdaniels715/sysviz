import {useState} from "react";

type Row = {key: string; value: string; changed: boolean};
type Box = {title: string; rows: Row[]};
type Page = {title: string; boxes: Box[]};

const initial: Page[] = [
  {
    title: "start",
    boxes: [
      {
        title: "Special Registers", rows: [
          {key: "PC", value: "0x0000", changed: false},
          {key: "SP", value: "0x8000", changed: false},
          {key: "FLAGS", value: "0000", changed: false},
        ]
      },
      {
        title: "Registers", rows: [
          {key: "sp", value: "0x00", changed: false},
          {key: "x0", value: "0x00", changed: false},
        ]
      },
      {
        title: "Memory", rows: [
          {key: "0x1000", value: "0x00", changed: false},
          {key: "0x1004", value: "0x00", changed: false},
        ]
      },
    ],
  },
  {
    title: "mov R1, 0x2A",
    boxes: [
      {
        title: "Special Registers", rows: [
          {key: "PC", value: "0x0000", changed: false},
          {key: "SP", value: "0x8000", changed: false},
          {key: "FLAGS", value: "0000", changed: false},
        ]
      },
      {
        title: "Registers", rows: [
          {key: "sp", value: "0x00", changed: false},
          {key: "x0", value: "0x2A", changed: true},
        ]
      },
      {
        title: "Memory", rows: [
          {key: "0x1000", value: "0x00", changed: false},
          {key: "0x1004", value: "0x00", changed: false},
        ]
      },
    ],
  },
];

const BOX_WIDTH = 300;
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


export default function App() {
  const [pages, setPages] = useState<Page[]>(initial);
  const [cur, setCur] = useState(0);
  const [name, setName] = useState("sequence");
  const page = pages[cur];
  const [cpp, setCpp] = useState("");
  const [asm, setAsm] = useState("");

  function updatePage(change: (p: Page) => Page) {
    setPages(pages.map((p, i) => (i === cur ? change(p) : p)));
  }

  function updateBox(b: number, change: (box: Box) => Box) {
    updatePage(p => ({
      ...p,
      boxes: p.boxes.map((box, i) => (i === b ? change(box) : box)),
    }));
  }

  function updateRow(b: number, r: number, change: (row: Row) => Row) {
    updateBox(b, box => ({
      ...box,
      rows: box.rows.map((row, j) => (j === r ? change(row) : row)),
    }));
  }

  function addRow(b: number) {
    updateBox(b, box => ({
      ...box,
      rows: [...box.rows, {key: "", value: "", changed: false}],
    }));
  }

  function deleteRow(b: number, r: number) {
    updateBox(b, box => ({ ...box, rows: box.rows.filter((_, j) => j !== r) }));
  }

  function addPage() {
    // copy the current page (arrows cleared) and insert it right after
    const copy: Page = {
      title: "",
      boxes: page.boxes.map(box => ({
        ...box,
        rows: box.rows.map(row => ({...row, changed: false})),
      })),
    };
    setPages([...pages.slice(0, cur + 1), copy, ...pages.slice(cur + 1)]);
    setCur(cur + 1);
  }

  function deletePage() {
    if (pages.length === 1) return;          // always keep at least one page
    setPages(pages.filter((_, i) => i !== cur));
    setCur(Math.max(0, cur - 1));
  }

  function keepOnlyThisPage() {
    if (!window.confirm("Delete all other pages?")) return;
    setPages([page]);
    setCur(0);
  }

  function save() {
    const blob = new Blob([JSON.stringify({ cpp, asm, pages }, null, 2)], { type: "application/json" });
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
    e.target.value = "";                      // lets you re-load the same file later
    file.text().then(text => {
      const data = JSON.parse(text);
      const loadedPages = Array.isArray(data) ? data : data?.pages;  // old files were a bare array
      if (Array.isArray(loadedPages) && loadedPages.length > 0) {
        setPages(loadedPages);
        setCpp(data.cpp ?? "");
        setAsm(data.asm ?? "");
        setCur(0);
      }
    });
  }

  return (
    <div style={{fontFamily: "monospace", padding: 16}}>
      <input
        style={{ ...input, width: 400, fontSize: 18, fontWeight: "bold",
          textAlign: "center", marginBottom: 8 }}
        value={name}
        onChange={e => setName(e.target.value)}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16,
        justifyContent: "center", marginBottom: 12 }}>
        <textarea style={code} placeholder="C++" spellCheck={false} wrap="off"
            value={cpp} onChange={e => setCpp(e.target.value)} />
        <textarea style={code} placeholder="Assembly" spellCheck={false} wrap="off"
                  value={asm} onChange={e => setAsm(e.target.value)} />
      </div>

      <div style={{marginBottom: 8}}>
        <button disabled={cur === 0} onClick={() => setCur(cur - 1)}>◀</button>
        {" "}Page {cur + 1}/{pages.length}{" "}
        <button disabled={cur === pages.length - 1} onClick={() => setCur(cur + 1)}>▶</button>
        {" "}
        <button onClick={addPage}>+page</button>
        {" "}
        <button onClick={deletePage}>delete page</button>
        {" "}
        <button onClick={keepOnlyThisPage}>delete all others</button>
        {" "}
        <button onClick={save}>save</button>
        {" "}
        load: <input type="file" accept=".json" onChange={load}/>
      </div>

      <input
        style={{...input, width: 400, fontSize: 14, marginBottom: 12}}
        placeholder="e.g. mov R1, 0x2A"
        value={page.title}
        onChange={e => updatePage(p => ({...p, title: e.target.value}))}
      />

      <div style={{display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start", justifyContent: "center"}}>
        {page.boxes.map((box, b) => (
          <div key={b} style={{width: BOX_WIDTH, border: "1px solid #888", padding: 8}}>
            <input
              style={{...input, fontWeight: "bold", marginBottom: 4}}
              value={box.title}
              onChange={e => updateBox(b, x => ({...x, title: e.target.value}))}
            />
            <table style={{width: "100%", tableLayout: "fixed"}}>
              <colgroup><col /><col /><col style={{ width: 24 }} /><col style={{ width: 24 }} /></colgroup>
              <tbody>
              {box.rows.map((row, r) => (
                <tr key={r}>
                  <td>
                    <input
                      style={input}
                      value={row.key}
                      onChange={e => updateRow(b, r, x => ({...x, key: e.target.value}))}/>
                  </td>
                  <td>
                    <input
                      style={input}
                      value={row.value}
                      onChange={e => updateRow(b, r, x => ({...x, value: e.target.value}))}/>
                  </td>
                  <td>
                    <button
                      style={{
                        border: "none", background: "none", cursor: "pointer",
                        opacity: row.changed ? 1 : 0.15
                      }}
                      onClick={() => updateRow(b, r, x => ({...x, changed: !x.changed}))}
                    >
                      {"\u2B05\uFE0E"}
                    </button>
                  </td>
                  <td>
                    <button
                      style={{ border: "none", background: "none", cursor: "pointer", opacity: 0.4 }}
                      onClick={() => deleteRow(b, r)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
            <button onClick={() => addRow(b)}>+row</button>
          </div>
        ))}
      </div>
    </div>
  );
}