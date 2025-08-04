
'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { JiraIssue, JiraIssueType, JiraUser, JiraPriority, JiraTransition } from './types';
import * as xlsx from 'xlsx';

const FormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  domain: z
    .string()
    .min(1, { message: 'Jira domain is required.' })
    .refine((domain) => !domain.startsWith('http'), 'Please enter domain without "http://" or "https://".'),
  apiToken: z.string().min(1, { message: 'Jira API token is required.' }),
});

export type Credentials = z.infer<typeof FormSchema>;

const createIssueFormSchema = z.object({
    projectId: z.string().min(1, { message: 'Please select a project.' }),
    issueTypeId: z.string().min(1, { message: 'Please select an issue type.' }),
    summary: z.string().min(1, { message: 'Summary is required.' }),
    description: z.string().optional(),
    assigneeId: z.string().optional(),
  });
  
type CreateIssueFormValues = z.infer<typeof createIssueFormSchema>;

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
    projectIdOrKey: string,
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
        `https://${domain}/rest/api/3/issuetype/project?projectId=${projectIdOrKey}`,
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
      'summary,status,assignee,reporter,priority,created,updated,labels,parent,issuetype,description,customfield_10020,customfield_10011,customfield_10016';
  
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
        description: issue.fields.description,
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
        customfield_10020: issue.fields.customfield_10020 || [],
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
    const fields = 'summary,status,assignee,reporter,priority,created,updated,labels,parent,issuetype,customfield_10016,description,customfield_10020';
  
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
          description: issue.fields.description,
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
          customfield_10020: issue.fields.customfield_10020 || [],
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
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.warn(`Invalid email format provided: "${email}". Skipping user lookup.`);
      return null;
    }
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
    const projectId = formData.get('projectId') as string;
    const projectKey = formData.get('projectKey') as string;
    const credentialsString = formData.get('credentials') as string;

    if (!file || !projectId || !credentialsString || !projectKey) {
      return { success: false, error: "Missing required data: file, project ID, project key, or credentials." };
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
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = xlsx.utils.sheet_to_json(worksheet, {
            defval: "", 
        });

        if (data.length > 0) {
            headers = Object.keys(data[0]);
        } else {
            return { success: false, error: 'The uploaded file is empty or could not be read.' };
        }
    } catch(e) {
        console.error("File parsing error:", e);
        return { success: false, error: "Failed to parse the uploaded file. Please ensure it's a valid CSV or Excel file." };
    }
  
    const requiredHeaders = ['Summary', 'Issue Type'];
    for (const header of requiredHeaders) {
      if (!headers?.includes(header)) {
        return { success: false, error: `Missing required header: ${header}. Please use the template.` };
      }
    }
  
    try {
      const issueTypesResult = await getIssueTypesForProject(projectId, credentials);
      if (issueTypesResult.error || !issueTypesResult.issueTypes) {
        throw new Error(issueTypesResult.error || 'Could not fetch project configuration (issue types). Please ensure the project exists and you have permissions.');
      }
      const projectIssueTypes = issueTypesResult.issueTypes;
      const validIssueTypesMap = new Map(projectIssueTypes.map(it => [it.name.toLowerCase(), it]));

      const issueCreationFailures: string[] = [];
      const issuePayloads = await Promise.all(data.map(async (row: any, index: number) => {
        const rowNum = index + 2;
        if (!row.Summary || !row['Issue Type']) {
          return null; 
        }

        const issueTypeName = String(row['Issue Type']).trim().toLowerCase();
        const issueType = validIssueTypesMap.get(issueTypeName);
        
        if (!issueType) {
          const validNames = Array.from(validIssueTypesMap.keys()).join(', ');
          issueCreationFailures.push(`Row ${rowNum}: Invalid issue type "${row['Issue Type']}". Valid types for this project are: ${validNames}.`);
          return null;
        }
        
        const parentKey = row['Parent Key'];
        if (issueType.subtask && !parentKey) {
            issueCreationFailures.push(`Row ${rowNum}: Sub-task "${row.Summary}" is missing a 'Parent Key'.`);
            return null;
        }
        
        const assigneeEmail = row['Assignee (Email)'];
        const reporterEmail = row['Reporter (Email)'];
        
        const [assignee, reporter] = await Promise.all([
            assigneeEmail ? findUserByEmail(assigneeEmail, domain, encodedCredentials) : null,
            reporterEmail ? findUserByEmail(reporterEmail, domain, encodedCredentials) : findUserByEmail(currentUserEmail, domain, encodedCredentials)
        ]);
        
        const storyPoints = row['Story Points'] ? parseFloat(row['Story Points']) : null;

        const baseFields: any = {
            project: { id: projectId },
            summary: row.Summary,
            description: {
              type: 'doc',
              version: 1,
              content: row.Description ? [{ type: 'paragraph', content: [{ type: 'text', text: row.Description }] }] : [],
            },
            issuetype: { id: issueType.id },
        };

        if (assignee?.accountId) {
            baseFields.assignee = { accountId: assignee.accountId };
        }
        if (reporter?.accountId) {
            baseFields.reporter = { accountId: reporter.accountId };
        }
        if (storyPoints && !isNaN(storyPoints)) {
            baseFields.customfield_10016 = storyPoints;
        }
                
        if (issueType.subtask && parentKey) {
            baseFields.parent = { key: parentKey };
        }
        
        // This is the rewritten Epic handling logic.
        if (issueType.name.toLowerCase() === 'epic') {
            // Jira requires the "Epic Name" custom field to be set.
            // The standard ID for this field is 'customfield_10011'.
            baseFields.customfield_10011 = row.Summary;
        }

        return { fields: baseFields };
      }));
      
      const validPayloads = issuePayloads.filter(p => p !== null);

      if (validPayloads.length === 0) {
        const errorSummary = issueCreationFailures.length > 0 ? issueCreationFailures.join(' ') : 'No valid issues found in the file to import.';
        return { success: false, error: errorSummary };
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
      
      const failedCount = (result.errors?.length || 0) + issueCreationFailures.length;
      const createdCount = result.issues?.length || 0;

      if (failedCount > 0) {
        const apiErrorDetails = (result.errors || []).map((e:any, i: number) => {
            const failedIssueSummary = validPayloads[e.failedElementNumber]?.fields?.summary;
            const errorMessages = e.elementErrors?.errorMessages?.join(', ') || "An unspecified error occurred.";
            return `Issue "${failedIssueSummary}": ${errorMessages}`;
        }).join('; ');
        
        const failureSummary = [...issueCreationFailures, apiErrorDetails].filter(Boolean).join('; ');
        const errorMessage = `Import complete. ${createdCount} issues created, ${failedCount} failed. Failures: ${failureSummary}`;
        return { success: false, error: errorMessage, details: result };
      }

      return { success: true, details: result };

    } catch (error) {
      console.error('Bulk create error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'An unexpected server error occurred.' };
    }
  }

export async function getUsersForProject(
    projectKey: string,
    credentials: Credentials
  ): Promise<{ users?: JiraUser[]; error?: string }> {
    if (!credentials) {
      return { error: 'Authentication required.' };
    }
    const { email, domain, apiToken } = credentials;
    const encodedCredentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
  
    try {
      const response = await fetch(`https://${domain}/rest/api/3/user/assignable/search?project=${projectKey}`, {
          headers: { Authorization: `Basic ${encodedCredentials}` },
          cache: 'no-store',
      });
      if (!response.ok) {
        const errorText = await response.text();
        return { error: `Failed to fetch users. Status: ${response.status}. ${errorText}` };
      }
      const users: JiraUser[] = await response.json();
      return { users };
    } catch (error) {
      console.error('Error fetching assignable users:', error);
      return { error: 'Could not connect to Jira to fetch users.' };
    }
}

export async function getPriorities(
    credentials: Credentials
  ): Promise<{ priorities?: JiraPriority[]; error?: string }> {
    if (!credentials) {
      return { error: 'Authentication required.' };
    }
    const { email, domain, apiToken } = credentials;
    const encodedCredentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
  
    try {
      const response = await fetch(`https://${domain}/rest/api/3/priority`, {
          headers: { Authorization: `Basic ${encodedCredentials}` },
          cache: 'no-store',
      });
      if (!response.ok) {
        const errorText = await response.text();
        return { error: `Failed to fetch priorities. Status: ${response.status}. ${errorText}` };
      }
      const priorities: JiraPriority[] = await response.json();
      return { priorities };
    } catch (error) {
      console.error('Error fetching priorities:', error);
      return { error: 'Could not connect to Jira to fetch priorities.' };
    }
}

export async function getEditMeta(
  issueKey: string,
  credentials: Credentials
): Promise<{ fields?: any; error?: string }> {
  if (!credentials) {
    return { error: 'Authentication required.' };
  }
  const { email, domain, apiToken } = credentials;
  const encodedCredentials = Buffer.from(`${email}:${apiToken}`).toString('base64');

  try {
    const response = await fetch(`https://${domain}/rest/api/3/issue/${issueKey}/editmeta`, {
      headers: { Authorization: `Basic ${encodedCredentials}` },
      cache: 'no-store',
    });
    if (!response.ok) {
        const errorText = await response.text().catch(() => `Status code: ${response.status}`);
        try {
            const errorJson = JSON.parse(errorText);
            const specificError = errorJson?.errorMessages?.join(' ');
            if (specificError) {
              return { error: `Failed to fetch edit metadata: ${specificError}` };
            }
            return { error: `Failed to fetch edit metadata. Field 'priority' cannot be set. It is not on the appropriate screen, or unknown.` };
        } catch {
             return { error: `Failed to fetch edit metadata. Status: ${response.status}.` };
        }
    }
    const meta = await response.json();
    return { fields: meta.fields };
  } catch (error) {
    console.error('Error fetching edit metadata:', error);
    return { error: 'Could not connect to Jira to fetch edit metadata.' };
  }
}

export async function getAvailableTransitions(
    issueKey: string,
    credentials: Credentials
  ): Promise<{ transitions?: JiraTransition[]; error?: string }> {
    if (!credentials) {
      return { error: 'Authentication required.' };
    }
    const { email, domain, apiToken } = credentials;
    const encodedCredentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
  
    try {
      const response = await fetch(`https://${domain}/rest/api/3/issue/${issueKey}/transitions`, {
        headers: { Authorization: `Basic ${encodedCredentials}` },
        cache: 'no-store',
      });
      if (!response.ok) {
        const errorText = await response.text();
        return { error: `Failed to fetch transitions. Status: ${response.status}. ${errorText}` };
      }
      const data = await response.json();
      return { transitions: data.transitions };
    } catch (error) {
      console.error('Error fetching transitions:', error);
      return { error: 'Could not connect to Jira to fetch transitions.' };
    }
}

export async function transitionIssue(
    issueKey: string,
    transitionId: string,
    credentials: Credentials
  ): Promise<{ success: boolean; error?: string }> {
    if (!credentials) {
      return { success: false, error: 'Authentication required.' };
    }
    const { email, domain, apiToken } = credentials;
    const encodedCredentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
  
    try {
      const response = await fetch(`https://${domain}/rest/api/3/issue/${issueKey}/transitions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${encodedCredentials}`,
        },
        body: JSON.stringify({ transition: { id: transitionId } }),
      });
  
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMessage = errorBody?.errorMessages?.join(' ') || 'An unknown error occurred while transitioning the issue.';
        return { success: false, error: errorMessage };
      }
  
      return { success: true };
    } catch (error) {
      console.error('Error transitioning issue:', error);
      return { success: false, error: 'Could not connect to Jira to transition the issue.' };
    }
  }


