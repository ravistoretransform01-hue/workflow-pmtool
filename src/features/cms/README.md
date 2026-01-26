# CMS Feature

This feature provides API integration for fetching and caching CMS data (statuses and priorities) from the WordPress platform.

## Files

- **cmsApi.ts** - API service for making requests to the CMS endpoint
- **cmsStorage.ts** - Storage and caching layer with localStorage persistence
- **types.ts** - TypeScript type definitions

## API Endpoint

```
POST https://dev-wp-platform.pantheonsite.io/wp-json/wp-platform/v1/cms
```

### Request

```json
{
  "organization_id": 2,
  "board_id": 55,
  "user_id": 2
}
```

### Response

```json
{
  "status": true,
  "statuses": [
    {
      "id": "70",
      "name": "To Do",
      "color_code": "#8B5CF6",
      "status_order": "1"
    }
  ],
  "priority": [
    {
      "id": "29",
      "name": "Low",
      "color_code": "#6B7280",
      "priority_order": "1"
    }
  ]
}
```

## Usage

### Get all CMS data

```typescript
import { getCMSData } from "@/features/cms/cmsStorage";

const cmsData = await getCMSData({
  organization_id: 2,
  board_id: 55,
  user_id: 2,
});

debugLog(cmsData.statuses);
debugLog(cmsData.priority);
```

### Get only statuses

```typescript
import { getStatuses } from "@/features/cms/cmsStorage";

const statuses = await getStatuses({
  organization_id: 2,
  board_id: 55,
  user_id: 2,
});
```

### Get only priorities

```typescript
import { getPriorities } from "@/features/cms/cmsStorage";

const priorities = await getPriorities({
  organization_id: 2,
  board_id: 55,
  user_id: 2,
});
```

### Get specific status by ID

```typescript
import { getStatusById } from "@/features/cms/cmsStorage";

const status = await getStatusById(
  {
    organization_id: 2,
    board_id: 55,
    user_id: 2,
  },
  "70"
);
```

### Get specific priority by ID

```typescript
import { getPriorityById } from "@/features/cms/cmsStorage";

const priority = await getPriorityById(
  {
    organization_id: 2,
    board_id: 55,
    user_id: 2,
  },
  "29"
);
```

### Clear cache

```typescript
import { clearCMSCache } from "@/features/cms/cmsStorage";

clearCMSCache();
```

## Caching Strategy

- **Cache Duration**: 24 hours
- **Storage**: Browser localStorage
- **Fallback**: If API fails, uses expired cache as fallback
- **Auto-refresh**: Cache is automatically refreshed after 24 hours

## Features

- ✅ Automatic caching with localStorage
- ✅ 24-hour cache expiration
- ✅ Fallback to expired cache if API fails
- ✅ Helper functions for common queries
- ✅ Error handling and logging
- ✅ TypeScript support
