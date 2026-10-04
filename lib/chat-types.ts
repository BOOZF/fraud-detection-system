export type ChatRole = "user" | "assistant";

export type ChatTurn = { role: ChatRole; content: string };

export type ChatCitation = { doc: string; chunk_id: number; section: string; page: number | null; text: string };

export type ChatReply = { answer: string; citations: ChatCitation[]; tools: string[] };
