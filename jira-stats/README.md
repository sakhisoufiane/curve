# Jira Stats

A web application that fetches and displays Jira ticket statistics for developers.

## Features

### Authentication
- Email/password authentication with Jira
- Form is centered with 200px wide authenticate button
- Enter key support for form submission
- Authentication form disappears after successful login

### Sprint Selection
- Fetches and displays available sprints
- Sprint select, start date, and end date fields are aligned in one row
- Date validation to prevent same-day selections

### Results Display
- Groups tickets by developer
- Each developer section shows:
  - Total tickets
  - Total story points
  - Average story points per ticket
  - List of tickets with:
    - Ticket number
    - Summary
    - Story points
    - Status
    - Type
- Developer sections are collapsible
- All sections are expanded by default

### Styling
- Dark mode by default
- Consistent form field styling
- Responsive layout
- Clear visual hierarchy

## Technical Details

### Frontend
- React application
- Axios for API calls
- CSS for styling
- State management for:
  - Authentication
  - Sprint selection
  - Results display
  - Developer section visibility

### Backend
- Express server
- Jira API integration
- CORS enabled
- Error handling

## Project Structure
```
src/
  ├── App.jsx        # Main application component
  ├── App.css        # Global styles
  └── server.js      # Express server
```

## Development Notes
- All form fields use consistent styling
- Authentication form is centered with 200px wide button
- Sprint selection form has fields aligned in one row
- Developer sections are expanded by default
- Enter key support for form submission
