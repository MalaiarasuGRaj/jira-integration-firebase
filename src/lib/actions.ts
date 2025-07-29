
'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { JiraIssue, JiraIssueType, JiraUser } from './types';
import Papa from 'paparse';
import * as xlsx from 'xlsx';

const FormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  domain: z
    .string()
    .min(1, { message: 'Jira domain is required.' })
    .refine((domain) => !domain.startsWith('http'), 'Please enter domain without "http://" or "https://".'),
  apiToken: z.string().min(1, { message: 'Jira API token is required.' }),
});

export type State = {
  errors?: {
    email?: string[];
    domain?: string[];
    apiToken?: string[];
    api?: string[];
  };
  message?: string | null;
};

export type Credentials = z.infer<typeof FormSchema>;


export async function login(_prevState: State, formData: FormData): Promise<State> {
  const validatedFields = FormSchema.safeParse({
    email: formData.get('email'),
    domain: formData.get('domain'),
    apiToken: formData.get('apiToken'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid fields. Please correct the errors and try again.',
    };
  }

  const { email, domain, apiToken } = validatedFields.data;
  const credentials = { email, domain, apiToken };
  const encodedCredentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
  
  try {
    const response = await fetch(`https://${domain}/rest/api/3/myself`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      cookies().set('jira-auth', JSON.stringify(credentials), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // One week
        path: '/',
      });
    } else {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.errorMessages?.join(', ') || 'Invalid credentials. Please check your domain, email, or API token.';
      return {
        errors: { api: [errorMessage] },
        message: '',
      };
    }
  } catch (error) {
    if (error instanceof Error) {
        // Network error or invalid domain
        return {
            errors: { api: ["Failed to connect to Jira. Please ensure the domain is correct and you're connected to the internet."] },
            message: '',
        };
    }
    return {
      errors: { api: ['An unknown error occurred.'] },
      message: '',
    };
  }

  redirect('/dashboard');
}

export async function logout() {
  cookies().delete('jira-auth');
  redirect('/');
}


