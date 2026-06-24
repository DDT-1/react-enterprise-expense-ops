import { performance } from "node:perf_hooks";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createServer } from "vite";

const entryCount = 5000;
const iterations = 1000;
const rounds = 7;
const categories = ["差旅交通", "办公采购", "客户招待", "培训学习", "软件订阅", "行政杂费", "设备维修"];
const departments = ["研发部", "市场部", "运营部", "财务部", "人事行政"];
const statuses = ["pending", "approved", "rejected"];
const paymentMethods = ["personal_pay", "company_card", "bank_transfer", "cash"];

function createEntries(count) {
  return Array.from({ length: count }, (_, index) => {
    const status = statuses[index % statuses.length];
    const category = categories[index % categories.length];
    const department = departments[index % departments.length];

    return {
      id: index + 1,
      type: "expense",
      amount: 80 + (index % 70) * 12,
      category,
      note: `${department}${category}申请${index}`,
      date: `2026-06-${String((index % 28) + 1).padStart(2, "0")}`,
      department,
      applicantName: `申请人${index % 30}`,
      receiptNo: `INV-202606-${String(index + 1).padStart(5, "0")}`,
      paymentMethod: paymentMethods[index % paymentMethods.length],
      status,
      rejectReason: status === "rejected" ? "票据信息不完整" : "",
      reviewedAt: status === "pending" ? null : "2026-06-10 10:00:00",
    };
  });
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function runRepeatedCompute(helpers, entries, filters) {
  let checksum = 0;
  const start = performance.now();

  for (let index = 0; index < iterations; index += 1) {
    const summary = helpers.getSummary(entries, 50000);
    const categoryTotals = helpers.getCategoryTotals(entries);
    const filteredEntries = helpers.filterEntries(entries, filters);
    checksum += summary.approvedExpense + categoryTotals.length + filteredEntries.length;
  }

  return {
    ms: performance.now() - start,
    checksum,
  };
}

function runCachedReuse(helpers, entries, filters) {
  let checksum = 0;
  const summary = helpers.getSummary(entries, 50000);
  const categoryTotals = helpers.getCategoryTotals(entries);
  const filteredEntries = helpers.filterEntries(entries, filters);
  const start = performance.now();

  for (let index = 0; index < iterations; index += 1) {
    checksum += summary.approvedExpense + categoryTotals.length + filteredEntries.length;
  }

  return {
    ms: performance.now() - start,
    checksum,
  };
}

const server = await createServer({ logLevel: "silent" });

try {
  const helpers = await server.ssrLoadModule("/src/utils/ledger.ts");
  const entries = createEntries(entryCount);
  const filters = { status: "approved", keyword: "差旅", department: "市场部", date: "" };

  runRepeatedCompute(helpers, entries, filters);
  runCachedReuse(helpers, entries, filters);

  const repeatedRuns = [];
  const cachedRuns = [];

  for (let round = 0; round < rounds; round += 1) {
    repeatedRuns.push(runRepeatedCompute(helpers, entries, filters).ms);
    cachedRuns.push(runCachedReuse(helpers, entries, filters).ms);
  }

  const repeatedMedianMs = median(repeatedRuns);
  const cachedMedianMs = median(cachedRuns);
  const savedMs = repeatedMedianMs - cachedMedianMs;
  const savedPercent = repeatedMedianMs > 0 ? (savedMs / repeatedMedianMs) * 100 : 0;
  const speedup = cachedMedianMs > 0 ? repeatedMedianMs / cachedMedianMs : null;

  const report = {
    generatedAt: new Date().toISOString(),
    scenario: "Same reimbursement records and filters across repeated render-like reads",
    entryCount,
    iterations,
    rounds,
    repeatedComputeMedianMs: Number(repeatedMedianMs.toFixed(3)),
    cachedReuseMedianMs: Number(cachedMedianMs.toFixed(3)),
    savedMs: Number(savedMs.toFixed(3)),
    savedPercent: Number(savedPercent.toFixed(4)),
    speedup: speedup ? Number(speedup.toFixed(1)) : null,
    repeatedRunsMs: repeatedRuns.map((value) => Number(value.toFixed(3))),
    cachedRunsMs: cachedRuns.map((value) => Number(value.toFixed(3))),
  };

  await writeFile(join(process.cwd(), "dist", "ledger-perf-report.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log("Reimbursement dashboard calculation benchmark");
  console.table([
    { mode: "repeated compute", median: `${report.repeatedComputeMedianMs} ms` },
    { mode: "cached reuse", median: `${report.cachedReuseMedianMs} ms` },
  ]);
  console.log(`Saved: ${report.savedMs} ms (${report.savedPercent}%)`);
  console.log(`Report: dist/ledger-perf-report.json`);
} finally {
  await server.close();
}
