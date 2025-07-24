
'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Folder,
  Grid,
  List,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  ExternalLink,
  Filter
} from 'lucide-react';

import { logout } from '@/lib/actions';
import type { JiraProject, JiraUser } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Separator } from './ui/separator';

function Header({ user }: { user: JiraUser | null }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-8">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground text-2xl font-bold">
          J
        </div>
        <div>
          <h1 className="text-xl font-bold">Jira Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome, {user?.emailAddress}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <RefreshCw className="h-5 w-5" />
        </Button>
        <form action={logout}>
           <Button variant="ghost" type="submit">
            <LogOut className="mr-2 h-5 w-5" />
            <span>Logout</span>
          </Button>
        </form>
      </div>
    </header>
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
  const [view, setView] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.key.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header user={user} />
      <main className="flex-1 p-8">
        <div className="mb-6">
            <h2 className="text-3xl font-bold tracking-tight">Your Projects</h2>
            <p className="text-muted-foreground">{filteredProjects.length} of {projects.length} projects</p>
        </div>
        <div className="mb-6 flex items-center justify-between gap-4">
            <div className='relative w-full max-w-sm'>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search projects..." 
                className="pl-10 bg-card" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className='flex items-center gap-2'>
              <Button variant="outline" className="bg-card">
                <Filter className="mr-2 h-4 w-4" />
                All Types
              </Button>
              <div className='flex items-center rounded-md border bg-card p-0.5'>
                 <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('grid')}>
                    <Grid className='h-5 w-5' />
                 </Button>
                 <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('list')}>
                    <List className='h-5 w-5' />
                 </Button>
              </div>
            </div>
        </div>

        {apiError && (
             <Alert variant="destructive">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Error</AlertTitle>
             <AlertDescription>{apiError}</AlertDescription>
           </Alert>
        )}
        
        {filteredProjects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="flex flex-col rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex-grow space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 rounded-lg">
                        <img src={project.avatarUrls['48x48']} alt={`${project.name} avatar`} className="aspect-square h-full w-full rounded-lg" />
                        <AvatarFallback>{project.key.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg">{project.name}</h3>
                        <div className="text-sm text-muted-foreground">
                          <Badge variant="secondary" className="mr-1 rounded-sm">{project.key}</Badge> 
                          Software
                        </div>
                      </div>
                    </div>
                     <a href={`https://${new URL(project.self).hostname}/browse/${project.key}`} target="_blank" rel="noopener noreferrer">
                       <Button variant="ghost" size="icon" className='-mt-2 -mr-2'>
                         <ExternalLink className='h-4 w-4 text-muted-foreground' />
                       </Button>
                     </a>
                  </div>
                  <div className='flex justify-between items-center text-sm'>
                      <div className='space-y-3'>
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4 text-muted-foreground" />
                          <span>Style</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          <span>Access</span>
                        </div>
                      </div>
                      <div className='text-right'>
                        <p>Next-Gen</p>
                        <Badge className='bg-green-100 text-green-800 hover:bg-green-100/80 rounded-full mt-1'>Public</Badge>
                      </div>
                  </div>
                </CardContent>
                <Separator />
                <CardFooter className="p-4 text-xs text-muted-foreground justify-between">
                    <span>Components: 0</span>
                    <span>Issue Types: 0</span>
                    <span>Versions: 0</span>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          !apiError && (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm min-h-[400px]">
              <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-2xl font-bold tracking-tight">
                  No projects found
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your search for "{searchTerm}" did not return any results.
                </p>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}
