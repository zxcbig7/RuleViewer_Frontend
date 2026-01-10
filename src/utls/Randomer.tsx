
import type {Rule} from "../hooks/useRuleViewerData"
/* ---------- Random Data Generator ---------- */

function makeRandomRules(count: number): Rule[] {
  const phases = ["PH1"];
  const blockTypes = ["Start", "Action", "Decision", "End"];
  const groups = ["G1", "G2", "G3"];

  const rules: Rule[] = [];
  for (let i = 1; i <= count; i++) {
    const phase = pick(phases);
    const blockType = pick(blockTypes);
    const group = pick(groups);

    const ruleName = `Rule_${phase}_${pad2(i)}`;
    const blockName = `Block_${blockType}_${pad2(i)}`;
    const blockSeq = String(i);

    rules.push({
      Phase: phase,
      Rule_Name: ruleName,
      Block_Name: blockName,
      Block_Type: blockType,
      Block_Group: group,
      Block_SEQ: blockSeq,
      KEY: Math.random() > 0.35 ? `K_${phase}_${i}` : null,
      POSX: rand(50, 950),
      POSY: rand(50, 550),
      Pre_Block: i > 1 ? `Block_${pad2(i - 1)}` : null,
      Column1: Math.random() > 0.5 ? "ColumnA" : null,
      Column2: Math.random() > 0.5 ? "ColumnB" : null,
      VALUE1: maybeValue(),
      VALUE2: maybeValue(),
      VALUE3: maybeValue(),
      VALUE4: maybeValue(),
      VALUE5: maybeValue(),
    });
  }
  return rules;
}

function maybeValue(): string | null {
  const pool = ["1", "0", "true", "false", "A", "B", "C", "10", "20", "OK"];
  return Math.random() > 0.45 ? pick(pool) : null;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
export {
  makeRandomRules,
  maybeValue,
  pick,
  rand,
  pad2,
  round1
};