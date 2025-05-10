import axios from 'axios';

const JIRA_BASE_URL = 'https://your-domain.atlassian.net';
const JIRA_EMAIL = 'your-email@example.com';
const JIRA_API_TOKEN = 'your-api-token';

const authHeader = {
  Authorization: `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`,
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

// Types
export type IssueType = 'Epic' | 'Story';

export interface StoryInput {
  summary: string;
  description: string;
  issueType: 'Story';
  acceptanceCriteria: string;
}

export interface EpicWithStories {
  projectName: string;
  summary: string;
  description: string;
  issueType: 'Epic';
  epicName: string;
  acceptanceCriteria: string;
  issues: StoryInput[];
}

// Utils
function formatADF(description: string, criteria: string) {
  const items = criteria
    .split('\n')
    .map(i => i.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);

  return {
    type: 'doc',
    version: 1,
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: description }] },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Acceptance Criteria' }]
      },
      {
        type: 'orderedList',
        content: items.map(text => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
        }))
      }
    ]
  };
}

async function getEpicLinkFieldId(): Promise<string> {
  const res = await axios.get(`${JIRA_BASE_URL}/rest/api/3/field`, { headers: authHeader });
  const epicLink = res.data.find((f: any) => f.name === 'Epic Link');
  if (!epicLink) throw new Error('Epic Link custom field not found');
  return epicLink.id;
}

async function createBulkIssues(issueUpdates: any[]) {
  const res = await axios.post(`${JIRA_BASE_URL}/rest/api/3/issue/bulk`, { issueUpdates }, { headers: authHeader });
  return res.data.issues;
}

export async function createEpicsWithStories(epicsWithStories: EpicWithStories[]) {
  const EPIC_NAME_CUSTOM_FIELD = 'customfield_10011';
  const epicLinkFieldId = await getEpicLinkFieldId();

  // Step 1: Prepare epic creation payload
  const epicPayload = epicsWithStories.map(epic => ({
    fields: {
      project: { key: epic.projectName },
      summary: epic.summary,
      issuetype: { name: 'Epic' },
      description: formatADF(epic.description, epic.acceptanceCriteria),
      [EPIC_NAME_CUSTOM_FIELD]: epic.epicName
    }
  }));

  // Step 2: Create epics
  const epicIssues = await createBulkIssues(epicPayload);

  // Step 3: Prepare story creation payload with real epic keys
  const storyPayload = epicsWithStories.flatMap((epic, index) => {
    const epicKey = epicIssues[index].key;
    return epic.issues.map(story => ({
      fields: {
        project: { key: epic.projectName },
        summary: story.summary,
        issuetype: { name: story.issueType },
        description: formatADF(story.description, story.acceptanceCriteria),
        [epicLinkFieldId]: epicKey
      }
    }));
  });

  // Step 4: Create stories
  const storyIssues = await createBulkIssues(storyPayload);

  // Step 5: Combine results
  return epicsWithStories.map((epic, index) => ({
    epic: {
      ...epic,
      jiraKey: epicIssues[index].key,
      jiraId: epicIssues[index].id
    },
    stories: epic.issues.map((story, idx) => {
      const storyIndex = epicsWithStories.slice(0, index).reduce((acc, curr) => acc + curr.issues.length, 0) + idx;
      return {
        ...story,
        jiraKey: storyIssues[storyIndex].key,
        jiraId: storyIssues[storyIndex].id
      };
    })
  }));
}





const epicsWithStoriesInput: EpicWithStories[] = [
  {
    projectName: 'BANKAPP',
    summary: 'User Authentication Epic',
    description: 'Covers all authentication features including login, signup, and logout.',
    issueType: 'Epic',
    epicName: 'Authentication Module',
    acceptanceCriteria: '1. Secure login\n2. OTP based authentication\n3. Forgot password flow',
    issues: [
      {
        summary: 'Login Page',
        description: 'Build the login screen for web and mobile',
        issueType: 'Story',
        acceptanceCriteria: '1. Input email and password\n2. Show validation errors\n3. Submit credentials to API'
      },
      {
        summary: 'Forgot Password Flow',
        description: 'Design and implement forgot password UI and backend integration',
        issueType: 'Story',
        acceptanceCriteria: '1. Input registered email\n2. Send reset link\n3. Handle reset token'
      }
    ]
  },
  {
    projectName: 'BANKAPP',
    summary: 'User Profile Management Epic',
    description: 'Covers profile updates, contact info, and user preferences.',
    issueType: 'Epic',
    epicName: 'Profile Management',
    acceptanceCriteria: '1. Edit profile\n2. Change password\n3. Manage preferences',
    issues: [
      {
        summary: 'Edit Profile Screen',
        description: 'Allow users to edit their name and contact info',
        issueType: 'Story',
        acceptanceCriteria: '1. Edit name\n2. Edit phone number\n3. Save to DB'
      },
      {
        summary: 'Preferences Toggle',
        description: 'UI to allow user preference updates',
        issueType: 'Story',
        acceptanceCriteria: '1. Toggle notifications\n2. Toggle dark mode'
      }
    ]
  }
];
