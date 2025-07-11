#!/usr/bin/env python3

import json
import sys
import asyncio
from typing import Any, Dict, List, Optional
import subprocess
import os
import tempfile
import uuid

class JupyterMCPServer:
    def __init__(self):
        self.name = "jupyter-notebook-mcp"
        self.version = "1.0.0"
        self.notebooks = {}
        
    async def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming MCP requests"""
        try:
            method = request.get("method")
            params = request.get("params", {})
            
            if method == "tools/list":
                return await self.list_tools()
            elif method == "tools/call":
                return await self.call_tool(params)
            else:
                return {"error": f"Unknown method: {method}"}
                
        except Exception as e:
            return {"error": str(e)}
    
    async def list_tools(self) -> Dict[str, Any]:
        """List available tools"""
        return {
            "tools": [
                {
                    "name": "create_notebook",
                    "description": "Create a new Jupyter notebook",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Notebook name"},
                            "path": {"type": "string", "description": "Path to save notebook"}
                        },
                        "required": ["name"]
                    }
                },
                {
                    "name": "execute_cell",
                    "description": "Execute code in a notebook cell",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "code": {"type": "string", "description": "Python code to execute"},
                            "notebook_id": {"type": "string", "description": "Notebook ID (optional)"}
                        },
                        "required": ["code"]
                    }
                },
                {
                    "name": "list_notebooks",
                    "description": "List all created notebooks",
                    "inputSchema": {
                        "type": "object",
                        "properties": {}
                    }
                },
                {
                    "name": "export_notebook",
                    "description": "Export notebook to various formats",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "notebook_id": {"type": "string", "description": "Notebook ID"},
                            "format": {"type": "string", "enum": ["html", "pdf", "py"], "description": "Export format"}
                        },
                        "required": ["notebook_id", "format"]
                    }
                },
                {
                    "name": "install_package",
                    "description": "Install Python package for notebook use",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "package": {"type": "string", "description": "Package name to install"}
                        },
                        "required": ["package"]
                    }
                },
                {
                    "name": "create_visualization",
                    "description": "Create data visualization using matplotlib/seaborn",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "data": {"type": "string", "description": "Data or data generation code"},
                            "chart_type": {"type": "string", "enum": ["line", "bar", "scatter", "histogram", "heatmap"], "description": "Chart type"},
                            "title": {"type": "string", "description": "Chart title"}
                        },
                        "required": ["data", "chart_type"]
                    }
                }
            ]
        }
    
    async def call_tool(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Call a specific tool"""
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        try:
            if tool_name == "create_notebook":
                return await self.create_notebook(arguments)
            elif tool_name == "execute_cell":
                return await self.execute_cell(arguments)
            elif tool_name == "list_notebooks":
                return await self.list_notebooks()
            elif tool_name == "export_notebook":
                return await self.export_notebook(arguments)
            elif tool_name == "install_package":
                return await self.install_package(arguments)
            elif tool_name == "create_visualization":
                return await self.create_visualization(arguments)
            else:
                return {"error": f"Unknown tool: {tool_name}"}
                
        except Exception as e:
            return {"error": str(e)}
    
    async def create_notebook(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new Jupyter notebook"""
        name = args["name"]
        path = args.get("path", "/tmp")
        
        notebook_id = str(uuid.uuid4())
        
        # Basic notebook structure
        notebook_content = {
            "cells": [],
            "metadata": {
                "kernelspec": {
                    "display_name": "Python 3",
                    "language": "python",
                    "name": "python3"
                },
                "language_info": {
                    "name": "python",
                    "version": "3.8.0"
                }
            },
            "nbformat": 4,
            "nbformat_minor": 4
        }
        
        notebook_path = os.path.join(path, f"{name}.ipynb")
        
        try:
            with open(notebook_path, 'w') as f:
                json.dump(notebook_content, f, indent=2)
            
            self.notebooks[notebook_id] = {
                "name": name,
                "path": notebook_path,
                "cells": []
            }
            
            return {
                "content": [{"type": "text", "text": f"Notebook '{name}' created successfully!\nID: {notebook_id}\nPath: {notebook_path}"}]
            }
            
        except Exception as e:
            return {"error": f"Failed to create notebook: {str(e)}"}
    
    async def execute_cell(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Python code in a cell"""
        code = args["code"]
        notebook_id = args.get("notebook_id")
        
        try:
            # Create temporary Python file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_file:
                temp_file.write(code)
                temp_file_path = temp_file.name
            
            # Execute the code
            result = subprocess.run(
                [sys.executable, temp_file_path],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            # Clean up
            os.unlink(temp_file_path)
            
            output = ""
            if result.stdout:
                output += f"Output:\n{result.stdout}\n"
            if result.stderr:
                output += f"Errors:\n{result.stderr}\n"
            if result.returncode != 0:
                output += f"Exit code: {result.returncode}\n"
            
            if not output:
                output = "Code executed successfully (no output)"
            
            # Add to notebook if ID provided
            if notebook_id and notebook_id in self.notebooks:
                self.notebooks[notebook_id]["cells"].append({
                    "code": code,
                    "output": output,
                    "execution_count": len(self.notebooks[notebook_id]["cells"]) + 1
                })
            
            return {
                "content": [{"type": "text", "text": f"# Code Execution Result\n\n```python\n{code}\n```\n\n{output}"}]
            }
            
        except subprocess.TimeoutExpired:
            return {"error": "Code execution timed out (30s limit)"}
        except Exception as e:
            return {"error": f"Execution failed: {str(e)}"}
    
    async def list_notebooks(self) -> Dict[str, Any]:
        """List all created notebooks"""
        if not self.notebooks:
            return {
                "content": [{"type": "text", "text": "No notebooks created yet. Use create_notebook to start."}]
            }
        
        notebook_list = "# Jupyter Notebooks\n\n"
        for notebook_id, notebook in self.notebooks.items():
            notebook_list += f"**{notebook['name']}**\n"
            notebook_list += f"- ID: {notebook_id}\n"
            notebook_list += f"- Path: {notebook['path']}\n"
            notebook_list += f"- Cells: {len(notebook['cells'])}\n\n"
        
        return {
            "content": [{"type": "text", "text": notebook_list}]
        }
    
    async def export_notebook(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Export notebook to different formats"""
        notebook_id = args["notebook_id"]
        format_type = args["format"]
        
        if notebook_id not in self.notebooks:
            return {"error": f"Notebook {notebook_id} not found"}
        
        notebook = self.notebooks[notebook_id]
        
        try:
            if format_type == "py":
                # Export as Python script
                py_content = f"# {notebook['name']}\n# Exported from Jupyter notebook\n\n"
                for i, cell in enumerate(notebook["cells"], 1):
                    py_content += f"# Cell {i}\n{cell['code']}\n\n"
                
                py_path = notebook["path"].replace(".ipynb", ".py")
                with open(py_path, 'w') as f:
                    f.write(py_content)
                
                return {
                    "content": [{"type": "text", "text": f"Notebook exported to Python script: {py_path}"}]
                }
            
            elif format_type == "html":
                # Simple HTML export
                html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>{notebook['name']}</title>
    <style>
        .cell {{ margin: 20px 0; padding: 10px; border: 1px solid #ddd; }}
        .code {{ background: #f5f5f5; padding: 10px; font-family: monospace; }}
        .output {{ background: #fff; padding: 10px; }}
    </style>
</head>
<body>
    <h1>{notebook['name']}</h1>
"""
                for i, cell in enumerate(notebook["cells"], 1):
                    html_content += f"""
    <div class="cell">
        <h3>Cell {i}</h3>
        <div class="code"><pre>{cell['code']}</pre></div>
        <div class="output"><pre>{cell['output']}</pre></div>
    </div>
"""
                html_content += "</body></html>"
                
                html_path = notebook["path"].replace(".ipynb", ".html")
                with open(html_path, 'w') as f:
                    f.write(html_content)
                
                return {
                    "content": [{"type": "text", "text": f"Notebook exported to HTML: {html_path}"}]
                }
            
            else:
                return {"error": f"Export format '{format_type}' not supported"}
                
        except Exception as e:
            return {"error": f"Export failed: {str(e)}"}
    
    async def install_package(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Install Python package"""
        package = args["package"]
        
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", package],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                return {
                    "content": [{"type": "text", "text": f"Package '{package}' installed successfully!\n\nOutput:\n{result.stdout}"}]
                }
            else:
                return {"error": f"Failed to install {package}: {result.stderr}"}
                
        except subprocess.TimeoutExpired:
            return {"error": "Package installation timed out"}
        except Exception as e:
            return {"error": f"Installation failed: {str(e)}"}
    
    async def create_visualization(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Create data visualization"""
        data = args["data"]
        chart_type = args["chart_type"]
        title = args.get("title", "Data Visualization")
        
        # Generate visualization code
        viz_code = f"""
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# Data preparation
{data}

# Create visualization
plt.figure(figsize=(10, 6))
plt.title('{title}')

"""
        
        if chart_type == "line":
            viz_code += """
if 'x' in locals() and 'y' in locals():
    plt.plot(x, y)
    plt.xlabel('X')
    plt.ylabel('Y')
else:
    # Sample data
    x = np.linspace(0, 10, 100)
    y = np.sin(x)
    plt.plot(x, y, label='sin(x)')
    plt.xlabel('X')
    plt.ylabel('Y')
    plt.legend()
"""
        elif chart_type == "bar":
            viz_code += """
if 'categories' in locals() and 'values' in locals():
    plt.bar(categories, values)
else:
    # Sample data
    categories = ['A', 'B', 'C', 'D']
    values = [23, 45, 56, 78]
    plt.bar(categories, values)
plt.xlabel('Categories')
plt.ylabel('Values')
"""
        elif chart_type == "scatter":
            viz_code += """
if 'x' in locals() and 'y' in locals():
    plt.scatter(x, y)
else:
    # Sample data
    x = np.random.randn(100)
    y = np.random.randn(100)
    plt.scatter(x, y, alpha=0.6)
plt.xlabel('X')
plt.ylabel('Y')
"""
        elif chart_type == "histogram":
            viz_code += """
if 'data' in locals():
    plt.hist(data, bins=20, alpha=0.7)
else:
    # Sample data
    data = np.random.normal(0, 1, 1000)
    plt.hist(data, bins=30, alpha=0.7, edgecolor='black')
plt.xlabel('Value')
plt.ylabel('Frequency')
"""
        elif chart_type == "heatmap":
            viz_code += """
import seaborn as sns
if 'matrix' in locals():
    sns.heatmap(matrix, annot=True, cmap='viridis')
else:
    # Sample data
    matrix = np.random.rand(10, 10)
    sns.heatmap(matrix, annot=True, cmap='viridis')
"""
        
        viz_code += """
plt.tight_layout()
plt.savefig('/tmp/visualization.png', dpi=300, bbox_inches='tight')
plt.show()
print("Visualization saved to /tmp/visualization.png")
"""
        
        # Execute the visualization code
        return await self.execute_cell({"code": viz_code})

async def main():
    """Main server loop"""
    server = JupyterMCPServer()
    
    # Simple stdio-based MCP protocol implementation
    while True:
        try:
            line = input()
            if not line:
                break
                
            request = json.loads(line)
            response = await server.handle_request(request)
            print(json.dumps(response))
            sys.stdout.flush()
            
        except EOFError:
            break
        except json.JSONDecodeError:
            print(json.dumps({"error": "Invalid JSON"}))
            sys.stdout.flush()
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.stdout.flush()

if __name__ == "__main__":
    asyncio.run(main())