
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Folder,
  Grid,
  List,
  LogOut,
  Search,
  Settings,
  ExternalLink,
  Filter,
  ChevronDown,
  User,
  Ticket,
  Loader2
} from 'lucide-react';

import { logout, getIssueTypesForProject } from '@/lib/actions';
import type { JiraProject, JiraUser, JiraIssueType } from '@/lib/types';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from './ui/scroll-area';


function Header({ user }: { user: JiraUser | null }) {
  const router = useRouter();
  
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

const ProjectCard = ({ project, view, onClick }: { project: JiraProject; view: 'grid' | 'list', onClick: () => void }) => {
  const externalUrl = project.self ? `https://${new URL(project.self).hostname}/browse/${project.key}` : '#';

  if (view === 'list') {
    return (
      <Card key={project.id} className="rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
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
          <a href={externalUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon">
              <ExternalLink className='h-4 w-4 text-muted-foreground' />
            </Button>
          </a>
        </div>
      </Card>
    );
  }

  return (
    <Card key={project.id} className="flex flex-col rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
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
            <a href={externalUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
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
  const [selectedProject, setSelectedProject] = useState<JiraProject | null>(null);
  const [issueTypes, setIssueTypes] = useState<JiraIssueType[]>([]);
  const [isLoadingIssueTypes, setIsLoadingIssueTypes] = useState(false);
  const [issueTypeError, setIssueTypeError] = useState<string | null>(null);

  const projectTypes = ['all', ...Array.from(new Set(projects.map(p => p.projectTypeKey)))];

  const filteredProjects = projects.filter(project => {
    const searchMatch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        project.key.toLowerCase().includes(searchTerm.toLowerCase());
    const typeMatch = selectedType === 'all' || project.projectTypeKey === selectedType;
    return searchMatch && typeMatch;
  });

  const getExternalUrl = (project: JiraProject | null) => {
    if (!project || !project.self) return '#';
    try {
      return `https://${new URL(project.self).hostname}/browse/${project.key}`;
    } catch (error) {
      console.error("Invalid project URL:", project.self);
      return '#';
    }
  }

  const handleProjectClick = async (project: JiraProject) => {
    setSelectedProject(project);
    setIsLoadingIssueTypes(true);
    setIssueTypeError(null);
    setIssueTypes([]);
    
    const result = await getIssueTypesForProject(project.id);
    
    if (result.error) {
      setIssueTypeError(result.error);
    } else if (result.issueTypes) {
      setIssueTypes(result.issueTypes);
    }
    setIsLoadingIssueTypes(false);
  };
  
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
              <ProjectCard key={project.id} project={project} view={view} onClick={() => handleProjectClick(project)} />
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

      <Dialog open={selectedProject !== null} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="sm:max-w-[800px] p-0">
          {selectedProject && (
            <>
              {/* Header */}
              <DialogHeader className="p-4 border-b bg-muted/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 rounded-lg">
                      <AvatarImage src={selectedProject.avatarUrls['48x48']} alt={`${selectedProject.name} avatar`} />
                      <AvatarFallback>{selectedProject.key.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle>{selectedProject.name}</DialogTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{selectedProject.key}</Badge>
                        <Badge variant="outline" className="capitalize">{selectedProject.projectTypeKey}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={getExternalUrl(selectedProject)} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              </DialogHeader>

              {/* Main Content Area */}
              <div className="p-6 grid md:grid-cols-3 gap-6">
                {/* Project Information Section */}
                <div className="border rounded-lg p-4 md:col-span-2">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Settings className="h-5 w-5 mr-2" /> Project Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between col-span-2">
                      <span className="text-muted-foreground">Project Lead</span>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                           <AvatarImage src={selectedProject.lead.avatarUrls['48x48']} alt={`${selectedProject.lead.displayName} avatar`} />
                           <AvatarFallback>{selectedProject.lead.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{selectedProject.lead.displayName}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Project ID</span>
                      <span>{selectedProject.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Style</span>
                      <span>Next-Gen</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Access Level</span>
                      <Badge variant={selectedProject.insight ? 'default' : 'secondary'} className={cn(selectedProject.insight ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800', 'capitalize')}>
                        {selectedProject.insight ? 'Public' : 'Private'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-muted-foreground">Simplified</span>
                       <span>{selectedProject.simplified ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
                

                {/* Issue Types Section */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                     <Ticket className="h-5 w-5 mr-2" /> Issue Types
                  </h3>
                  {isLoadingIssueTypes ? (
                    <div className="flex items-center justify-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : issueTypeError ? (
                    <Alert variant="destructive" className="text-xs">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{issueTypeError}</AlertDescription>
                    </Alert>
                  ) : (
                    <ScrollArea className="h-48">
                      <div className="space-y-3 pr-4">
                          {issueTypes.map(issueType => (
                              <div key={issueType.id} className="flex items-center justify-between text-sm">
                                  <div className='flex items-center gap-2'>
                                    <img src={issueType.iconUrl} alt={issueType.name} className="h-4 w-4" />
                                    <span className="text-foreground">{issueType.name}</span>
                                  </div>
                                  <Badge variant="outline">{issueType.subtask ? 'Sub-task' : 'Standard'}</Badge>
                              </div>
                          ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
