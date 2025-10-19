# Update OpenAPI Specification Prompt

## Instructions
Run this prompt to update `openapi.yaml` based on the current state of endpoints and models in the codebase.

---

**Prompt:**

> Analyze the Express routes, controllers, and models in the `src/` directory. For each endpoint, document its HTTP method, path, request body, response schema, and error responses. For each model, generate a schema definition. Update the `openapi.yaml` file to reflect any new, changed, or removed endpoints and models. Ensure all request/response examples are current. Use OpenAPI 3.0.3 format.

---

## How to Use
1. Copy the above prompt.
2. Paste it into your preferred AI code assistant (e.g., GitHub Copilot Chat, ChatGPT, etc.).
3. Review the generated `openapi.yaml` and commit changes.

---

## Tips
- Run this prompt after adding, removing, or updating endpoints/models.
- Validate the OpenAPI file using Swagger Editor or Postman.
