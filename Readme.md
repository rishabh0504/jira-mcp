# Jira Integration System

This system provides a natural language interface to interact with Jira. It can intelligently determine whether to fetch tickets from a Jira project or create new tickets based on the user's request.

## Setup

1. Ensure your environment variables are set:

   ```
   JIRA_BASE_URL=https://your-domain.atlassian.net
   JIRA_EMAIL=your-email@example.com
   JIRA_API_TOKEN=your-api-token
   OLLAMA_HOST=http://localhost:11434
   ```

2. Start your server and the Jira integration will be available at the `/jira/interact` endpoint.

## Usage Examples

### Fetching Tickets

Send a POST request to `/jira/interact` with a query that includes the project key:

```bash
curl --location 'http://localhost:3000/jira/interact' \
--header 'Content-Type: application/json' \
--data '{
  "query": "Fetch all tickets from the ENBDX project"
}'
```

```bash
curl --location 'http://localhost:3000/jira/interact' \
--header 'Content-Type: application/json' \
--data '{
  "query": "Show me the issues in PROJ"
}'
```

### Creating Tickets

Send a POST request to `/jira/interact` with a query that includes the ticket details:

```bash
curl --location 'http://localhost:3000/jira/interact' \
--header 'Content-Type: application/json' \
--data '{
  "query": "Create a new ticket in ENBDX with title: API Integration Issue, description: The API returns 500 errors when accessing user data"
}'
```

```bash
curl --location 'http://localhost:3000/jira/interact' \
--header 'Content-Type: application/json' \
--data '{
  "query": "Add a bug in PROJ about login failures with description: Users cannot log in with SSO"
}'
```

## How It Works

1. The system analyzes the natural language query to determine if it's a fetch or create operation
2. For fetch operations, it extracts the project key and fetches tickets
3. For create operations, it extracts the project, title, description, and other details
4. If the query is ambiguous or complex, it falls back to using an LLM agent to process the request

## Response Format

Successful responses:

```json
{
  "success": true,
  "data": {
    // Ticket data or operation result
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message"
}
```