function parseDescription(description: JiraIssue['description']): string {
  if (!description || !description.content) return '';
  return description.content
    .filter(block => block.type === 'paragraph')
    .map(block => 
      block.content
        ?.filter(inline => inline.type === 'text')
        .map(inline => inline.text)
        .join('') || ''
    )
    .join('\n');
}

export async function updateIssue(
  issue: JiraIssue,
  formData: FormData,
  credentials: Credentials
): Promise<{ success: boolean; error?: string }> {
  if (!credentials) {
    return { success: false, error: 'Authentication required.' };
  }
  
  const { email, domain, apiToken } = credentials;
  const encodedCredentials = Buffer.from(`${email}:${apiToken}`).toString('base64');

  const fields: any = {};
  let transitionResult: { success: boolean; error?: string } = { success: true };

  const summary = formData.get('summary') as string;
  const description = formData.get('description') as string | null;
  const assigneeId = formData.get('assignee') as string | null;
  const priorityId = formData.get('priority') as string | null;
  const statusId = formData.get('status') as string | null;
  
  // Handle status transition separately
  if (statusId && statusId !== issue.status.id) {
    const availableTransitions = await getAvailableTransitions(issue.key, credentials);
    if (availableTransitions.transitions?.find(t => t.id === statusId)) {
        transitionResult = await transitionIssue(issue.key, statusId, credentials);
    }
  }

  // Handle other field updates
  if (summary && summary !== issue.summary) {
    fields.summary = summary;
  }

  const originalDescription = parseDescription(issue.description);
  const newDescription = description ?? '';
  if (newDescription !== originalDescription) {
    fields.description = {
      type: 'doc',
      version: 1,
      content: newDescription ? [{ type: 'paragraph', content: [{ type: 'text', text: newDescription }] }] : [],
    };
  }

  const originalAssigneeId = issue.assignee?.accountId || 'unassigned';
  const newAssigneeId = assigneeId || 'unassigned';
  if (newAssigneeId !== originalAssigneeId) {
    fields.assignee = newAssigneeId === 'unassigned' ? null : { accountId: newAssigneeId };
  }

  const originalPriorityId = issue.priority?.id;
  if (priorityId && priorityId !== originalPriorityId) {
    fields.priority = { id: priorityId };
  }

  if (Object.keys(fields).length > 0) {
    try {
      const response = await fetch(`https://${domain}/rest/api/3/issue/${issue.key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${encodedCredentials}`,
        },
        body: JSON.stringify({ fields }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        console.error("Jira API Error:", JSON.stringify(errorBody, null, 2));
        
        let errorMessage = "An unknown error occurred while updating the issue.";
        if (errorBody?.errorMessages?.length > 0) {
            errorMessage = errorBody.errorMessages.join(' ');
        }
        if (errorBody?.errors) {
            const fieldErrors = Object.entries(errorBody.errors)
                .map(([field, message]) => `${field}: ${message}`)
                .join('; ');
            if (fieldErrors) {
                errorMessage += ` ${fieldErrors}`;
            }
        }
        
        const combinedError = [transitionResult.error, errorMessage].filter(Boolean).join(' | ');
        return { success: false, error: combinedError || "An unknown error occurred." };
      }
    } catch (error) {
      console.error('Error updating issue:', error);
       const combinedError = [transitionResult.error, 'Failed to connect to Jira to update the issue.'].filter(Boolean).join(' | ');
      return { success: false, error: combinedError };
    }
  }

  if (!transitionResult.success) {
      return transitionResult;
  }
  
  return { success: true };
}


