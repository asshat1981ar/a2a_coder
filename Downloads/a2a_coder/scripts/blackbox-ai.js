
// scripts/blackbox-ai.js (Mock SDK)

export async function listModels() {
  return [
    { name: "blackbox-base", context_length: 4096, parameters: 3000000000, free: true },
    { name: "deepseek-r1", context_length: 8192, parameters: 7500000000, free: true },
    { name: "gpt-4-turbo", context_length: 128000, parameters: 175000000000, free: false },
    { name: "claude-3-opus", context_length: 200000, parameters: 200000000000, free: false },
    { name: "gemini-pro-free", context_length: 32768, parameters: 50000000000, free: true },
    { name: "llama-3-8b-free", context_length: 8192, parameters: 8000000000, free: true }
  ];
}
