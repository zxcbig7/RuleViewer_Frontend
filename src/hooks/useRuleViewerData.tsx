
export type RuleUsed = {
  Phase: string;
  Rule_Name: string;
  Block_Name: string;
  Block_Type: string;
  Block_Group: string;
  Block_SEQ: string;
  KEY?: string | null;
  POSX: number;
  POSY: number;
  Pre_Block?: string | null;
  Column1?: string | null;
  Column2?: string | null;
  VALUE?: string | null;
};

export type Rule = {
  Phase: string;
  Rule_Name: string;
  Block_Name: string;
  Block_Type: string;
  Block_Group: string;
  Block_SEQ: string;
  KEY?: string | null;
  POSX: number;
  POSY: number;
  Pre_Block?: string | null;
  Column1?: string | null;
  Column2?: string | null;
  VALUE1?: string | null;
  VALUE2?: string | null;
  VALUE3?: string | null;
  VALUE4?: string | null;
  VALUE5?: string | null;
};

export type RuleDTO = {
  phase: string;
  rule_Name: string;
  block_Name: string;
  block_Type: "START" | "PROCESS" | "DECISION" | "END";
  block_Group: string;
  block_SEQ: string;
  key: string | null;
  posx: number;
  posy: number;
  pre_Block: string | null;
  column1: string | null;
  column2: string | null;
  value1: string | null;
  value2: string | null;
  value3: string | null;
  value4: string | null;
  value5: string | null;
};

export async function loadRules(): Promise<string[]> {
  const res = await fetch("https://localhost:7215/api/RuleViewer/names");

  if (!res.ok) {
    throw new Error(`loadRules failed: ${res.status}`);
  }

  const data = (await res.json()) as string[];
  return data;
}

export async function loadRule(ruleName: string): Promise<RuleDTO[]> {
  
  // encodeURIComponent 防止 ruleName 有空白、斜線、特殊字元直接炸掉
  const res = await fetch(`https://localhost:7215/api/RuleViewer/${encodeURIComponent(ruleName)}`);
  
  if (!res.ok) {
    throw new Error(`loadRules failed: ${res.status}`);
  }

  const data = (await res.json()) as RuleDTO[];
  return data;
}
