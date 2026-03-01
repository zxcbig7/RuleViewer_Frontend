type RuleDTO = {
  PHASE: string;
  RULE_NAME: string;
  BLOCK_NAME: string;
  BLOCK_TYPE: string;
  BLOCK_GROUP: string;
  BLOCK_SEQ: string;
  KEY: string | null;
  POSX: number;
  POSY: number;
  PRE_BLOCK: string | null;
  COLUMN1: string | null;
  COLUMN2: string | null;
  VALUE1: string | null;
  VALUE2: string | null;
  VALUE3: string | null;
  VALUE4: string | null;
  VALUE5: string | null;
};


type BlcokInfo = {
  PHASE: string | null;
  RULE_NAME: string | null;
  BLOCK_NAME: string | null; //合併後的名稱
  BLOCK_TYPE: string | null;
  BLOCK_GROUP: string | null;
  BLOCK_SEQ: string | null;
  KEY: string | null;
  POSX: number | null;
  POSY: number | null;
  PRE_BLOCK: string[] | null;
  VALUES: BlockValue[] | null;   // 集中存放 Col、Val 對應值
};


type BlockValue = {
  COLUMN1: string | null;
  COLUMN2: string | null;
  VALUE: string;
};
