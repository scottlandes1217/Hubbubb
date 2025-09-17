# Organization Search Functionality

## Overview

This feature adds a comprehensive search system to the hubbubb application that allows users to search across all organization-related data including pets, users, tasks, events, and posts.

## Features

### Quick Search (Dropdown)
- **Location**: Search bar in the navbar above the tabs
- **Functionality**: 
  - Real-time search as you type (with 300ms debouncing)
  - Shows up to 5 results per category
  - Displays icons for each record type
  - Shows "Recent" badge for items updated in the last 24 hours
  - Keyboard navigation (arrow keys, enter, escape)
  - Click to navigate to the record
  - Press Enter to go to full search page

### Full Search Page
- **URL**: `/organizations/:id/search`
- **Features**:
  - Advanced filtering by record type
  - Multiple filter options for each record type
  - Results displayed in a table format
  - Pagination support
  - Export capabilities

## Searchable Content

### Pets
- **Searchable fields**: Name, description, breed, color
- **Filters**: Status, sex, size, species
- **Icon**: `fas fa-paw`

### Users
- **Searchable fields**: First name, last name, email
- **Filters**: Role
- **Icon**: `fas fa-user`

### Tasks
- **Searchable fields**: Subject, description
- **Filters**: Status
- **Icon**: `fas fa-tasks`

### Events
- **Searchable fields**: Title, description
- **Filters**: Event type, status, priority
- **Icon**: `fas fa-calendar`

### Posts
- **Searchable fields**: Body content
- **Filters**: User
- **Icon**: `fas fa-comment`

## Technical Implementation

### Files Created/Modified

#### Controllers
- `app/controllers/search_controller.rb` - Main search controller
- `app/helpers/search_helper.rb` - Helper methods for search views

#### Views
- `app/views/shared/_search_bar.html.erb` - Search bar component
- `app/views/search/index.html.erb` - Full search page

#### JavaScript
- `app/javascript/controllers/search_controller.js` - Stimulus controller for search functionality

#### Stylesheets
- `app/assets/stylesheets/components/_search_bar.scss` - Search bar styling

#### Routes
- Added search routes to `config/routes.rb`

### Key Features

1. **Debounced Search**: Prevents excessive API calls while typing
2. **Keyboard Navigation**: Full keyboard support for accessibility
3. **Responsive Design**: Works on mobile and desktop
4. **Error Handling**: Graceful handling of missing data
5. **Performance**: Efficient database queries with proper includes
6. **Security**: Proper authorization checks

## Usage

### Quick Search
1. Click on the search bar in the navbar
2. Start typing to see results
3. Use arrow keys to navigate results
4. Press Enter to select or go to full search
5. Press Escape to close dropdown

### Full Search
1. Navigate to `/organizations/:id/search`
2. Enter search terms
3. Select record type filter (optional)
4. Expand filters section for advanced filtering
5. Click "Search" to see results
6. Click "View" on any result to navigate to it

## Styling

The search bar integrates seamlessly with the existing navbar design:
- Semi-transparent background matching the navbar theme
- Proper spacing and alignment with existing elements
- Responsive design that adapts to different screen sizes
- Consistent with the overall application design

## Future Enhancements

Potential improvements for future versions:
- Search result highlighting
- Search history
- Saved searches
- Advanced search operators
- Full-text search with Elasticsearch
- Search analytics
- Export search results 