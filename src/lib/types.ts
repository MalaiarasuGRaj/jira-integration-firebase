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

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  summary: string;
  status: {
    name: string;
    statusCategory: {
      key: string;
      name: string;
    };
  };
  assignee: JiraUser | null;
  reporter: JiraUser;
  priority: {
    name: string;
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
}