export async function createIssue(
    data: CreateIssueFormValues,
    credentials: Credentials
  ): Promise<{ success: boolean; error?: string, issueKey?: string }> {
    if (!credentials) {
      return { success: false, error: 'Authentication required.' };
    }
  
    const { email, domain, apiToken } = credentials;
    const encodedCredentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
  
    const fields: any = {
      project: { id: data.projectId },
      issuetype: { id: data.issueTypeId },
      summary: data.summary,
    };
  
    if (data.description) {
      fields.description = {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: data.description }] }],
      };
    }
  
    if (data.assigneeId && data.assigneeId !== 'unassigned') {
      fields.assignee = { accountId: data.assigneeId };
    }
    
    try {
      const response = await fetch(`https://${domain}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${encodedCredentials}`,
        },
        body: JSON.stringify({ fields }),
      });
  
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        console.error("Jira API Error:", JSON.stringify(errorBody, null, 2));
        const errorMessage = errorBody?.errorMessages?.join(' ') || 'An unknown error occurred while creating the issue.';
        const fieldErrors = Object.values(errorBody?.errors || {}).join(' ');
        return { success: false, error: `${errorMessage} ${fieldErrors}`.trim() };
      }
  
      const newIssue = await response.json();
      return { success: true, issueKey: newIssue.key };
  
    } catch (error) {
      console.error('Error creating issue:', error);
      return { success: false, error: 'Failed to connect to Jira to create the issue.' };
    }
}
  
