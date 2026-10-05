export type ChatRole = "user" | "assistant";

export type ChatTurn = { role: ChatRole; content: string };

/** A passage the answer cites: `text` is the whole cited paragraph, `focus` the sentence in it the answer relies on. */
export type ChatCitation = { doc: string; chunk_id: number; section: string; page: number | null; text: string; focus?: string | null };

export type ChatReply = { answer: string; citations: ChatCitation[]; tools: string[]; guardrail?: "off_topic" | "prompt_injection" | "secret" | null };

/** One thing the copilot did while answering (reading an alert, a Teradata lookup, a policy search...). */
export type ChatStep = { id: string; label: string; status: "running" | "done"; detail?: string | null };
