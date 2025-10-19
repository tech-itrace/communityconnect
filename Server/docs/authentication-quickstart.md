# Quick Start: Authentication & Conversation History

## Making Authenticated Requests

### Basic Request Format
```bash
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "find AI experts",
    "phoneNumber": "919840930854",
    "options": {
      "maxResults": 10
    }
  }'
```

### Required Field
**`phoneNumber`** - Must be a valid phone number of an active community member

### Example Phone Numbers (from your community)
```
919840930854 - Mr. Sathyamurthi
919884062661 - Mr. S.V.Gopalen
919840061561 - Mr. N.Chandrasekaran
919444224366 - Mr. RAJARETHINAM, A
919789843327 - Mr. Sriram, Natarajan
```

## Testing Authentication

### Test 1: Valid Member (should succeed)
```bash
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{"query": "find consultants", "phoneNumber": "919840930854"}'
```

Expected: `200 OK` with search results

### Test 2: Invalid Member (should fail)
```bash
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{"query": "find developers", "phoneNumber": "911234567890"}'
```

Expected: `403 Unauthorized` with error message

### Test 3: Missing Phone (should fail)
```bash
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{"query": "find experts"}'
```

Expected: `400 Bad Request` with error message

## Testing Conversation History

### Scenario: Follow-up Questions
```bash
# Query 1: Initial search
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{"query": "find AI experts in Chennai", "phoneNumber": "919840930854"}'

# Query 2: Follow-up (within 30 minutes)
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{"query": "show me their skills", "phoneNumber": "919840930854"}'

# Query 3: Another follow-up
curl -X POST http://localhost:3000/api/search/query \
  -H "Content-Type: application/json" \
  -d '{"query": "who are they", "phoneNumber": "919840930854"}'
```

The system will use conversation history to understand "their" and "they" refer to the AI experts from Query 1.

## Running Test Scripts

### Full Authentication Test Suite
```bash
cd Server
chmod +x test-auth-conversation.sh
./test-auth-conversation.sh
```

Tests:
- ✅ Valid member authentication
- ✅ Non-member rejection
- ✅ Missing phone validation
- ✅ Conversation history
- ✅ Phone format normalization

### Phase 3 Natural Language Tests (with Auth)
```bash
cd Server
chmod +x test-phase3.sh
./test-phase3.sh
```

Tests all NL query types with authentication.

## Error Responses

### 400 - Missing Phone Number
```json
{
  "success": false,
  "error": {
    "code": "PHONE_NUMBER_REQUIRED",
    "message": "Phone number is required for authentication"
  }
}
```

### 403 - Unauthorized (Non-Member)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access denied. This service is only available to active community members.",
    "details": {
      "reason": "Phone number not found in community members database or member is inactive"
    }
  }
}
```

## Conversation Session Details

- **Session Duration:** 30 minutes of inactivity
- **History Limit:** Last 5 queries per user
- **Auto Cleanup:** Every 10 minutes
- **Storage:** In-memory (no persistence across restarts)

## Tips

1. **Phone Format:** System normalizes phone numbers automatically
   - `919840930854` ✅
   - `91 9840 930854` ✅
   - `91-9840-930854` ✅
   - `9840930854` ✅ (adds country code)

2. **Follow-up Questions:** Ask naturally within 30 minutes
   - "show me their profiles"
   - "who are they"
   - "what about their skills"

3. **Session Expiry:** After 30 minutes, start fresh conversation

4. **Server Restart:** All sessions cleared (in-memory storage)

## Monitoring

### Check Server Logs
```bash
# In the terminal where server is running, look for:
[NL Search Controller] Query from authenticated member: [Name]
[LLM Service] Using conversation context from previous queries
```

### Get Active Sessions (programmatic)
```javascript
import { getActiveSessionCount } from './services/conversationService';
console.log(`Active sessions: ${getActiveSessionCount()}`);
```

## Integration Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

async function searchCommunity(query, phoneNumber) {
  const response = await axios.post('http://localhost:3000/api/search/query', {
    query: query,
    phoneNumber: phoneNumber,
    options: {
      maxResults: 10
    }
  });
  
  return response.data;
}

// Usage
searchCommunity('find AI experts', '919840930854')
  .then(result => console.log(result))
  .catch(error => console.error(error));
```

### Python
```python
import requests

def search_community(query, phone_number):
    url = 'http://localhost:3000/api/search/query'
    payload = {
        'query': query,
        'phoneNumber': phone_number,
        'options': {
            'maxResults': 10
        }
    }
    
    response = requests.post(url, json=payload)
    return response.json()

# Usage
result = search_community('find AI experts', '919840930854')
print(result)
```

### Frontend (React/Vue/Angular)
```javascript
async function searchCommunity(query, phoneNumber) {
  const response = await fetch('http://localhost:3000/api/search/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: query,
      phoneNumber: phoneNumber,
      options: {
        maxResults: 10
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
}

// Usage with error handling
searchCommunity('find AI experts', '919840930854')
  .then(result => {
    console.log('Found:', result.members.length, 'members');
    console.log('Response:', result.response);
  })
  .catch(error => {
    if (error.message.includes('Access denied')) {
      console.error('Authentication failed');
    } else {
      console.error('Search error:', error);
    }
  });
```

## Troubleshooting

### Issue: 403 Unauthorized
**Cause:** Phone number not in database or member is inactive
**Solution:** Use a valid community member phone number

### Issue: 400 Bad Request
**Cause:** Missing phoneNumber field
**Solution:** Add phoneNumber to request body

### Issue: Follow-up not working
**Cause:** Session expired (> 30 minutes) or different phone number
**Solution:** Use same phone number within 30 minutes

### Issue: Server restart cleared sessions
**Cause:** In-memory storage doesn't persist
**Solution:** This is expected behavior. Sessions rebuild automatically on new queries.

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Run `test-auth-conversation.sh` to verify setup
3. Ensure phone number exists in `community_members` table
4. Check `is_active = TRUE` in database
