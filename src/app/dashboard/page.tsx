
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/dashboard-client';
import type { JiraProject, JiraUser } from '@/lib/types';

async function getProjects(credentials: {
  email: string;
  domain: string;
  apiToken: string;
}): Promise<{ projects: JiraProject[], user: JiraUser | null, error?: string }> {
  const { email, domain, apiToken } = credentials;
  const encodedCredentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
  
  try {
    // Fetch user and projects in parallel
    const [userResponse, projectsResponse] = await Promise.all([
      fetch(`https://${domain}/rest/api/3/myself`, {
        headers: { Authorization: `Basic ${encodedCredentials}` },
        cache: 'no-store',
      }),
      fetch(`https://${domain}/rest/api/3/project/search?expand=lead,insight`, {
        headers: { Authorization: `Basic ${encodedCredentials}` },
        cache: 'no-store',
      })
    ]);

    if (!userResponse.ok || !projectsResponse.ok) {
      const errorMsg = 'Failed to fetch data from Jira. Your token might have expired.';
      return { projects: [], user: null, error: errorMsg };
    }

    const user: JiraUser = await userResponse.json();
    const projectsData: { values: JiraProject[] } = await projectsResponse.json();
    
    return { projects: projectsData.values || [], user };
  } catch (error) {
    console.error("Error fetching projects or user:", error);
    return { projects: [], user: null, error: 'Could not connect to Jira or fetch initial data. Please check the domain and your connection.' };
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('jira-auth');

  if (!authCookie?.value) {
    redirect('/');
  }

  let credentials;
  try {
    credentials = JSON.parse(authCookie.value);
  } catch {
    // If cookie is malformed, just redirect to login
    redirect('/');
  }

  const { projects, user, error } = await getProjects(credentials);

  return <DashboardClient projects={projects} user={user} credentials={credentials} apiError={error} />;
}
