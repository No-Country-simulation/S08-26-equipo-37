import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Dataset integrity check.
 *
 * The dataset (`datos/dataset_mantenimiento_predictivo_realista.csv`) is stored
 * with Git LFS. A clone, a repository ZIP download or a raw URL without
 * `git-lfs` returns a three-line pointer instead of the CSV, so this check
 * fails loudly with the recovery command instead of validating the pointer.
 *
 * Usage:
 *   node scripts/validate-dataset.mjs [path-to-csv]
 *
 * The expected values below describe the agreed dataset version. Update them,
 * and document the change in docs/DATA-STRATEGY.md, when the dataset changes.
 */
const datasetPath = resolve(
  process.cwd(),
  process.argv[2] ?? "datos/dataset_mantenimiento_predictivo_realista.csv",
);

const pointerPrefix = "version https://git-lfs.github.com/spec/v1";
const minimumSize = 1_000_000; // a Git LFS pointer is ~133 bytes; the real file is ~16 MB

const expectedColumns = [
  "fecha_hora",
  "id_maquina",
  "tipo_equipo",
  "modelo",
  "linea_produccion",
  "antiguedad_anos",
  "criticidad",
  "costo_parada_hora_usd",
  "potencia_nominal_kw",
  "marca",
  "horas_operacion_totales",
  "ciclos_acumulados",
  "horas_desde_ultimo_mantenimiento",
  "conteo_fallas_previas",
  "estado_operativo",
  "carga_pct",
  "velocidad_rpm",
  "voltaje_v",
  "corriente_a",
  "potencia_consumida_kw",
  "temperatura_c",
  "vibracion_mms",
  "presion_bar",
  "codigo_alarma_plc",
  "falla_inicio_disparo",
  "falla_estado_causa",
  "target_falla_48h",
  "target_tipo_falla",
  "target_rul_horas",
  "target_estado_salud",
];

const expectedRows = 72_000;
const expectedMachines = 25;
const expectedPositives = 7_623;
const expectedDuplicates = 0;

const issues = [];
const results = [];

if (!existsSync(datasetPath)) {
  issues.push(`Dataset not found at ${datasetPath}.`);
} else {
  const { size } = statSync(datasetPath);
  // The delivered dataset uses CRLF line endings: normalise them so neither the
  // header nor the row cells carry a trailing carriage return.
  const content = readFileSync(datasetPath, "utf8").replace(/\r\n/g, "\n");
  const isPointer = content.startsWith(pointerPrefix) || size < minimumSize;

  if (isPointer) {
    issues.push(
      `The dataset at ${datasetPath} is a Git LFS pointer (${size} bytes) instead of the CSV. ` +
        'Install git-lfs and run "git lfs install && git lfs pull" (see docs/DEVELOPMENT.md).',
    );
  } else {
    results.push(`size: ${size} bytes`);

    const lines = content.split("\n");
    const header = (lines.shift() ?? "").split(",").map((column) => column.trim());
    const rows = lines.filter((line) => line.trim() !== "");

    if (header.join(",") !== expectedColumns.join(",")) {
      const missing = expectedColumns.filter((column) => !header.includes(column));
      const unexpected = header.filter((column) => !expectedColumns.includes(column));
      issues.push(
        `Unexpected columns in ${datasetPath}.` +
          (missing.length > 0 ? ` Missing: ${missing.join(", ")}.` : "") +
          (unexpected.length > 0 ? ` Unexpected: ${unexpected.join(", ")}.` : ""),
      );
    } else {
      results.push(`columns: ${header.length}`);
    }

    if (rows.length !== expectedRows) {
      issues.push(`Expected ${expectedRows} data rows but found ${rows.length}.`);
    } else {
      results.push(`rows: ${rows.length}`);
    }

    const machineIndex = header.indexOf("id_maquina");
    const timestampIndex = header.indexOf("fecha_hora");
    const targetIndex = header.indexOf("target_falla_48h");
    const machines = new Set();
    const keys = new Set();
    let positives = 0;
    let duplicates = 0;

    for (const line of rows) {
      const cells = line.split(",").map((value) => value.trim());

      if (machineIndex >= 0) machines.add(cells[machineIndex]);
      if (targetIndex >= 0 && cells[targetIndex] === "1") positives += 1;

      if (machineIndex >= 0 && timestampIndex >= 0) {
        const key = `${cells[machineIndex]}|${cells[timestampIndex]}`;
        if (keys.has(key)) duplicates += 1;
        else keys.add(key);
      }
    }

    if (machines.size !== expectedMachines) {
      issues.push(`Expected ${expectedMachines} machines but found ${machines.size}.`);
    } else {
      results.push(`machines: ${machines.size}`);
    }

    if (positives !== expectedPositives) {
      issues.push(
        `Expected ${expectedPositives} rows with target_falla_48h=1 but found ${positives}.`,
      );
    } else {
      results.push(`rows with target_falla_48h=1: ${positives}`);
    }

    if (duplicates !== expectedDuplicates) {
      issues.push(
        `Expected ${expectedDuplicates} duplicated (id_maquina, fecha_hora) pairs but found ${duplicates}.`,
      );
    } else {
      results.push(`duplicated (id_maquina, fecha_hora) pairs: ${duplicates}`);
    }
  }
}

if (issues.length > 0) {
  console.error("Dataset validation failed:\n");
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log("Dataset validation passed:");
  console.log(`- file: ${datasetPath}`);
  for (const result of results) console.log(`- ${result}`);
}
