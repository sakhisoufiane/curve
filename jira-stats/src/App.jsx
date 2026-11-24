import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // Default to first day of current month
    endDate: new Date().toISOString().split('T')[0]    // Default to today
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedHistories, setExpandedHistories] = useState({});
  const [expandedTickets, setExpandedTickets] = useState({});
  const [visibleDevs, setVisibleDevs] = useState({});
  const [sortConfig, setSortConfig] = useState({
    key: 'ticketCount',
    direction: 'desc'
  });
  const [sprints, setSprints] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSprintChange = (e) => {
    const sprintId = e.target.value;
    if (!sprintId) {
      // If no sprint is selected, reset dates to default
      setFormData(prev => ({
        ...prev,
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      }));
      return;
    }

    // Find the selected sprint
    const selectedSprint = sprints.find(sprint => sprint.id.toString() === sprintId);
    if (selectedSprint) {
      // Convert the dates from DD/MM/YYYY to YYYY-MM-DD
      const startDate = selectedSprint.startDate ? 
        selectedSprint.startDate.split('/').reverse().join('-') : 
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      
      const endDate = selectedSprint.endDate ? 
        selectedSprint.endDate.split('/').reverse().join('-') : 
        new Date().toISOString().split('T')[0];

      setFormData(prev => ({
        ...prev,
        startDate,
        endDate
      }));
    }
  };

  const showAllDevs = () => {
    const allVisible = {};
    results.results.forEach(group => {
      allVisible[group.groupKey] = true;
    });
    setVisibleDevs(allVisible);
  };

  const hideAllDevs = () => {
    const allHidden = {};
    results.results.forEach(group => {
      allHidden[group.groupKey] = false;
    });
    setVisibleDevs(allHidden);
  };

  const toggleDevVisibility = (dev) => {
    setVisibleDevs(prev => {
      const newState = { ...prev };
      newState[dev] = !prev[dev];
      // If showing the developer, also expand their group
      if (newState[dev]) {
        setExpandedGroups(prevGroups => ({
          ...prevGroups,
          [dev]: true
        }));
      }
      return newState;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null); // Clear previous results

    // Validate dates
    if (formData.startDate === formData.endDate) {
      setError('Start date and end date cannot be the same day');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/search', {
        ...formData,
        project: 'CURVE'
      });

      setResults(response.data);
      // Initialize all developers as visible
      const initialVisibility = {};
      response.data.results.forEach(group => {
        initialVisibility[group.groupKey] = true;
      });
      setVisibleDevs(initialVisibility);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchSprints = async () => {
    setLoading(true);
    setError(null);
    setSprints([]);

    try {
      const response = await axios.post('/api/sprints', {
        email: formData.email,
        password: formData.password
      });

      setSprints(response.data.sprints);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const toggleHistory = (ticketKey) => {
    setExpandedHistories(prev => ({
      ...prev,
      [ticketKey]: !prev[ticketKey]
    }));
  };

  const toggleTicket = (ticketKey) => {
    setExpandedTickets(prev => ({
      ...prev,
      [ticketKey]: !prev[ticketKey]
    }));
  };

  const openInJira = (ticketKey) => {
    window.open(`https://curveroyaltysystems.atlassian.net/browse/${ticketKey}`, '_blank');
  };

  const handleSort = (key, e) => {
    e.stopPropagation(); // Stop the event from bubbling up
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const sortTickets = (tickets) => {
    return [...tickets].sort((a, b) => {
      // First sort by status (in-progress first)
      const aInProgress = a.status === 'To Do' || a.status === 'In Progress';
      const bInProgress = b.status === 'To Do' || b.status === 'In Progress';
      if (aInProgress !== bInProgress) {
        return aInProgress ? -1 : 1;
      }

      // Then sort by sprint
      if (a.sprint !== b.sprint) {
        // Put "No Sprint" at the end
        if (a.sprint === 'No Sprint') return 1;
        if (b.sprint === 'No Sprint') return -1;
        return a.sprint.localeCompare(b.sprint);
      }

      // Then sort by the existing criteria
      if (sortConfig.key === 'ticketCount') {
        return sortConfig.direction === 'asc' 
          ? a.ticketCount - b.ticketCount 
          : b.ticketCount - a.ticketCount;
      }
      return 0;
    });
  };

  const getSortedResults = () => {
    if (!results?.results) return [];
    return results.results.map(group => ({
      ...group,
      sprintStats: [...group.sprintStats]
        .sort((a, b) => {
          // Sort by sprint start date (most recent first)
          if (!a.sprintStartDate) return 1;
          if (!b.sprintStartDate) return -1;
          
          // Parse DD/MM/YYYY format
          const [aDay, aMonth, aYear] = a.sprintStartDate.split('/');
          const [bDay, bMonth, bYear] = b.sprintStartDate.split('/');
          
          const aDate = new Date(aYear, aMonth - 1, aDay);
          const bDate = new Date(bYear, bMonth - 1, bDay);
          
          return bDate - aDate;
        })
        .map(sprint => ({
          ...sprint,
          tickets: sortTickets(sprint.tickets)
        }))
    }));
  };

  const exportToCSV = (tickets, developerName) => {
    const headers = ['Ticket Name', 'URL', 'Status', 'Story Points', 'Time In Progress', 'Reopened', 'Started', 'Ended', 'Sprint'];
    const csvData = tickets.map(ticket => {
      // Find the first time the ticket entered "In Progress"
      const firstEnteredProgress = ticket.statusHistory
        ?.filter(entry => entry.type === 'entered')
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0]?.date || '';

      // Find the last time the ticket was in "In Progress"
      const lastInProgressItems = ticket.statusHistory?.filter(entry => entry.type === 'left');
      const lastInProgress = lastInProgressItems.length > 0 ? lastInProgressItems[lastInProgressItems.length - 1].date : '';

      // Only include Ended date if the ticket is no longer in progress
      const endedDate = ticket.status !== 'In Progress' ? lastInProgress : '';

      // Escape fields that might contain commas
      const escapeCSV = (field) => {
        if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };

      return [
        escapeCSV(`${ticket.key}: ${ticket.summary}`),
        `https://curveroyaltysystems.atlassian.net/browse/${ticket.key}`,
        escapeCSV(ticket.status),
        ticket.storyPoints,
        ticket.timeInProgress || '',
        ticket.reopenHistory?.length || 0,
        escapeCSV(firstEnteredProgress),
        escapeCSV(endedDate),
        escapeCSV(ticket.sprint || 'No Sprint')
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${developerName} - ${formData.startDate} to ${formData.endDate} Jira Report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    document.documentElement.classList.add('dark-mode');
    document.body.classList.add('dark-mode');
  }, []);

  return (
    <div className="app-wrapper">
      <div className="container">
        <h1></h1>
        
        {!sprints.length && (
          <form onSubmit={(e) => {
            e.preventDefault();
            handleFetchSprints();
          }} className="form">
            <div className="form-row">
              <div className="form-group auth-field">
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group auth-field">
                <label htmlFor="password">Password:</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <button 
                type="submit"
                disabled={loading}
                className="compact-button"
              >
                {loading ? 'Authenticating...' : 'Authenticate'}
              </button>
            </div>
          </form>
        )}

        {sprints.length > 0 && (
          <div className="search-section">
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sprint">Select Sprint:</label>
                  <select 
                    id="sprint" 
                    name="sprint" 
                    className="sprint-select"
                    onChange={handleSprintChange}
                  >
                    <option value="">Select a sprint</option>
                    {[...sprints].reverse().map(sprint => (
                      <option key={sprint.id} value={sprint.id}>
                        {sprint.name} - {sprint.state} ({sprint.startDate} - {sprint.endDate || 'Ongoing'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group compact">
                  <label htmlFor="startDate">Start Date:</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group compact">
                  <label htmlFor="endDate">End Date:</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <button type="submit" disabled={loading} className="compact-button">
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div className="error">
            Error: {error}
          </div>
        )}

        {results && (
          <div className="results">
            {/* Add summary group */}
            <div className="group summary-group">
              <div className="group-header no-click top-header">
                <div className="group-summary top-summary">
                  <div className="total-stats">
                    <div className="stat">
                      <div className="stat-label">Total Tickets</div>
                      <div className="stat-value">{results.totalStats.totalTickets}</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Total Story Points</div>
                      <div className="stat-value">{results.totalStats.totalStoryPoints}</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Reopened</div>
                      <div className="stat-value">{results.totalStats.totalReopenedPercentage}%</div>
                    </div>
                    <div className="stat-separator"></div>
                    <div className="stat">
                      <div className="stat-label">Target Completion</div>
                      <div className="stat-value">15 points/sprint</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Target Reopen Rate</div>
                      <div className="stat-value">10%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Developer Stats */}
            <div className="developers-container">
              <h3>Developers</h3>
              <div className="developer-tags">
                {results.results.map(group => (
                  <button
                    key={group.groupKey}
                    className={`developer-tag ${visibleDevs[group.groupKey] ? 'selected' : ''}`}
                    onClick={() => toggleDevVisibility(group.groupKey)}
                  >
                    {group.groupKey}
                  </button>
                ))}
              </div>
              <div className="developer-separator"></div>
              <div className="developer-actions">
                <button className="action-button" onClick={showAllDevs}>Show All</button>
                <button className="action-button" onClick={hideAllDevs}>Hide All</button>
              </div>
            </div>
            
            {[...getSortedResults()]
              .map((group) => (
              visibleDevs[group.groupKey] && (
                <div key={group.groupKey} className="group">
                  <div className="group-header" 
                    onClick={() => toggleGroup(group.groupKey)}
                  >
                    <div className="group-title">
                      <h2>{group.groupKey}</h2>
                    </div>
                    <div className="group-summary">
                      <div className="stat-item">
                        <span className="stat-label">Latest Sprint</span>
                        <span className="stat-value">{group.latestSprintStats.sprintName}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Tickets</span>
                        <span className="stat-value">{group.latestSprintStats.ticketCount}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Story Points</span>
                        <span className="stat-value">
                          {group.latestSprintStats.totalStoryPoints}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Time/Ticket</span>
                        <span className="stat-value">
                          {group.latestSprintStats.averageTimePerTicket}
                        </span>
                      </div>
                      <div className="stat-separator"></div>
                      <div className="stat-item">
                        <span className="stat-label">Completion</span>
                        <span className="stat-value">
                          {group.latestSprintStats.completionPercentage}%
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Reopened</span>
                        <span className="stat-value">
                          {group.latestSprintStats.reopenedPercentage}%
                        </span>
                      </div>
                    </div>
                    <button 
                      className="export-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const allTickets = group.sprintStats.flatMap(sprint => sprint.tickets);
                        exportToCSV(allTickets, group.groupKey);
                      }}
                    >
                      Export All
                    </button>
                  </div>
                  
                  {expandedGroups[group.groupKey] && (
                    <>
                      <div className="tickets">
                        {group.sprintStats.map((sprint) => (
                          <div key={sprint.sprintName} className="sprint-section">
                            <div className="sprint-header">
                              <h4>
                                {sprint.sprintName}
                                {sprint.tickets[0]?.sprintStartDate && sprint.tickets[0]?.sprintEndDate && (
                                  <span className="sprint-dates">
                                    {sprint.tickets[0].sprintStartDate} - {sprint.tickets[0].sprintEndDate}
                                  </span>
                                )}
                              </h4>
                              <div className="sprint-summary">
                                <div className="stat-item">
                                  <span className="stat-label">Total Tickets</span>
                                  <span className="stat-value">{sprint.ticketCount}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Story Points</span>
                                  <span className="stat-value">
                                    {sprint.totalStoryPoints}
                                  </span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Time/Ticket</span>
                                  <span className="stat-value">
                                    {sprint.averageTimePerTicket}
                                  </span>
                                </div>
                                <div className="stat-separator"></div>
                                <div className="stat-item">
                                  <span className="stat-label">Completion</span>
                                  <span className="stat-value">
                                    {sprint.completionPercentage}%
                                  </span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Reopened</span>
                                  <span className="stat-value">
                                    {sprint.reopenedPercentage}%
                                  </span>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    exportToCSV(sprint.tickets, `${group.groupKey} - ${sprint.sprintName}`);
                                  }}
                                  className="export-button"
                                >
                                  Export
                                </button>
                              </div>
                            </div>
                            <div className="sprint-tickets">
                              {sprint.tickets.map((ticket) => (
                                <div 
                                  key={ticket.key}
                                  className={`ticket ${ticket.status === 'To Do' || ticket.status === 'In Progress' ? 'in-progress' : 'completed'} ${ticket.reopenHistory?.length > 0 ? 'reopened' : ''}`}
                                >
                                  <div className="ticket-header" onClick={() => toggleTicket(ticket.key)}>
                                    <h4>{ticket.key}: {ticket.summary}</h4>
                                    <div className="ticket-tags">
                                      <div className="ticket-tags-left">
                                        <span className="status-tag" data-status={ticket.status}>{ticket.status}</span>
                                        {ticket.storyPoints === 0 && (
                                          <span className="warning-tag">Missing Story Points</span>
                                        )}
                                      </div>
                                      <button 
                                        className="jira-link" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openInJira(ticket.key);
                                        }}
                                        title="Open in Jira"
                                      >
                                        Open in Jira
                                      </button>
                                    </div>
                                    <span className={`expand-icon ${expandedTickets[ticket.key] ? 'expanded' : ''}`}>
                                      {expandedTickets[ticket.key] ? '▼' : '▶'}
                                    </span>
                                  </div>
                                  {ticket.reopenHistory && ticket.reopenHistory.length > 0 && (
                                    <div className="reopened-bar">
                                      <span className="reopened-icon">⚠️</span>
                                      <span className="reopened-text">Reopened {ticket.reopenHistory.length} {ticket.reopenHistory.length === 1 ? 'time' : 'times'}</span>
                                    </div>
                                  )}
                                  {expandedTickets[ticket.key] && (
                                    <div className="ticket-content">
                                      <div className="ticket-stats">
                                        <div className="ticket-stat">
                                          <span>Status:</span>
                                          <span>{ticket.status}</span>
                                        </div>
                                        <div className="ticket-stat">
                                          <span>Story Points:</span>
                                          <span>{ticket.storyPoints}</span>
                                        </div>
                                        <div className="ticket-stat">
                                          <span>Time in Progress:</span>
                                          <span>{ticket.timeInProgress}</span>
                                        </div>
                                        <div className="ticket-stat">
                                          <span>Sprint:</span>
                                          <span>{ticket.sprint}</span>
                                        </div>
                                      </div>
                                      {ticket.reopenHistory && ticket.reopenHistory.length > 0 && (
                                        <div className="status-history">
                                          <div 
                                            className="history-header"
                                            onClick={() => toggleHistory(`${ticket.key}-reopen`)}
                                          >
                                            <h5>
                                              <span className={`expand-icon ${expandedHistories[`${ticket.key}-reopen`] ? 'expanded' : ''}`}>
                                                {expandedHistories[`${ticket.key}-reopen`] ? '▼' : '▶'}
                                              </span>
                                              Reopen History ({ticket.reopenHistory.length} entries)
                                            </h5>
                                          </div>
                                          {expandedHistories[`${ticket.key}-reopen`] && (
                                            <ul className="status-list">
                                              {ticket.reopenHistory.map((entry, index) => (
                                                <li key={index} className="status-entry reopened">
                                                  → Reopened (from {entry.fromStatus} to {entry.toStatus}) by {entry.author}
                                                  <span className="status-date">{entry.date}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>
                                      )}
                                      
                                      {ticket.statusHistory && ticket.statusHistory.length > 0 && (
                                        <div className="status-history">
                                          <div 
                                            className="history-header" 
                                            onClick={() => toggleHistory(ticket.key)}
                                          >
                                            <h5>
                                              <span className={`expand-icon ${expandedHistories[ticket.key] ? 'expanded' : ''}`}>
                                                {expandedHistories[ticket.key] ? '▼' : '▶'}
                                              </span>
                                              Progress History ({ticket.statusHistory.length} entries)
                                            </h5>
                                          </div>
                                          {expandedHistories[ticket.key] && (
                                            <ul className="status-list">
                                              {ticket.statusHistory.map((entry, index) => (
                                                <li key={index} className={`status-entry ${entry.type}`}>
                                                  {entry.type === 'entered' && `${entry.fromStatus} → ${entry.toStatus || 'In Progress'} by ${entry.author}`}
                                                  {entry.type === 'left' && `${entry.fromStatus || 'In Progress'} → ${entry.toStatus} by ${entry.author}`}
                                                  {entry.type === 'current' && '→ Currently in Progress'}
                                                  <span className="status-date">{entry.date}</span>
                                                  {entry.duration && (
                                                    <span className="status-duration">({entry.duration})</span>
                                                  )}
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 