
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { type JiraProject } from '@/lib/types';
import { type Credentials, bulkCreateIssues, generateDynamicCsvTemplate } from '@/lib/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Download, Loader2, UploadCloud } from 'lucide-react';

interface ImportIssuesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projects: JiraProject[];
  credentials: Credentials | null;
}

export function ImportIssuesDialog({
  isOpen,
  onClose,
  projects,
  credentials,
}: ImportIssuesDialogProps) {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<JiraProject | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        const fileType = selectedFile.type;
        const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (validTypes.includes(fileType) || selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
            setFile(selectedFile);
            setError(null);
        } else {
            setFile(null);
            setError('Please select a valid CSV or Excel file.');
        }
    }
  };

  const handleDownloadTemplate = async () => {
    if (!selectedProject || !credentials) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a project first."
      });
      return;
    }
    setIsDownloading(true);
    toast({
      title: "Generating Template...",
      description: `Fetching configuration for ${selectedProject.name}.`
    });

    const result = await generateDynamicCsvTemplate(selectedProject.id, credentials);
    
    setIsDownloading(false);

    if (result.success && result.csvContent) {
      const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${selectedProject.key}-import-template.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Template Downloaded",
        description: "Your project-specific template is ready."
      })
    } else {
      setError(result.error || "Failed to generate the CSV template.");
      toast({
        variant: "destructive",
        title: "Failed to Generate Template",
        description: result.error || "An unknown error occurred."
      })
    }
  };
  
  const resetState = () => {
    setSelectedProject(null);
    setFile(null);
    setIsImporting(false);
    setError(null);
  }

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleImport = async () => {
    if (!selectedProject || !file || !credentials) {
      setError('Please select a project and a file to import.');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', selectedProject.id);
        formData.append('projectKey', selectedProject.key);
        formData.append('credentials', JSON.stringify(credentials));

        const result = await bulkCreateIssues(formData);

        if (result.success) {
            toast({
                title: 'Import Successful',
                description: 'Your issues have been created in Jira.',
            });
            handleClose();
        } else {
            setError(result.error || 'An unknown error occurred during import.');
        }
    } catch (e) {
        setError('Failed to read the file or connect to the server.');
        console.error(e);
    } finally {
        setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Issues from File</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="project">1. Select Project</Label>
            <Select onValueChange={(value) => {
              const project = projects.find(p => p.id === value);
              setSelectedProject(project || null);
            }}
            value={selectedProject?.id || ''}
            >
              <SelectTrigger id="project">
                <SelectValue placeholder="Choose a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} ({project.key})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <div className="grid gap-2">
            <Label htmlFor="download-template">2. Download Template</Label>
            <Button id="download-template" variant="outline" className="justify-start" onClick={handleDownloadTemplate} disabled={!selectedProject || isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isDownloading ? "Generating..." : "Download Project-Specific Template"}
            </Button>
            <p className='text-xs text-muted-foreground'>Download a CSV template customized for the issue types available in your selected project.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="upload-file">3. Upload File</Label>
            <Input id="upload-file" type="file" accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileChange} disabled={!selectedProject}/>
          </div>
          {error && (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Import Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleImport} disabled={!selectedProject || !file || isImporting}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    