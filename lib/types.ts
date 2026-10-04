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

export interface CustomerSummary {
  customer_id: number;
  account_age_days: number;
  txn_count: number;
  flagged_count: number;
  avg_amount_myr: number;
  total_amount_myr: number;
  first_txn_ts: string;
  last_txn_ts: string;
}

export interface AlertDetail {
  txn: Txn;
  customer: CustomerSummary;
  sql_customer: string;
  prob: number;
  reasons: string[];
  sql: string;
}

export interface ScoreResult {
  rows: number;
  seconds: number;
  sql: string;
}

export interface BriefCitation {
  doc: string;
  chunk_id: number;
  section: string;
  page: number | null;
  text: string;
}

export interface BriefItem {
  question: string;
  answer: string;
  citations: BriefCitation[];
}

export interface Brief {
  txn_id: number;
  prob: number;
  priority: "P1" | "P2" | null;
  headline: string;
  items: BriefItem[];
  retrieval_ms: number;
  llm_ms: number;
}

export interface DocumentInfo {
  doc: string;
  kind: "pdf" | "md" | "txt";
  pages: number | null;
  chunks: number;
  bytes: number;
  uploaded_at: string;
}

export interface DeleteResult {
  deleted: string;
  chunks: number;
}
