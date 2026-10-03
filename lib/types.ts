export interface ChannelStat {
  channel: string;
  txn: number;
  fraud: number;
}

export interface Kpis {
  total_txn: number;
  fraud_txn: number;
  fraud_rate: number;
  alerts_open: number;
  fraud_by_channel: ChannelStat[];
  sql: string[];
}

export interface ModelInfo {
  auc: number;
  gini: number;
  train_rows: number;
  test_rows: number;
  train_seconds: number;
  features: string[];
  algorithm: string;
}

export interface Alert {
  txn_id: number;
  amount_myr: number;
  channel: string;
  merchant_cat: string;
  prob: number;
  txn_ts: string;
}

export interface Txn {
  txn_id: number;
  customer_id: number;
  txn_ts: string;
  amount_myr: number;
  channel: string;
  merchant_cat: string;
  is_foreign: 0 | 1;
  device_new: 0 | 1;
  hour_of_day: number;
  km_from_home: number;
  txn_count_1h: number;
  amt_ratio_30d: number;
  account_age_days: number;
  is_fraud: 0 | 1;
}

export interface AlertDetail {
  txn: Txn;
  prob: number;
  reasons: string[];
  sql: string;
}

export interface ScoreResult {
  rows: number;
  seconds: number;
  sql: string;
}

export interface Citation {
  doc: string;
  chunk_id: number;
  text: string;
}

export interface CopilotResponse {
  answer: string;
  citations: Citation[];
  retrieval_ms: number;
  llm_ms: number;
}
