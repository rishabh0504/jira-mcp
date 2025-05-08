import { McpServer, ToolDefinition } from '@modelcontextprotocol/sdk/server';
import axios, { AxiosResponse } from 'axios';
import https from 'https';
import { z } from 'zod';

// === 🔐 Secure Axios Setup for Jira On-Prem ===

const JIRA_BASE_URL = process.env.JIRA_BASE_URL || 'https://your-onprem-jira.example.com/rest/api/2';
const JIRA_AUTH_TOKEN = process.env.JIRA_AUTH_TOKEN;

if (!JIRA_AUTH_TOKEN) {
  throw new Error("Missing JIRA_AUTH_TOKEN (Base64 encoded: username:password)");
}

const jira = axios.create({
  baseURL: JIRA_BASE_URL,
  headers: {
    Authorization: `Basic ${JIRA_AUTH_TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  httpsAgent: new https.Agent({ rejectUnauthorized: true }),
  timeout: 10000
});

// === 📦 Zod Schemas ===

const createIssueSchema = z.object({
  projectOrBoardKey: z.string().min(1),
  summary: z.string().min(5),
  description: z.string().min(5),
  issueType: z.enum(['Epic', 'Story']),
  acceptanceCriteria: z.string().optional()
});
type CreateIssueInput = z.infer<typeof createIssueSchema>;

const bulkIssueSchema = z.object({
  projectKey: z.string().min(1),
  issues: z.array(
    z.object({
      summary: z.string().min(5),
      description: z.string().min(5),
      issueType: z.enum(['Epic', 'Story']),
      acceptanceCriteria: z.string().optional()
    })
  )
});
type BulkIssueInput = z.infer<typeof bulkIssueSchema>;

const fetchBoardSchema = z.object({
  boardId: z.number().int().positive()
});
type FetchBoardInput = z.infer<typeof fetchBoardSchema>;

// === 🛠️ Tools ===

// 1. Create Issue
const createIssueTool: ToolDefinition = {
  name: 'create_issue',
  description: 'Create an Epic or Story in Jira with acceptance criteria.',
  parameters: createIssueSchema._def.schema,

  execute: async (args: unknown): Promise<{ status: string; issueKey?: string; url?: string; message?: string }> => {
    const input: CreateIssueInput = createIssueSchema.parse(args);
    const { projectOrBoardKey, summary, description, issueType, acceptanceCriteria } = input;

    const fullDescription = `${description}\n\n**Acceptance Criteria:**\n${acceptanceCriteria || 'N/A'}`;

    try {
      const res: AxiosResponse<{ key: string }> = await jira.post('/issue', {
        fields: {
          project: { key: projectOrBoardKey },
          summary,
          description: fullDescription,
          issuetype: { name: issueType }
        }
      });

      return {
        status: 'success',
        issueKey: res.data.key,
        url: `${JIRA_BASE_URL.replace('/rest/api/2', '')}/browse/${res.data.key}`
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.response?.data || error.message
      };
    }
  }
};

// 2. Create Bulk Issues
const createBulkIssuesTool: ToolDefinition = {
  name: 'create_bulk_issues',
  description: 'Bulk create Jira Epics or Stories for a given project.',
  parameters: bulkIssueSchema._def.schema,

  execute: async (args: unknown): Promise<{ status: string; created?: any[]; message?: string }> => {
    const input: BulkIssueInput = bulkIssueSchema.parse(args);
    const { projectKey, issues } = input;

    const issueUpdates = issues.map(issue => ({
      fields: {
        project: { key: projectKey },
        summary: issue.summary,
        description: `${issue.description}\n\n**Acceptance Criteria:**\n${issue.acceptanceCriteria || 'N/A'}`,
        issuetype: { name: issue.issueType }
      }
    }));

    try {
      const res: AxiosResponse<{ issues: Array<{ key: string; id: string }> }> = await jira.post('/issue/bulk', {
        issueUpdates
      });

      return {
        status: 'success',
        created: res.data.issues.map((i) => ({ key: i.key, id: i.id }))
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.response?.data || error.message
      };
    }
  }
};

// 3. Fetch Issues for a Board
const fetchBoardIssuesTool: ToolDefinition = {
  name: 'fetch_board_issues',
  description: 'Fetch all Epics and Stories from a Jira board.',
  parameters: fetchBoardSchema._def.schema,

  execute: async (args: unknown): Promise<{ status: string; issues?: any[]; message?: string }> => {
    const input: FetchBoardInput = fetchBoardSchema.parse(args);
    const { boardId } = input;

    try {
      const res: AxiosResponse<{ issues: any[] }> = await jira.get(`/board/${boardId}/issue`, {
        params: { maxResults: 1000 }
      });

      const filtered = res.data.issues.filter((issue: any) => {
        const type = issue.fields?.issuetype?.name;
        return type === 'Epic' || type === 'Story';
      });

      const result = filtered.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary,
        issueType: issue.fields.issuetype.name,
        status: issue.fields.status.name,
        assignee: issue.fields.assignee?.displayName || 'Unassigned'
      }));

      return {
        status: 'success',
        issues: result
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.response?.data || error.message
      };
    }
  }
};

// === 🚀 Start Server ===

const server = new McpServer({
  transport: 'stdio',
  tools: [createIssueTool, createBulkIssuesTool, fetchBoardIssuesTool]
});

server.start();















import { McpServer, ToolDefinition } from '@modelcontextprotocol/sdk/server';
import axios from 'axios';
import https from 'https';
import { z } from 'zod';

// === Axios Setup ===
const JIRA_BASE_URL = 'https://your-onprem-jira.example.com/rest/api/2';
const JIRA_AUTH_TOKEN = process.env.JIRA_AUTH_TOKEN;
if (!JIRA_AUTH_TOKEN) throw new Error("Missing JIRA_AUTH_TOKEN");

const jira = axios.create({
  baseURL: JIRA_BASE_URL,
  headers: {
    Authorization: `Basic ${JIRA_AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  },
  httpsAgent: new https.Agent({ rejectUnauthorized: true })
});

// === Tool Definition ===
const fetchProjectIssuesTool: ToolDefinition = {
  name: 'fetch_project_issues',
  description: 'Fetch all Epics and Stories from a Jira project.',

  parameters: z.object({
    projectKey: z.string().min(1)
  }),

  execute: async (args: any) => {
    const { projectKey } = fetchProjectIssuesTool.parameters.parse(args);

    try {
      const jql = `project = "${projectKey}" AND issuetype in (Epic, Story) ORDER BY created DESC`;

      const res = await jira.get('/search', {
        params: {
          jql,
          maxResults: 100,
          fields: ['key', 'summary', 'issuetype', 'status', 'assignee']
        }
      });

      const issues = res.data.issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary,
        issueType: issue.fields.issuetype.name,
        status: issue.fields.status.name,
        assignee: issue.fields.assignee?.displayName || 'Unassigned'
      }));

      return { status: 'success', issues };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.response?.data || error.message
      };
    }
  }
};




