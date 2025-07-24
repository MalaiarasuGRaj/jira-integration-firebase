
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Filter,
  ChevronDown
} from 'lucide-react';

import { logout } from '@/lib/actions';
import type { JiraProject, JiraUser } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';


function Header({ user, onRefresh }: { user: JiraUser | null, onRefresh: () => void }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
    // Simulate a delay for visual feedback
    setTimeout(() => setIsRefreshing(false), 1000);
  };
  
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-8">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground text-2xl font-bold">
          J
        </div>
        <div>
          <h1 className="text-xl font-bold">Jira Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome, {user?.displayName}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
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

const ProjectCard = ({ project, view }: { project: JiraProject; view: 'grid' | 'list' }) => {
  if (view === 'list') {
    return (
      <Card key={project.id} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10 rounded-lg">
              <AvatarImage src={project.avatarUrls['48x48']} alt={`${project.name} avatar`} />
              <AvatarFallback>{project.key.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className='w-48'>
              <p className="font-semibold truncate">{project.name}</p>
              <p className="text-sm text-muted-foreground">{project.key}</p>
            </div>
          </div>
          <div className='w-32'>
            <p className='capitalize text-muted-foreground'>{project.projectTypeKey}</p>
          </div>
          <div className="flex items-center gap-2 w-48">
              <Avatar className="h-6 w-6">
                <AvatarImage src={project.lead.avatarUrls['48x48']} alt={`${project.lead.displayName} avatar`} />
                <AvatarFallback>{project.lead.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className='text-sm text-muted-foreground'>{project.lead.displayName}</span>
          </div>
          <div className='w-24'>
             <Badge variant={project.insight ? 'default' : 'secondary'} className={cn(project.insight ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800', 'capitalize')}>{project.insight ? 'Active' : 'Inactive'}</Badge>
          </div>
          <a href={`https://${new URL(project.self).hostname}/browse/${project.key}`} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon">
              <ExternalLink className='h-4 w-4 text-muted-foreground' />
            </Button>
          </a>
        </div>
      </Card>
    );
  }

  return (
    <Card key={project.id} className="flex flex-col rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12 rounded-lg">
                <AvatarImage src={project.avatarUrls['48x48']} alt={`${project.name} avatar`} />
                <AvatarFallback>{project.key.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{project.name}</CardTitle>
                <div className="text-sm text-muted-foreground flex items-center mt-1">
                  <Badge variant="secondary" className="mr-1 rounded-sm">{project.key}</Badge> 
                  <span className='capitalize'>{project.projectTypeKey}</span>
                </div>
              </div>
            </div>
            <a href={`https://${new URL(project.self).hostname}/browse/${project.key}`} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className='-mt-2 -mr-2'>
                <ExternalLink className='h-4 w-4 text-muted-foreground' />
              </Button>
            </a>
          </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={project.lead.avatarUrls['48x48']} alt={`${project.lead.displayName} avatar`} />
              <AvatarFallback>{project.lead.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground">{project.lead.displayName}</span>
          </div>
          <Badge variant={project.insight ? 'default' : 'secondary'} className={cn(project.insight ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800', 'capitalize')}>{project.insight ? 'Active' : 'Inactive'}</Badge>
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="p-4 text-xs text-muted-foreground justify-between">
          <div className="flex items-center gap-1">
            <Folder className="h-3 w-3" />
            <span>Next-Gen</span>
          </div>
          <div className="flex items-center gap-1">
            <Settings className="h-3 w-3" />
            <span>Public</span>
          </div>
      </CardFooter>
    </Card>
  )
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
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const projectTypes = ['all', ...Array.from(new Set(projects.map(p => p.projectTypeKey)))];

  const filteredProjects = projects.filter(project => {
    const searchMatch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        project.key.toLowerCase().includes(searchTerm.toLowerCase());
    const typeMatch = selectedType === 'all' || project.projectTypeKey === selectedType;
    return searchMatch && typeMatch;
  });
  
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header user={user} onRefresh={() => router.refresh()} />
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-card">
                    <Filter className="mr-2 h-4 w-4" />
                    {selectedType === 'all' ? 'All Types' : selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {projectTypes.map(type => (
                     <DropdownMenuCheckboxItem
                        key={type}
                        checked={selectedType === type}
                        onCheckedChange={() => setSelectedType(type)}
                        className="capitalize"
                      >
                        {type === 'all' ? 'All Types' : type}
                      </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

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
           <div className={cn({
            "grid gap-6 md:grid-cols-2 lg:grid-cols-3": view === 'grid',
            "flex flex-col gap-4": view === 'list'
          })}>
            {view === 'list' && (
              <div className="flex items-center justify-between px-4 py-2 text-sm font-medium text-muted-foreground bg-muted rounded-lg">
                <div className='w-60'>Project</div>
                <div className='w-32'>Type</div>
                <div className='w-48'>Lead</div>
                <div className='w-24'>Status</div>
                <div className='w-12'></div>
              </div>
            )}
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} view={view} />
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
