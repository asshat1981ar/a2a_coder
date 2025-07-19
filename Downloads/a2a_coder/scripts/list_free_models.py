
# scripts/list_free_models.py
import asyncio
import json
import os
from blackbox_api_mock import list_models

async def main():
    all_models = await list_models()
    free_models = [m for m in all_models if m.get("free") == True]

    print("Found free models:", [m["name"] for m in free_models])

    agent_capabilities = []
    for m in free_models:
        agent_capabilities.append({
            "id": m["name"],
            "max_tokens": m["context_length"],
            "parameters": m["parameters"]
        })

    with open("agent_capabilities.json", "w") as f:
        json.dump(agent_capabilities, f, indent=2)

if __name__ == "__main__":
    asyncio.run(main())