import { ToolDefinition } from '@modelcontextprotocol/sdk/server';
import axios from 'axios';
import https from 'https';
import { z } from 'zod';

// 🔐 Jira Axios Setup
const JIRA_BASE_URL = 'https://your-onprem-jira.example.com/rest/api/2';
const JIRA_AUTH_TOKEN = process.env.JIRA_AUTH_TOKEN;
if (!JIRA_AUTH_TOKEN) throw new Error("Missing JIRA_AUTH_TOKEN");

const jira = axios.create({
  baseURL: JIRA_BASE_URL,
  headers: {
    Authorization: `Basic ${JIRA_AUTH_TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  httpsAgent: new https.Agent({ rejectUnauthorized: true })
});

// 🛠️ Create Issue Tool
export const createIssueTool: ToolDefinition = {
  name: 'create_issue',
  description: 'Create an Epic or Story in Jira. Requires project key, summary, and description.',

  parameters: z.object({
    projectKey: z.string().min(1, 'Project key is required'),
    summary: z.string().min(5, 'Summary must be at least 5 characters'),
    description: z.string().min(5, 'Description must be at least 5 characters'),
    issueType: z.enum(['Epic', 'Story']),
    acceptanceCriteria: z.string().optional()
  }),

  execute: async (args: any) => {
    const { projectKey, summary, description, issueType, acceptanceCriteria } =
      createIssueTool.parameters.parse(args);

    const fullDescription = `${description}\n\n**Acceptance Criteria:**\n${acceptanceCriteria || 'N/A'}`;

    try {
      const res = await jira.post('/issue', {
        fields: {
          project: { key: projectKey },
          summary,
          description: fullDescription,
          issuetype: { name: issueType }
        }
      });

      const issueKey = res.data.key;

      return {
        status: 'success',
        issueKey,
        url: `${JIRA_BASE_URL.replace('/rest/api/2', '')}/browse/${issueKey}`
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.response?.data || error.message
      };
    }
  }
};




import { ToolDefinition } from '@modelcontextprotocol/sdk/server';
import axios from 'axios';
import https from 'https';
import { z } from 'zod';

// 🔐 Jira Axios Setup
const JIRA_BASE_URL = 'https://your-onprem-jira.example.com/rest/api/2';
const JIRA_AUTH_TOKEN = process.env.JIRA_AUTH_TOKEN;
if (!JIRA_AUTH_TOKEN) throw new Error("Missing JIRA_AUTH_TOKEN");

const jira = axios.create({
  baseURL: JIRA_BASE_URL,
  headers: {
    Authorization: `Basic ${JIRA_AUTH_TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  httpsAgent: new https.Agent({ rejectUnauthorized: true })
});

// 🧾 Zod Schema for Bulk Issues
const bulkIssueSchema = z.object({
  projectKey: z.string().min(1),
  summary: z.string().min(5),
  description: z.string().min(5),
  issueType: z.enum(['Epic', 'Story']),
  acceptanceCriteria: z.string().optional()
});

export const createBulkIssuesTool: ToolDefinition = {
  name: 'create_bulk_issues',
  description: 'Create multiple Jira issues (Epics or Stories) in bulk.',

  parameters: z.object({
    issues: z.array(bulkIssueSchema).min(1, 'At least one issue is required')
  }),

  execute: async (args: any) => {
    const { issues } = createBulkIssuesTool.parameters.parse(args);

    const payload = {
      issueUpdates: issues.map(issue => ({
        fields: {
          project: { key: issue.projectKey },
          summary: issue.summary,
          description: `${issue.description}\n\n**Acceptance Criteria:**\n${issue.acceptanceCriteria || 'N/A'}`,
          issuetype: { name: issue.issueType }
        }
      }))
    };

    try {
      const res = await jira.post('/issue/bulk', payload);

      const created = res.data.issues.map((i: any) => ({
        key: i.key,
        url: `${JIRA_BASE_URL.replace('/rest/api/2', '')}/browse/${i.key}`
      }));

      return {
        status: 'success',
        created
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.response?.data || error.message
      };
    }
  }
};




import { ToolDefinition } from '@modelcontextprotocol/sdk/server';
import axios from 'axios';
import https from 'https';
import { z } from 'zod';

// 🔐 Jira Config
const JIRA_BASE_URL = 'https://your-onprem-jira.example.com/rest/api/2';
const JIRA_AUTH_TOKEN = process.env.JIRA_AUTH_TOKEN;
if (!JIRA_AUTH_TOKEN) throw new Error('Missing JIRA_AUTH_TOKEN');

const jira = axios.create({
  baseURL: JIRA_BASE_URL,
  headers: {
    Authorization: `Basic ${JIRA_AUTH_TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  httpsAgent: new https.Agent({ rejectUnauthorized: true })
});

// 🧾 Zod Schema
const issueInputSchema = z.object({
  projectName: z.string().min(1),
  summary: z.string().min(5),
  description: z.string().min(5),
  issueType: z.enum(['Epic', 'Story']),
  acceptanceCriteria: z.string().optional()
});

const parametersSchema = z.object({
  issues: z.array(issueInputSchema).min(1)
});

// 🛠️ Tool Definition
export const createBulkIssuesTool: ToolDefinition = {
  name: 'create_bulk_issues',
  description: 'Creates multiple Jira issues (Epics or Stories) under specified projects.',
  parameters: parametersSchema,

  execute: async (args: any) => {
    const { issues } = parametersSchema.parse(args);

    try {
      // Fetch all available projects from Jira
      const allProjectsRes = await jira.get('/project');
      const allProjects = allProjectsRes.data as Array<{ name: string; key: string }>;

      // Transform and validate each issue
      const issueUpdates = issues.map((issue) => {
        const matchedProject = allProjects.find(
          (p) => p.name.toLowerCase() === issue.projectName.toLowerCase()
        );

        if (!matchedProject) {
          throw new Error(`Project "${issue.projectName}" not found. Please provide the exact project name.`);
        }

        return {
          fields: {
            project: { key: matchedProject.key },
            summary: issue.summary,
            description: `${issue.description}\n\n**Acceptance Criteria:**\n${issue.acceptanceCriteria || 'N/A'}`,
            issuetype: { name: issue.issueType }
          }
        };
      });

      // Submit to Jira bulk create endpoint
      const response = await jira.post('/issue/bulk', { issueUpdates });

      const createdIssues = (response.data.issues || []).map((i: any) => ({
        key: i.key,
        url: `${JIRA_BASE_URL.replace('/rest/api/2', '')}/browse/${i.key}`
      }));

      return {
        status: 'success',
        created: createdIssues
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.response?.data || error.message
      };
    }
  }
};





import { ToolDefinition } from '@modelcontextprotocol/sdk/server';
import axios from 'axios';
import https from 'https';
import { z } from 'zod';

// 🔐 Jira Config
const JIRA_BASE_URL = 'https://your-onprem-jira.example.com/rest/api/2';
const JIRA_AUTH_TOKEN = process.env.JIRA_AUTH_TOKEN;
if (!JIRA_AUTH_TOKEN) throw new Error('Missing JIRA_AUTH_TOKEN');

const jira = axios.create({
  baseURL: JIRA_BASE_URL,
  headers: {
    Authorization: `Basic ${JIRA_AUTH_TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  httpsAgent: new https.Agent({ rejectUnauthorized: true })
});

// 🧾 Zod Schema
const issueInputSchema = z.object({
  projectName: z.string().min(1),
  summary: z.string().min(5),
  description: z.string().min(5),
  issueType: z.enum(['Epic', 'Story']),
  acceptanceCriteria: z.string().optional()
});

// 🛠️ Tool Definition
export const createIssueTool: ToolDefinition = {
  name: 'create_issue',
  description: 'Creates a single Jira issue (Epic or Story) under a specified project.',
  parameters: issueInputSchema,

  execute: async (args: any) => {
    const issue = issueInputSchema.parse(args);

    try {
      // Fetch all available projects from Jira
      const allProjectsRes = await jira.get('/project');
      const allProjects = allProjectsRes.data as Array<{ name: string; key: string }>;

      // Find the project by name
      const matchedProject = allProjects.find(
        (p) => p.name.toLowerCase() === issue.projectName.toLowerCase()
      );

      if (!matchedProject) {
        throw new Error(`Project "${issue.projectName}" not found. Please provide the exact project name.`);
      }

      // Prepare the issue payload
      const issuePayload = {
        fields: {
          project: { key: matchedProject.key },
          summary: issue.summary,
          description: `${issue.description}\n\n**Acceptance Criteria:**\n${issue.acceptanceCriteria || 'N/A'}`,
          issuetype: { name: issue.issueType }
        }
      };

      // Create the issue in Jira
      const response = await jira.post('/issue', issuePayload);

      // Return the created issue's key and URL
      return {
        status: 'success',
        created: {
          key: response.data.key,
          url: `${JIRA_BASE_URL.replace('/rest/api/2', '')}/browse/${response.data.key}`
        }
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.response?.data || error.message
      };
    }
  }
};



