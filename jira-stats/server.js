import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

function isBusinessDay(date) {
    const day = date.getDay();
    return day !== 0 && day !== 6; // 0 is Sunday, 6 is Saturday
}

function isWorkingHour(date) {
    const hour = date.getHours();
    return hour >= 9 && hour < 17; // 9 AM to 5 PM
}

function getBusinessTimeBetween(startDate, endDate) {
    let currentDate = new Date(startDate);
    let totalTime = 0;

    while (currentDate < endDate) {
        if (isBusinessDay(currentDate)) {
            const dayStart = new Date(currentDate);
            dayStart.setHours(9, 0, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(17, 0, 0, 0);

            // If it's the same day, only count the actual time between
            if (currentDate.toDateString() === startDate.toDateString()) {
                const effectiveStart = new Date(Math.max(startDate, dayStart));
                const effectiveEnd = new Date(Math.min(endDate, dayEnd));
                if (effectiveStart < effectiveEnd) {
                    totalTime += effectiveEnd - effectiveStart;
                }
            } else if (currentDate.toDateString() === endDate.toDateString()) {
                const effectiveStart = new Date(Math.max(startDate, dayStart));
                const effectiveEnd = new Date(Math.min(endDate, dayEnd));
                if (effectiveStart < effectiveEnd) {
                    totalTime += effectiveEnd - effectiveStart;
                }
            } else {
                // Full working day
                totalTime += 8 * 60 * 60 * 1000; // 8 hours in milliseconds
            }
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return totalTime;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function calculateTimeInProgress(changelog) {
    if (!changelog?.values) return { timeInProgress: 0, statusHistory: [], reopenHistory: [] };

    let totalTimeInProgress = 0;
    let enteredInProgress = null;
    let statusHistory = [];
    let reopenHistory = [];
    let lastStatus = null;

    for (const history of changelog.values) {
        for (const item of history.items) {
            if (item.field === 'status') {
                const isReopening = 
                    (item.toString === 'To Do' && lastStatus && lastStatus !== 'In Progress' && lastStatus !== 'To Do' && lastStatus !== 'Triage') ||
                    (item.toString === 'In Progress' && lastStatus && lastStatus !== 'To Do' && lastStatus !== 'In Progress' && lastStatus !== 'Triage');

                if (isReopening) {
                    reopenHistory.push({
                        date: formatDate(history.created),
                        fromStatus: item.fromString || 'Unknown',
                        toStatus: item.toString,
                        author: history.author?.displayName || 'Unknown'
                    });
                }
                
                lastStatus = item.toString;
                
                if (item.toString === 'In Progress' || item.toString === 'IN PROGRESS') {
                    enteredInProgress = new Date(history.created);
                    statusHistory.push({
                        type: 'entered',
                        date: formatDate(history.created),
                        fromStatus: item.fromString || 'Unknown',
                        author: history.author?.displayName || 'Unknown'
                    });
                } else if (enteredInProgress) {
                    const exitTime = new Date(history.created);
                    totalTimeInProgress += getBusinessTimeBetween(enteredInProgress, exitTime);
                    statusHistory.push({
                        type: 'left',
                        date: formatDate(history.created),
                        duration: formatDuration(getBusinessTimeBetween(enteredInProgress, exitTime)),
                        toStatus: item.toString || 'Unknown',
                        author: history.author?.displayName || 'Unknown'
                    });
                    enteredInProgress = null;
                }
            }
        }
    }

    if (enteredInProgress) {
        const now = new Date();
        totalTimeInProgress += getBusinessTimeBetween(enteredInProgress, now);
        statusHistory.push({
            type: 'current',
            date: 'Currently in Progress',
            duration: formatDuration(getBusinessTimeBetween(enteredInProgress, now))
        });
    }

    return { timeInProgress: totalTimeInProgress, statusHistory, reopenHistory };
}

function formatDuration(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '0m';
}

function getGroupKey(issue) {
    const customFieldValue = issue.fields.customfield_10119?.[0]?.displayName;
    if (customFieldValue) {
        return customFieldValue;
    }
    return 'No Developer';
}

app.post('/api/search', async (req, res) => {
    try {
        const { email, password, project, startDate, endDate } = req.body;
        console.log(`Jira API Request - Email: ${email}, Token: ${password}, Project: ${project}, Period: ${startDate} to ${endDate}`);

        if (!email || !password || !project || !startDate || !endDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (startDate === endDate) {
            return res.status(400).json({ error: 'Start date and end date cannot be the same day' });
        }

        const jiraClient = axios.create({
            baseURL: 'https://curveroyaltysystems.atlassian.net/rest/api/3',
            auth: {
                username: email,
                password: password
            }
        });

        let allIssues = [];
        let startAt = 0;
        const maxResults = 10;
        let hasMore = true;

        while (hasMore) {
            const response = await jiraClient.post('/search', {
                jql: `project = "${project}" AND status CHANGED TO "In Progress" DURING ("${startDate}", "${endDate}") ORDER BY updated DESC`,
                fields: ['key', 'summary', 'status', 'updated', 'assignee', 'fields', 'customfield_10119', 'customfield_10016', 'customfield_10020', 'sprint'],
                maxResults,
                startAt,
                expand: ['changelog']
            });

            const issues = response.data.issues;
            allIssues = allIssues.concat(issues);
            startAt += maxResults;
            hasMore = issues.length === maxResults;
        }

        // Fetch changelog for each issue
        for (const issue of allIssues) {
            const changelogResponse = await jiraClient.get(`/issue/${issue.key}/changelog?maxResults=100`);
            issue.changelog = changelogResponse.data;
        }

        // Group issues by developer
        const issuesByGroup = {};
        allIssues.forEach(issue => {
            const developer = issue.fields.customfield_10119?.[0]?.displayName || 'No Developer';
            if (!issuesByGroup[developer]) {
                issuesByGroup[developer] = [];
            }
            issuesByGroup[developer].push(issue);
        });

        // Calculate time in progress for each issue
        const issuesWithTime = allIssues.map(issue => ({
            ...issue,
            timeInProgress: calculateTimeInProgress(issue.changelog)
        }));

        // Group issues by developer with time calculations
        const issuesByGroupWithTime = {};
        issuesWithTime.forEach(issue => {
            const developer = issue.fields.customfield_10119?.[0]?.displayName || 'No Developer';
            if (!issuesByGroupWithTime[developer]) {
                issuesByGroupWithTime[developer] = [];
            }
            issuesByGroupWithTime[developer].push(issue);
        });

        // Format results
        const formattedResults = Object.entries(issuesByGroupWithTime).map(([groupKey, tickets]) => {
            // Group tickets by sprint
            const ticketsBySprint = tickets.reduce((acc, ticket) => {
                // Get the active sprint if available, otherwise use the first sprint
                let sprintName = 'No Sprint';
                let sprintStartDate = null;
                let sprintEndDate = null;

                if (ticket.fields.customfield_10020) {
                    if (Array.isArray(ticket.fields.customfield_10020)) {
                        const activeSprint = ticket.fields.customfield_10020.find(s => s.state === 'active');
                        if (activeSprint) {
                            sprintName = activeSprint.name;
                            sprintStartDate = activeSprint.startDate;
                            sprintEndDate = activeSprint.endDate;
                        } else if (ticket.fields.customfield_10020.length > 0) {
                            const sprint = ticket.fields.customfield_10020[0];
                            sprintName = sprint.name;
                            sprintStartDate = sprint.startDate;
                            sprintEndDate = sprint.endDate;
                        }
                    } else if (typeof ticket.fields.customfield_10020 === 'object') {
                        sprintName = ticket.fields.customfield_10020.name;
                        sprintStartDate = ticket.fields.customfield_10020.startDate;
                        sprintEndDate = ticket.fields.customfield_10020.endDate;
                    }
                }

                if (!acc[sprintName]) {
                    acc[sprintName] = {
                        sprintName,
                        sprintStartDate,
                        sprintEndDate,
                        tickets: []
                    };
                }
                acc[sprintName].tickets.push(ticket);
                return acc;
            }, {});

            // Calculate stats for each sprint
            const sprintStats = Object.values(ticketsBySprint).map(({ sprintName, sprintStartDate, sprintEndDate, tickets: sprintTickets }) => {
                const totalTimeInProgress = sprintTickets.reduce((sum, issue) => sum + issue.timeInProgress.timeInProgress, 0);
                const totalTickets = sprintTickets.length;
                const averageTimePerTicket = totalTickets > 0 ? totalTimeInProgress / totalTickets : 0;
                const totalStoryPoints = sprintTickets.reduce((sum, issue) => sum + issue.fields.customfield_10016 || 0, 0);
                
                const reopenedTickets = sprintTickets.filter(issue => 
                    issue.timeInProgress.reopenHistory.length > 0
                ).length;

                const reopenedPercentage = totalTickets > 0 
                    ? Math.round((reopenedTickets / totalTickets) * 100) 
                    : 0;

                const completedStoryPoints = sprintTickets
                    .filter(issue => 
                        issue.fields.status.name !== 'To Do' && 
                        issue.fields.status.name !== 'In Progress'
                    )
                    .reduce((sum, issue) => sum + (issue.fields.customfield_10016 || 0), 0);
                
                const completionPercentage = Math.round((completedStoryPoints / 15) * 100);

                return {
                    sprintName,
                    sprintStartDate: sprintStartDate ? formatDate(sprintStartDate) : null,
                    sprintEndDate: sprintEndDate ? formatDate(sprintEndDate) : null,
                    ticketCount: totalTickets,
                    totalTimeInProgress: formatDuration(totalTimeInProgress),
                    averageTimePerTicket: formatDuration(averageTimePerTicket),
                    reopenedTickets: reopenedTickets,
                    reopenedPercentage: reopenedPercentage,
                    completionPercentage: completionPercentage,
                    totalStoryPoints: totalStoryPoints,
                    tickets: sprintTickets.map(issue => ({
                        key: issue.key,
                        summary: issue.fields.summary,
                        status: issue.fields.status.name,
                        updated: formatDate(issue.fields.updated),
                        timeInProgress: formatDuration(issue.timeInProgress.timeInProgress),
                        developer: issue.fields.customfield_10119?.[0]?.displayName,
                        statusHistory: issue.timeInProgress.statusHistory,
                        reopenHistory: issue.timeInProgress.reopenHistory,
                        storyPoints: issue.fields.customfield_10016 || 0,
                        timesInProgress: issue.timeInProgress.statusHistory.filter(entry => entry.type === 'entered').length,
                        sprint: sprintName,
                        sprintStartDate: sprintStartDate ? formatDate(sprintStartDate) : null,
                        sprintEndDate: sprintEndDate ? formatDate(sprintEndDate) : null
                    }))
                };
            });

            // Find the latest sprint
            const latestSprint = sprintStats
                .filter(sprint => sprint.sprintStartDate) // Filter out sprints without dates
                .sort((a, b) => new Date(b.sprintStartDate) - new Date(a.sprintStartDate))[0];

            return {
                groupKey,
                sprintStats,
                latestSprintStats: latestSprint || {
                    sprintName: 'No Sprint',
                    ticketCount: 0,
                    totalTimeInProgress: '0h',
                    averageTimePerTicket: '0h',
                    reopenedTickets: 0,
                    reopenedPercentage: 0,
                    completionPercentage: 0,
                    totalStoryPoints: 0
                }
            };
        });

        // Calculate total stats
        const totalStats = {
            totalTickets: formattedResults.reduce((sum, group) => 
                sum + group.sprintStats.reduce((sprintSum, sprint) => sprintSum + sprint.ticketCount, 0), 0),
            totalStoryPoints: formattedResults.reduce((sum, group) => 
                sum + group.sprintStats.reduce((sprintSum, sprint) => sprintSum + sprint.totalStoryPoints, 0), 0),
            totalReopenedTickets: formattedResults.reduce((sum, group) => 
                sum + group.sprintStats.reduce((sprintSum, sprint) => sprintSum + sprint.reopenedTickets, 0), 0),
            totalReopenedPercentage: Math.round((formattedResults.reduce((sum, group) => 
                sum + group.sprintStats.reduce((sprintSum, sprint) => sprintSum + sprint.reopenedTickets, 0), 0) / 
                formattedResults.reduce((sum, group) => 
                    sum + group.sprintStats.reduce((sprintSum, sprint) => sprintSum + sprint.ticketCount, 0), 0)) * 100) || 0
        };

        res.json({
            totalIssues: allIssues.length,
            results: formattedResults,
            totalStats
        });
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data?.errorMessage || error.message });
    }
});

// New endpoint for fetching sprints
app.post('/api/sprints', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`Fetching sprints for: ${email}`);

        if (!email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const jiraClient = axios.create({
            baseURL: 'https://curveroyaltysystems.atlassian.net/rest/agile/1.0',
            auth: {
                username: email,
                password: password
            }
        });

        // First, get all boards
        const boardsResponse = await jiraClient.get('/board');
        const boards = boardsResponse.data.values;
        
        // Find the CUR board
        const curveBoard = boards.find(board => board.name === 'CUR board');
        
        if (!curveBoard) {
            return res.status(404).json({ 
                error: 'No board found for CUR board',
                availableBoards: boards.map(board => ({
                    id: board.id,
                    name: board.name,
                    type: board.type
                }))
            });
        }

        console.log('Selected board:', curveBoard);

        // Get sprints for the CUR board with pagination
        let allSprints = [];
        let startAt = 0;
        const maxResults = 50;
        let hasMore = true;

        while (hasMore) {
            const response = await jiraClient.get(`/board/${curveBoard.id}/sprint`, {
                params: {
                    startAt,
                    maxResults
                }
            });

            const sprints = response.data.values;
            allSprints = [...allSprints, ...sprints];

            // Check if we've got all sprints
            if (sprints.length < maxResults || allSprints.length >= response.data.total) {
                hasMore = false;
            } else {
                startAt += maxResults;
            }
        }

        console.log(`Fetched ${allSprints.length} sprints in total`);

        // Transform and sort the sprints with more details
        const transformedSprints = allSprints.map(sprint => ({
            id: sprint.id,
            name: sprint.name,
            startDate: sprint.startDate ? new Date(sprint.startDate).toLocaleDateString('en-GB') : null,
            endDate: sprint.endDate ? new Date(sprint.endDate).toLocaleDateString('en-GB') : null,
            state: sprint.state,
            goal: sprint.goal,
            completeDate: sprint.completeDate ? new Date(sprint.completeDate).toLocaleDateString('en-GB') : null,
            originBoardId: sprint.originBoardId,
            self: sprint.self,
            // Add raw dates for sorting
            rawStartDate: sprint.startDate ? new Date(sprint.startDate) : null,
            rawEndDate: sprint.endDate ? new Date(sprint.endDate) : null
        }));

        // Sort sprints by start date (most recent first)
        transformedSprints.sort((a, b) => {
            // If both have start dates, compare them
            if (a.rawStartDate && b.rawStartDate) {
                return b.rawStartDate - a.rawStartDate;
            }
            // If only one has a start date, put the one with date first
            if (a.rawStartDate) return -1;
            if (b.rawStartDate) return 1;
            // If neither has a start date, compare by name
            return b.name.localeCompare(a.name);
        });

        // Log the first few sprints to verify sorting
        console.log('First 5 sprints after sorting:', transformedSprints.slice(0, 5).map(s => ({
            name: s.name,
            startDate: s.startDate,
            state: s.state
        })));

        res.json({ sprints: transformedSprints });
    } catch (error) {
        console.error('Sprint fetch error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to fetch sprints',
            details: error.response?.data || error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {}); 