export async function generateDynamicCsvTemplate(
    projectId: string,
    credentials: Credentials,
): Promise<{ success: boolean; csvContent?: string; error?: string; }> {
    if (!credentials) {
        return { success: false, error: 'Authentication required.' };
    }

    const issueTypesResult = await getIssueTypesForProject(projectId, credentials);
    if (issueTypesResult.error || !issueTypesResult.issueTypes) {
        return { success: false, error: issueTypesResult.error || "Could not fetch issue types for the selected project." };
    }

    const headers = ['Summary', 'Description', 'Assignee (Email)', 'Reporter (Email)', 'Issue Type', 'Story Points', 'Parent Key'];
    
    const exampleRows = issueTypesResult.issueTypes
    .filter(it => !it.subtask) // Don't include sub-tasks in the main example rows
    .map(issueType => {
        let storyPoints = '';
        if (issueType.name.toLowerCase() === 'story') {
            storyPoints = '5';
        }

        return [
            `Example ${issueType.name} Summary`,
            `A description for the ${issueType.name}.`,
            `user@example.com`,
            `reporter@example.com`,
            issueType.name,
            storyPoints,
            '' // Parent Key is empty for non-subtasks
        ];
    });

    const formatCell = (cell: string) => {
        const strCell = String(cell ?? '');
        if (strCell.includes(',') || strCell.includes('"') || strCell.includes('\n')) {
            return `"${strCell.replace(/"/g, '""')}"`;
        }
        return strCell;
    };
    
    let allRows = [headers, ...exampleRows];
    
    const subtaskType = issueTypesResult.issueTypes.find(it => it.subtask);
    if (subtaskType) {
      // Add an example row for a subtask
      allRows.push([
        'Example Subtask',
        'This is a subtask and needs a parent.',
        'user@example.com',
        'reporter@example.com',
        subtaskType.name,
        '',
        'PROJ-123' // Placeholder parent key
      ]);
      allRows.push([]); 
      const subtaskNote = `NOTE for Sub-tasks: To create a sub-task, replace the placeholder 'PROJ-123' in the 'Parent Key' column with the key of an *existing* parent issue. A sub-task cannot be created in the same import file as its parent.`;
      const noteRow = [subtaskNote];
      allRows.push(noteRow);
    }
    
    const csvContent = allRows.map(row => row.map(formatCell).join(',')).join('\n');

    return { success: true, csvContent };
}

export type State = {
    errors?: {
      email?: string[];
      domain?: string[];
      apiToken?: string[];
      api?: string[];
    };
    message?: string | null;
  };

