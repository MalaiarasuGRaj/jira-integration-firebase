
'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  Briefcase,
  Calendar,
  ChevronDown,
  Code,
  LogOut,
  User,
} from 'lucide-react';
import Image from 'next/image';

import { logout } from '@/lib/actions';
import type { JiraProject, JiraUser } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';

function UserNav({ user }: { user: JiraUser | null }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            {user?.avatarUrls?.['48x48'] && <AvatarImage src={user.avatarUrls['48x48']} alt={user.displayName} />}
            <AvatarFallback>
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.emailAddress}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={logout}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardClient({
  projects,
  user,
  apiError
}: {
  projects: JiraProject[];
  user: JiraUser | null;
  apiError?: string;
}) {

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <div className="flex items-center gap-2">
           <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-primary"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path>
            </svg>
          <h1 className="text-xl font-semibold">JiraLink</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <UserNav user={user} />
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className='flex items-center justify-between'>
            <h2 className="text-2xl font-semibold leading-none tracking-tight">Your Projects</h2>
        </div>

        {apiError && (
             <Alert variant="destructive">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Error</AlertTitle>
             <AlertDescription>{apiError}</AlertDescription>
           </Alert>
        )}
        
        {projects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="mt-1">
                      <img src={project.avatarUrls['48x48']} alt={`${project.name} avatar`} className="aspect-square h-full w-full" />
                      <AvatarFallback>{project.key.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{project.name}</CardTitle>
                      <CardDescription>{project.key}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Briefcase className="h-4 w-4" />
                        <span className="capitalize">{project.projectTypeKey} project</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div className="flex items-center gap-2">
                           <Avatar className='h-6 w-6'>
                             <img src={project.lead.avatarUrls['48x48']} alt={project.lead.displayName} className="aspect-square h-full w-full"/>
                             <AvatarFallback>{project.lead.displayName.charAt(0)}</AvatarFallback>
                           </Avatar>
                           <span>{project.lead.displayName}</span>
                        </div>
                    </div>
                 
                </CardContent>
                <CardFooter>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Updated{' '}
                    {project.insight?.lastIssueUpdateTime
                      ? formatDistanceToNow(new Date(project.insight.lastIssueUpdateTime), { addSuffix: true })
                      : 'N/A'}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          !apiError && (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
              <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-2xl font-bold tracking-tight">
                  No projects found
                </h3>
                <p className="text-sm text-muted-foreground">
                  You don&apos;t have any Jira projects yet.
                </p>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}
