type JiraIssueType = 'Epic' | 'Story';

interface JiraInputPayload {
  projectName: string;
  summary: string;
  description: string;
  issueType: JiraIssueType;
  acceptanceCriteria: string; // "1. ..." format with \n separation
}

export function buildJiraIssuePayload(input: JiraInputPayload): any {
  const { projectName, summary, description, issueType, acceptanceCriteria } = input;

  // Convert acceptanceCriteria string into ADF ordered list
  const acceptanceItems = acceptanceCriteria
    .split('\n')
    .map(line => line.replace(/^\d+\.?\s*/, '').trim()) // remove "1. ", "2. ", etc.
    .filter(Boolean);

  const adfAcceptanceCriteria = acceptanceItems.map(item => ({
    type: 'listItem',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: item
          }
        ]
      }
    ]
  }));

  const adfDescription = {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: description
          }
        ]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [
          {
            type: 'text',
            text: 'Acceptance Criteria'
          }
        ]
      },
      {
        type: 'orderedList',
        content: adfAcceptanceCriteria
      }
    ]
  };

  return {
    fields: {
      project: {
        key: projectName
      },
      summary: summary,
      issuetype: {
        name: issueType
      },
      description: adfDescription
    }
  };
}



const jiraPayload = {
  projectName: 'MYPROJ',
  summary: 'Implement user login',
  description: 'Create a secure login system using JWT.',
  issueType: 'Story',
  acceptanceCriteria: '1. User can log in with valid credentials\n2. Error shown for invalid login'
};

const requestBody = buildJiraIssuePayload(jiraPayload);
console.log(JSON.stringify(requestBody, null, 2));



