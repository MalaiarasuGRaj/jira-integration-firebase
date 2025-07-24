# **App Name**: JiraLink

## Core Features:

- Secure Login: A secure login form with fields for Jira Email, Jira Domain, and Jira API Token.
- Credential Validation: Authenticate the user against the Jira API (`GET https://<jira_domain>/rest/api/3/myself`). Display error messages for invalid credentials.
- Dashboard Redirect: Redirect to a dashboard upon successful login.
- Project Fetching: Fetch all projects the user has access to using the Jira API (`GET https://<jira_domain>/rest/api/3/project/search`).
- Project Display: Display a table of all the user's Jira projects, with Project Name, Key, Type, Lead, Status, Avatar, and Last Updated Time.

## Style Guidelines:

- Primary color: Soft blue (#72BCD4), reminiscent of the Atlassian brand colors without directly copying them.
- Background color: Very light grey (#F0F4F7), almost white, to keep the interface clean and unobtrusive.
- Accent color: Teal (#26A69A), a brighter color providing clear visual contrast for interactive elements.
- Body and headline font: 'Inter', a grotesque-style sans-serif with a modern look.
- A clean, card-based layout for displaying project information.