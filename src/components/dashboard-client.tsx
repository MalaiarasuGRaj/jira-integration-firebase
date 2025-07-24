'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  ChevronDown,
  LogOut,
  User,
} from 'lucide-react';
import Image from 'next/image';

import { logout } from '@/lib/actions';
import type { JiraProject, JiraUser } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
        {apiError && (
             <Alert variant="destructive">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Error</AlertTitle>
             <AlertDescription>{apiError}</AlertDescription>
           </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Your Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Avatar</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead className="hidden md:table-cell">Key</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead className="hidden sm:table-cell">Last Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length > 0 ? (
                  projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <Avatar>
                           {/* Using standard img tag to avoid next/image domain configuration for dynamic user domains */}
                           <img src={project.avatarUrls['48x48']} alt={`${project.name} avatar`} className="aspect-square h-full w-full" />
                           <AvatarFallback>{project.key}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{project.name}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{project.key}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="capitalize">{project.projectTypeKey}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <Avatar className='h-6 w-6'>
                             <img src={project.lead.avatarUrls['48x48']} alt={project.lead.displayName} className="aspect-square h-full w-full"/>
                             <AvatarFallback>{project.lead.displayName.charAt(0)}</AvatarFallback>
                           </Avatar>
                           <span>{project.lead.displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {project.insight?.lastIssueUpdateTime
                          ? formatDistanceToNow(new Date(project.insight.lastIssueUpdateTime), { addSuffix: true })
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                     {!apiError && "No projects found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