export async function getIssueTypesForProject(
    projectId: string,
    credentials: Credentials
  ): Promise<{ issueTypes?: JiraIssueType[]; error?: string }> {
  
    if (!credentials) {
      return { error: 'Authentication required.' };
    }
  
    const { email, domain, apiToken } = credentials;
    const encodedCredentials = Buffer.from(`${email}:${apiToken}`).toString(
      'base64'
    );
  
    try {
      const response = await fetch(
        `https://${domain}/rest/api/3/issuetype/project?projectId=${projectId}`,
        {
          headers: { Authorization: `Basic ${encodedCredentials}` },
          cache: 'no-store',
        }
      );
  
      if (!response.ok) {
        const errorText = await response.text();
        const errorMsg =
          `Failed to fetch issue types from Jira. Status: ${response.status}. ` +
          errorText;
        console.error(errorMsg);
        return {
          error: 'Failed to fetch issue types. Your token might have expired or lacks permissions.',
        };
      }
  
      const issueTypes: JiraIssueType[] = await response.json();
      return { issueTypes };
    } catch (error) {
      console.error('Error fetching issue types:', error);
      return { error: 'Could not connect to Jira to fetch issue types.' };
    }
  }

  export async function getIssuesForProjectAndType(
    projectKey: string,
    issueTypeId: string,
    credentials: Credentials
  ): Promise<{ issues?: JiraIssue[]; error?: string }> {
    if (!credentials) {
      return { error: 'Authentication required.' };
    }
  
    const { email, domain, apiToken } = credentials;
    const encodedCredentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
  
    const jql = `project = "${projectKey}" AND issuetype = ${issueTypeId} ORDER BY created DESC`;
    const encodedJql = encodeURIComponent(jql);
    const fields =
      'summary,status,assignee,reporter,priority,created,updated,labels,parent';
  
    try {
      const response = await fetch(
        `https://${domain}/rest/api/3/search?jql=${encodedJql}&fields=${fields}&maxResults=50`,
        {
          headers: { Authorization: `Basic ${encodedCredentials}` },
          cache: 'no-store',
        }
      );
  
      if (!response.ok) {
        const errorText = await response.text();
        return {
          error: `Failed to fetch issues. Status: ${response.status}. ${errorText}`,
        };
      }
  
      const data = await response.json();
      const issues = data.issues.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        self: issue.self,
        summary: issue.fields.summary,
        status: issue.fields.status,
        assignee: issue.fields.assignee,
        reporter: issue.fields.reporter,
        priority: issue.fields.priority,
        created: issue.fields.created,
        updated: issue.fields.updated,
        labels: issue.fields.labels,
        parent: issue.fields.parent,
      }));
  
      return { issues };
    } catch (error) {
      console.error('Error fetching issues:', error);
      return { error: 'Could not connect to Jira to fetch issues.' };
    }
  }

  export async function getIssuesForProject(
    projectKey: string,
    credentials: Credentials
  ): Promise<{ issues?: JiraIssue[]; error?: string }> {
    if (!credentials) {
      return { error: 'Authentication required.' };
    }
  
    const { email, domain, apiToken } = credentials;
    const encodedCredentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
  
    const jql = `project = "${projectKey}" ORDER BY created DESC`;
    const encodedJql = encodeURIComponent(jql);
    const fields = 'summary,status,assignee,reporter,priority,created,updated,labels,parent,issuetype,customfield_10016';
  
    let allIssues: JiraIssue[] = [];
    let startAt = 0;
    const maxResults = 100;
    let isLast = false;
  
    try {
      while (!isLast) {
        const response = await fetch(
          `https://${domain}/rest/api/3/search?jql=${encodedJql}&fields=${fields}&startAt=${startAt}&maxResults=${maxResults}`,
          {
            headers: { Authorization: `Basic ${encodedCredentials}` },
            cache: 'no-store',
          }
        );
  
        if (!response.ok) {
          const errorText = await response.text();
          return {
            error: `Failed to fetch issues. Status: ${response.status}. ${errorText}`,
          };
        }
  
        const data = await response.json();
        const issues = data.issues.map((issue: any) => ({
          id: issue.id,
          key: issue.key,
          self: issue.self,
          summary: issue.fields.summary,
          status: issue.fields.status,
          assignee: issue.fields.assignee,
          reporter: issue.fields.reporter,
          priority: issue.fields.priority,
          created: issue.fields.created,
          updated: issue.fields.updated,
          labels: issue.fields.labels,
          parent: issue.fields.parent,
          issueType: issue.fields.issuetype,
          storyPoints: issue.fields.customfield_10016,
        }));
        
        allIssues = allIssues.concat(issues);
        startAt += data.issues.length;
        isLast = startAt >= data.total;
      }
  
      return { issues: allIssues };
    } catch (error) {
      console.error('Error fetching issues:', error);
      return { error: 'Could not connect to Jira to fetch issues.' };
    }
  }

  async function findUserByEmail(email: string, domain: string, encodedCredentials: string): Promise<JiraUser | null> {
    if (!email) return null;
    try {
        const response = await fetch(`https://${domain}/rest/api/3/user/search?query=${encodeURIComponent(email)}`, {
            headers: { Authorization: `Basic ${encodedCredentials}` },
        });
        if (!response.ok) return null;
        const users: JiraUser[] = await response.json();
        return users.find(user => user.emailAddress?.toLowerCase() === email.toLowerCase()) || null;
    } catch (error) {
        console.error(`Error finding user by email ${email}:`, error);
        return null;
    }
  }

  export async function bulkCreateIssues(
    formData: FormData,
  ): Promise<{ success: boolean; error?: string; details?: any }> {
    const file = formData.get('file') as File;
    const projectKey = formData.get('projectKey') as string;
    const credentialsString = formData.get('credentials') as string;

    if (!file || !projectKey || !credentialsString) {
      return { success: false, error: "Missing required data: file, project key, or credentials." };
    }
    
    let credentials;
    try {
      credentials = JSON.parse(credentialsString) as Credentials;
    } catch (error) {
      return { success: false, error: "Invalid credentials format." };
    }
    
    const { email: currentUserEmail, domain, apiToken } = credentials;
    const encodedCredentials = Buffer.from(`${currentUserEmail}:${apiToken}`).toString('base64');
  
    let data: any[];
    let headers: string[] | undefined;

    try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        if (file.type === 'text/csv') {
            const csvData = fileBuffer.toString('utf-8');
            const parsed = Papa.parse(csvData.trim(), { header: true, skipEmptyLines: true });
            if (parsed.errors.length) {
                return { success: false, error: `CSV Parsing Error: ${parsed.errors[0].message}` };
            }
            data = parsed.data;
            headers = parsed.meta.fields;
        } else if (file.type === 'application/vnd.ms-excel' || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            data = xlsx.utils.sheet_to_json(worksheet);
            if (data.length > 0) {
              headers = Object.keys(data[0]);
            }
        } else {
            return { success: false, error: 'Unsupported file type. Please upload a CSV or Excel file.' };
        }
    } catch(e) {
        console.error("File parsing error:", e);
        return { success: false, error: "Failed to parse the uploaded file." };
    }
  
    const requiredHeaders = ['Summary', 'Issue Type'];
    for (const header of requiredHeaders) {
      if (!headers?.includes(header)) {
        return { success: false, error: `Missing required header: ${header}. Please use the template.` };
      }
    }
  
    try {
      // Fetch project details to get issue types
      const issueTypesResponse = await fetch(`https://${domain}/rest/api/3/issuetype/project?projectId=${projectKey}`, {
        headers: { Authorization: `Basic ${encodedCredentials}` },
      });
      if (!issueTypesResponse.ok) {
        throw new Error('Could not fetch project configuration (issue types). Please ensure the selected project is correct, that you have permissions to view it, and that you are using the template file.');
      }
      const projectIssueTypes: JiraIssueType[] = await issueTypesResponse.json();

      const issuePayloads = await Promise.all(data.map(async (row: any) => {
        if (!row.Summary || !row['Issue Type']) {
          return null; // Skip empty rows
        }

        const issueType = projectIssueTypes.find(it => it.name.toLowerCase() === row['Issue Type'].toLowerCase());
        if (!issueType) {
            // We'll let Jira handle this error to provide a more specific message.
            console.warn(`Invalid issue type specified: ${row['Issue Type']}`);
        }

        const assigneeEmail = row['Assignee (Email)'];
        const reporterEmail = row['Reporter (Email)'];
        
        const [assignee, reporter] = await Promise.all([
            assigneeEmail ? findUserByEmail(assigneeEmail, domain, encodedCredentials) : null,
            reporterEmail ? findUserByEmail(reporterEmail, domain, encodedCredentials) : findUserByEmail(currentUserEmail, domain, encodedCredentials)
        ]);
        
        const storyPoints = row['Story Points'] ? parseFloat(row['Story Points']) : null;

        const issueData: any = {
          fields: {
            project: { key: projectKey },
            summary: row.Summary,
            description: {
              type: 'doc',
              version: 1,
              content: row.Description ? [{ type: 'paragraph', content: [{ type: 'text', text: row.Description }] }] : [],
            },
            issuetype: { id: issueType?.id },
          }
        };

        if (assignee?.accountId) {
          issueData.fields.assignee = { id: assignee.accountId };
        }
        if (reporter?.accountId) {
          issueData.fields.reporter = { id: reporter.accountId };
        }
        if (storyPoints && !isNaN(storyPoints)) {
          // Note: This custom field ID can vary between Jira instances.
          // 'customfield_10016' is a common default for Story Points.
          issueData.fields.customfield_10016 = storyPoints;
        }

        return issueData;
      }));
      
      const validPayloads = issuePayloads.filter(p => p !== null);

      if (validPayloads.length === 0) {
        return { success: false, error: 'No valid issues found in the file to import.' };
      }

      const response = await fetch(`https://${domain}/rest/api/3/issue/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${encodedCredentials}`,
        },
        body: JSON.stringify({ issueUpdates: validPayloads }),
      });
  
      if (!response.ok) {
        const errorBody = await response.json();
        const errorMessage = errorBody?.errorMessages?.join(' ') || 'An unknown error occurred during bulk creation.';
        const specificErrors = (errorBody?.errors || []).map((e: any) => e.elementErrors?.errorMessages?.join(' ')).filter(Boolean).join('; ');
        return { success: false, error: `${errorMessage} ${specificErrors}`.trim() };
      }
  
      const result = await response.json();
      
      if (result.errors?.length > 0) {
        const failedCount = result.errors.length;
        const totalCount = validPayloads.length;
        const successCount = totalCount - failedCount;
        const errorMessage = `Successfully created ${successCount} issues, but ${failedCount} failed. Check Jira for details.`;
        return { success: false, error: errorMessage, details: result };
      }

      return { success: true, details: result };

    } catch (error) {
      console.error('Bulk create error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'An unexpected server error occurred.' };
    }
  }
