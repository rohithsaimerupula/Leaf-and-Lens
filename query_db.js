const DB_URL = "https://leaf-and-lens-tharunmerupula.aws-ap-south-1.turso.io/v2/pipeline";
const DB_TOKEN = "Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzkxOTA0NzQsImlkIjoiMDE5ZTNmZmQtM2QwMS03OGMyLTlmNTAtZThiYmJjMmY3N2QzIiwicmlkIjoiZTkwMDMyNTQtMzIwZi00YTJhLWFhYTQtMjM2NzQ0Mjg4OGI1In0.fv4NNmBZhf2nwtdxUnM8dCjBeHQsP8BXvZBHlcjdDumt8wl6RiCSOFFAvqzwnhBQY1deZCXNppT8TfPtrkLzAA";

async function query(sql, args = []) {
  const stmt = args.length > 0 ? { sql, args: args.map(v => v === null ? { type: 'null' } : { type: 'text', value: String(v) }) } : { sql };
  const body = JSON.stringify({
    requests: [
      { type: 'execute', stmt },
      { type: 'close' }
    ]
  });
  const res = await fetch(DB_URL, {
    method: 'POST',
    headers: { 'Authorization': DB_TOKEN, 'Content-Type': 'application/json' },
    body
  });
  const data = await res.json();
  if (data.results[0].type === 'error') {
    throw new Error(data.results[0].error.message);
  }
  return data.results[0].response.result;
}

function parseRows(result) {
  const cols = result.cols.map(c => c.name);
  return result.rows.map(row => {
    const obj = {};
    cols.forEach((col, i) => {
      obj[col] = row[i]?.value ?? row[i] ?? null;
    });
    return obj;
  });
}

async function run() {
  try {
    console.log("1. Running PRAGMA table_info(submissions)...");
    const info = await query("PRAGMA table_info(submissions)");
    console.log(parseRows(info));

    console.log("\n2. Getting sample submissions...");
    const subsRes = await query("SELECT id, teamName, branch, section, length(paymentScreenshotUrl) as screenshot_len, paymentScreenshotUrl FROM submissions LIMIT 5");
    const subs = parseRows(subsRes);
    console.log(subs.map(s => ({
      id: s.id,
      teamName: s.teamName,
      branch: s.branch,
      section: s.section,
      screenshot_len: s.screenshot_len,
      screenshot_val: s.paymentScreenshotUrl ? s.paymentScreenshotUrl.substring(0, 50) + "..." : null
    })));
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
