import { DynamicStructuredTool } from "langchain/tools";

// Define the tool
export const extractJiraTicketsFromBrdTool = new DynamicStructuredTool({
  name: "extract_jira_tickets_from_brd",
  description:
    "Extract an array of Jira Epics and Stories from a BRD-style description. Returns valid JSON array payloads for Jira issue creation.",
  schema: {},
  func: async (input: any) => {
    const brd = JSON.parse(input);
    console.log("📄 Extracting tickets from BRD input:", brd);

    // Example stub – you'd replace this with actual LLM-based parsing logic
    const extractedTickets = [
      {
        project: "AICCODEGEN",
        summary: "API Integration Epic",
        description: "Handle all user-related API failures",
        issuetype: "Epic",
        epic_name: "API Integration Epic",
      },
      {
        project: "AICCODEGEN",
        summary: "Fix 500 error on user API",
        description:
          "Investigate and fix the 500 error when fetching user data",
        issuetype: "Story",
      },
      {
        project: "AICCODEGEN",
        summary: "Retry logic for failed calls",
        description:
          "Add retry logic for user data API calls that fail intermittently",
        issuetype: "Story",
      },
    ];

    return JSON.stringify(extractedTickets, null, 2);
  },
  returnDirect: true,
});
