# Community Connect - WhatsApp Bot (Slice 1)

This project is the backend for the Community Connect WhatsApp bot, focusing on Slice 1: Semantic Answering with LLM capability.

## Features (Slice 1)
- Natural language query understanding
- Semantic search
- Intelligent response generation using LLMs

## Tech Stack
- Python 3.10+
- FastAPI
- Extendable modular structure for future slices

## Directory Structure
- `app/bot/` - Bot logic and API endpoints
- `app/llm/` - LLM integration and utilities
- `app/semantic_search/` - Semantic search logic
- `app/config/` - Configuration files
- `tests/` - Unit and integration tests

## Getting Started
1. Install dependencies: `pip install -r requirements.txt`
2. Run the server: `uvicorn app.bot.main:app --reload`

## Extending
Structure is designed for easy addition of conversation history, actions, and authorization in future slices.
