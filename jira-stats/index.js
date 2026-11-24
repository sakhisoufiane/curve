import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: `${__dirname}/.env` });

// Validate environment variables
const requiredEnvVars = ['JIRA_EMAIL', 'JIRA_API_TOKEN', 'JIRA_DOMAIN', 'JIRA_PROJECT'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Error: ${envVar} is not set in .env file`);
        process.exit(1);
    }
}

// Create Jira API client
const jiraClient = axios.create({
    baseURL: `https://${process.env.JIRA_DOMAIN}/rest/api/3`,
    auth: {
        username: process.env.JIRA_EMAIL,
        password: process.env.JIRA_API_TOKEN
    }
});

function calculateTimeInProgress(changelog) {
    if (!changelog?.values) return 0;

    let totalTimeInProgress = 0;
    let enteredInProgress = null;

    for (const history of changelog.values) {
        for (const item of history.items) {
            if (item.field === 'status') {
                // Debug log to see the status changes
                console.log(`Status change: ${item.fromString} -> ${item.toString} at ${history.created}`);
                
                // Check for both "In Progress" and "IN PROGRESS"
                if (item.toString === 'In Progress' || item.toString === 'IN PROGRESS') {
                    enteredInProgress = new Date(history.created);
                    console.log(`Entered In Progress at ${history.created}`);
                } else if (enteredInProgress) {
                    const exitTime = new Date(history.created);
                    const duration = exitTime - enteredInProgress;
                    totalTimeInProgress += duration;
                    console.log(`Exited In Progress at ${history.created}, duration: ${formatDuration(duration)}`);
                    enteredInProgress = null;
                }
            }
        }
    }

    // If still in progress, calculate until now
    if (enteredInProgress) {
        const duration = new Date() - enteredInProgress;
        totalTimeInProgress += duration;
        console.log(`Still in Progress, current duration: ${formatDuration(duration)}`);
    }

    return totalTimeInProgress;
}

function formatDuration(ms) {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '0m';
}

async function getIssueChangelog(issueKey) {
    try {
        const response = await jiraClient.get(`/issue/${issueKey}/changelog`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching changelog for ${issueKey}:`, error.message);
        return null;
    }
}

function getGroupKey(issue) {
    // Try to get the custom field value first
    const customFieldValue = issue.fields.customfield_10119?.[0]?.displayName;
    if (customFieldValue) {
        return customFieldValue;
    }
    // Return 'No Developer' when custom field is not filled
    return 'No Developer';
}

async function getTicketsUpdatedThisMonth() {
    try {
        // Get the first and last day of the current month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Format dates for Jira API
        const startDate = firstDayOfMonth.toISOString().split('T')[0];
        const endDate = lastDayOfMonth.toISOString().split('T')[0];

        // Search for issues updated this month
        const response = await jiraClient.post('/search', {
            jql: `project = "${process.env.JIRA_PROJECT}" AND updated >= "${startDate}" AND updated <= "${endDate}" ORDER BY updated DESC`,
            fields: ['key', 'summary', 'status', 'updated', 'assignee', 'fields', 'customfield_10119'],
            maxResults: 5
        });

        const issues = response.data.issues;
        
        // Fetch changelog for each issue
        for (const issue of issues) {
            // console.log(JSON.stringify(issue));
            const changelog = await getIssueChangelog(issue.key);
            issue.timeInProgress = calculateTimeInProgress(changelog);
        }

        // Group issues by custom field or assignee
        const issuesByGroup = issues.reduce((acc, issue) => {
            const groupKey = getGroupKey(issue);
            if (!acc[groupKey]) {
                acc[groupKey] = [];
            }
            acc[groupKey].push(issue);
            return acc;
        }, {});

        console.log(`\nFound ${issues.length} tickets updated this month:\n`);
        
        // Display summary by group
        Object.entries(issuesByGroup).forEach(([groupKey, tickets]) => {
            console.log(`\n${groupKey} (${tickets.length} tickets):`);
            console.log('-------------------');
            tickets.forEach(issue => {
                console.log(`Key: ${issue.key}`);
                console.log(`Summary: ${issue.fields.summary}`);
                console.log(`Status: ${issue.fields.status.name}`);
                console.log(`Updated: ${new Date(issue.fields.updated).toLocaleString()}`);
                console.log(`Time in Progress: ${formatDuration(issue.timeInProgress)}`);
                console.log(`Developer: ${issue.fields.customfield_10119?.[0]?.displayName}`);
                console.log('-------------------');
            });

            // Calculate total time in progress for this group
            const totalTimeInProgress = tickets.reduce((sum, issue) => sum + issue.timeInProgress, 0);
            console.log(`Total time in Progress for ${groupKey}: ${formatDuration(totalTimeInProgress)}`);
            console.log('-------------------');
        });

        // Display total statistics
        console.log('\nSummary:');
        console.log('-------------------');
        Object.entries(issuesByGroup).forEach(([groupKey, tickets]) => {
            const totalTimeInProgress = tickets.reduce((sum, issue) => sum + issue.timeInProgress, 0);
            console.log(`${groupKey}: ${tickets.length} tickets, Total time in Progress: ${formatDuration(totalTimeInProgress)}`);
        });

    } catch (error) {
        console.error('Error fetching Jira tickets:', error.response?.data || error.message);
        process.exit(1);
    }
}

// Run the script
getTicketsUpdatedThisMonth();
