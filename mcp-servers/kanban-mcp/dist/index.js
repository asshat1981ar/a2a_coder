#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

class KanbanServer {
  constructor() {
    this.server = new Server(
      {
        name: "kanban-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    // Simple in-memory kanban board for demo
    this.boards = new Map();
    this.currentBoardId = null;
    
    this.setupToolHandlers();
    this.server.onerror = (error) => console.error("[Kanban Error]", error);
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "create_board",
          description: "Create a new Kanban board",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Board name" },
              description: { type: "string", description: "Board description" }
            },
            required: ["name"]
          }
        },
        {
          name: "list_boards",
          description: "List all Kanban boards",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "select_board",
          description: "Select a board to work with",
          inputSchema: {
            type: "object",
            properties: {
              boardId: { type: "string", description: "Board ID to select" }
            },
            required: ["boardId"]
          }
        },
        {
          name: "create_card",
          description: "Create a new card on the current board",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Card title" },
              description: { type: "string", description: "Card description" },
              column: { type: "string", description: "Column name (To Do, In Progress, Done)" },
              priority: { type: "string", enum: ["low", "medium", "high"], description: "Card priority" },
              assignee: { type: "string", description: "Assigned person" }
            },
            required: ["title"]
          }
        },
        {
          name: "move_card",
          description: "Move a card to a different column",
          inputSchema: {
            type: "object",
            properties: {
              cardId: { type: "string", description: "Card ID to move" },
              newColumn: { type: "string", description: "Target column" }
            },
            required: ["cardId", "newColumn"]
          }
        },
        {
          name: "update_card",
          description: "Update card details",
          inputSchema: {
            type: "object",
            properties: {
              cardId: { type: "string", description: "Card ID to update" },
              title: { type: "string", description: "New title" },
              description: { type: "string", description: "New description" },
              priority: { type: "string", enum: ["low", "medium", "high"] },
              assignee: { type: "string", description: "New assignee" }
            },
            required: ["cardId"]
          }
        },
        {
          name: "view_board",
          description: "View current board with all cards",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "search_cards",
          description: "Search for cards by title or description",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" }
            },
            required: ["query"]
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "create_board":
            return await this.createBoard(request.params.arguments);
          case "list_boards":
            return await this.listBoards();
          case "select_board":
            return await this.selectBoard(request.params.arguments);
          case "create_card":
            return await this.createCard(request.params.arguments);
          case "move_card":
            return await this.moveCard(request.params.arguments);
          case "update_card":
            return await this.updateCard(request.params.arguments);
          case "view_board":
            return await this.viewBoard();
          case "search_cards":
            return await this.searchCards(request.params.arguments);
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true
        };
      }
    });
  }

  async createBoard(args) {
    const { name, description = "" } = args;
    const boardId = `board_${Date.now()}`;
    
    const board = {
      id: boardId,
      name,
      description,
      columns: {
        "To Do": [],
        "In Progress": [],
        "Done": []
      },
      createdAt: new Date().toISOString()
    };
    
    this.boards.set(boardId, board);
    this.currentBoardId = boardId;
    
    return {
      content: [{ 
        type: "text", 
        text: `Board "${name}" created successfully!\nBoard ID: ${boardId}\nSet as current board.` 
      }]
    };
  }

  async listBoards() {
    if (this.boards.size === 0) {
      return {
        content: [{ type: "text", text: "No boards found. Create a board first using create_board." }]
      };
    }
    
    let list = "# Kanban Boards\n\n";
    this.boards.forEach((board, id) => {
      const totalCards = Object.values(board.columns).reduce((sum, cards) => sum + cards.length, 0);
      const current = id === this.currentBoardId ? " (CURRENT)" : "";
      list += `**${board.name}**${current}\n`;
      list += `- ID: ${id}\n`;
      list += `- Description: ${board.description || 'No description'}\n`;
      list += `- Cards: ${totalCards}\n`;
      list += `- Created: ${new Date(board.createdAt).toLocaleDateString()}\n\n`;
    });
    
    return {
      content: [{ type: "text", text: list }]
    };
  }

  async selectBoard(args) {
    const { boardId } = args;
    
    if (!this.boards.has(boardId)) {
      throw new Error(`Board ${boardId} not found`);
    }
    
    this.currentBoardId = boardId;
    const board = this.boards.get(boardId);
    
    return {
      content: [{ 
        type: "text", 
        text: `Selected board: "${board.name}" (${boardId})` 
      }]
    };
  }

  async createCard(args) {
    if (!this.currentBoardId) {
      throw new Error("No board selected. Use select_board first.");
    }
    
    const { title, description = "", column = "To Do", priority = "medium", assignee = "" } = args;
    const board = this.boards.get(this.currentBoardId);
    
    if (!board.columns[column]) {
      throw new Error(`Column "${column}" not found. Available columns: ${Object.keys(board.columns).join(", ")}`);
    }
    
    const card = {
      id: `card_${Date.now()}`,
      title,
      description,
      priority,
      assignee,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    board.columns[column].push(card);
    
    return {
      content: [{ 
        type: "text", 
        text: `Card "${title}" created in "${column}" column!\nCard ID: ${card.id}` 
      }]
    };
  }

  async moveCard(args) {
    if (!this.currentBoardId) {
      throw new Error("No board selected. Use select_board first.");
    }
    
    const { cardId, newColumn } = args;
    const board = this.boards.get(this.currentBoardId);
    
    if (!board.columns[newColumn]) {
      throw new Error(`Column "${newColumn}" not found. Available columns: ${Object.keys(board.columns).join(", ")}`);
    }
    
    let card = null;
    let sourceColumn = null;
    
    // Find the card in all columns
    for (const [columnName, cards] of Object.entries(board.columns)) {
      const cardIndex = cards.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) {
        card = cards[cardIndex];
        cards.splice(cardIndex, 1);
        sourceColumn = columnName;
        break;
      }
    }
    
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }
    
    card.updatedAt = new Date().toISOString();
    board.columns[newColumn].push(card);
    
    return {
      content: [{ 
        type: "text", 
        text: `Card "${card.title}" moved from "${sourceColumn}" to "${newColumn}"` 
      }]
    };
  }

  async updateCard(args) {
    if (!this.currentBoardId) {
      throw new Error("No board selected. Use select_board first.");
    }
    
    const { cardId, title, description, priority, assignee } = args;
    const board = this.boards.get(this.currentBoardId);
    
    let card = null;
    
    // Find the card in all columns
    for (const cards of Object.values(board.columns)) {
      card = cards.find(c => c.id === cardId);
      if (card) break;
    }
    
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }
    
    // Update provided fields
    if (title !== undefined) card.title = title;
    if (description !== undefined) card.description = description;
    if (priority !== undefined) card.priority = priority;
    if (assignee !== undefined) card.assignee = assignee;
    card.updatedAt = new Date().toISOString();
    
    return {
      content: [{ 
        type: "text", 
        text: `Card "${card.title}" updated successfully!` 
      }]
    };
  }

  async viewBoard() {
    if (!this.currentBoardId) {
      throw new Error("No board selected. Use select_board first.");
    }
    
    const board = this.boards.get(this.currentBoardId);
    let view = `# ${board.name}\n\n`;
    
    if (board.description) {
      view += `**Description:** ${board.description}\n\n`;
    }
    
    for (const [columnName, cards] of Object.entries(board.columns)) {
      view += `## ${columnName} (${cards.length})\n\n`;
      
      if (cards.length === 0) {
        view += `*No cards in this column*\n\n`;
        continue;
      }
      
      cards.forEach(card => {
        const priorityEmoji = { low: "🟢", medium: "🟡", high: "🔴" }[card.priority] || "⚪";
        view += `**${card.title}** ${priorityEmoji}\n`;
        view += `- ID: ${card.id}\n`;
        if (card.description) view += `- Description: ${card.description}\n`;
        if (card.assignee) view += `- Assignee: ${card.assignee}\n`;
        view += `- Priority: ${card.priority}\n`;
        view += `- Created: ${new Date(card.createdAt).toLocaleDateString()}\n\n`;
      });
    }
    
    return {
      content: [{ type: "text", text: view }]
    };
  }

  async searchCards(args) {
    if (!this.currentBoardId) {
      throw new Error("No board selected. Use select_board first.");
    }
    
    const { query } = args;
    const board = this.boards.get(this.currentBoardId);
    const searchResults = [];
    
    for (const [columnName, cards] of Object.entries(board.columns)) {
      for (const card of cards) {
        if (card.title.toLowerCase().includes(query.toLowerCase()) ||
            card.description.toLowerCase().includes(query.toLowerCase())) {
          searchResults.push({ ...card, column: columnName });
        }
      }
    }
    
    if (searchResults.length === 0) {
      return {
        content: [{ type: "text", text: `No cards found matching "${query}"` }]
      };
    }
    
    let results = `# Search Results for "${query}"\n\n`;
    results += `Found ${searchResults.length} card(s):\n\n`;
    
    searchResults.forEach(card => {
      const priorityEmoji = { low: "🟢", medium: "🟡", high: "🔴" }[card.priority] || "⚪";
      results += `**${card.title}** ${priorityEmoji} (${card.column})\n`;
      results += `- ID: ${card.id}\n`;
      if (card.description) results += `- Description: ${card.description}\n`;
      if (card.assignee) results += `- Assignee: ${card.assignee}\n`;
      results += `\n`;
    });
    
    return {
      content: [{ type: "text", text: results }]
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Kanban MCP Server running on stdio");
  }
}

const server = new KanbanServer();
server.start().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});