
export interface JiraUser {
  accountId: string;
  emailAddress?: string;
  avatarUrls: {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
  };
  displayName: string;
  active: boolean;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  self: string;
  projectTypeKey: string;
  simplified?: boolean;
  lead: JiraUser;
  avatarUrls: {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
  };
  insight?: {
    lastIssueUpdateTime: string;
    totalIssueCount: number;
  };
}

export interface JiraProjectSearchResponse {
  values: JiraProject[];
}

export interface JiraIssueType {
  self: string;
  id: string;
  description: string;
  iconUrl: string;
  name: string;
  subtask: boolean;
  avatarId: number;
  hierarchyLevel: number;
}

export interface JiraPriority {
  self: string;
  iconUrl: string;
  name: string;
  id: string;
}

export interface JiraTransition {
    id: string;
    name: string;
    to: {
      name: string;
      id: string;
      statusCategory: {
        key: string;
        name: string;
      };
    };
    isAvailable: boolean;
  }

export interface Sprint {
    id: number;
    name: string;
    state: 'active' | 'closed' | 'future';
    startDate?: string;
    endDate?: string;
    completeDate?: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  summary: string;
  description?: {
    type: 'doc',
    version: 1,
    content: any[],
  } | null;
  changelog?: {
    histories: {
      items: {
        field: string;
        toString: string;
      }[];
      created: string;
    }[];
  };
  status: {
    name: string;
    id: string;
    statusCategory: {
      key: string;
      name: string;
    };
  };
  assignee: JiraUser | null;
  reporter: JiraUser;
  priority: {
    name: string;
    id: string;
    iconUrl: string;
  };
  created: string;
  updated: string;
  labels: string[];
  parent?: {
    id: string;
    key: string;
    fields: {
      summary: string;
    };
  };
  issueType?: {
    name: string;
    iconUrl: string;
  };
  storyPoints?: number | null;
  customfield_10020?: Sprint[];
}
