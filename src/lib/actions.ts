
'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { JiraIssue, JiraIssueType } from './types';

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
    const fields = 'summary,status,assignee,reporter,priority,created,updated,labels,parent,issuetype';
  
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

    