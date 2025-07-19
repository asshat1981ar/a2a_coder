
// scripts/list_free_models.js
import { listModels } from "./blackbox-ai.js";
import fs from "fs";

async function main() {
  const all = await listModels(); 
  // assume each model has { name, context_length, parameters, free }
  const freeModels = all.filter(m => m.free === true);

  console.log("Found free models:", freeModels.map(m => m.name));
  fs.writeFileSync(
    "agent_capabilities.json",
    JSON.stringify(
      freeModels.map(m => ({
        id: m.name,
        max_tokens: m.context_length,
        parameters: m.parameters
      })),
      null,
      2
    )
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
