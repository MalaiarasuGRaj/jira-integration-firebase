'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { JiraIssueType } from './types';

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