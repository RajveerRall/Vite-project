# Usage Tracking Guide

Complete guide to the **TTS Usage Tracking System** - how it works, API endpoints, and frontend integration. Now includes comprehensive **Audio Minute Tracking** and **Multi-User Analytics**.

---

## 📊 Overview

The Usage Tracking Service automatically tracks all TTS requests including:
- ✅ **Audio Duration** (estimated and actual) - NEW: Comprehensive minute tracking
- ✅ **Cost calculations** - Provider-specific pricing
- ✅ **Character counts** - Text length processed
- ✅ **Provider/voice statistics** - Breakdown by TTS service
- ✅ **Timestamp tracking** - When requests were made
- ✅ **Persistent storage** - Survives server restarts
- ✅ **Multi-user support** - Per-user analytics (when implemented)
- ✅ **Daily patterns** - Usage trends over time
- ✅ **Real-time analytics** - Live usage statistics

### Architecture

```
TTS Request (with User ID)
    ↓
/api/tts endpoint (with user identification)
    ↓
synthesizeWithMetadata() → Returns audio + metadata + duration
    ↓
usageTracker.trackUsage() → Logs usage data with user context
    ↓
In-Memory Storage + File Persistence (usage-data.json)
    ↓
Audio Minute Analytics → Real-time statistics
    ↓
API Endpoints → Frontend queries usage data
    ↓
Multi-User Dashboard → Per-user analytics
```

## 🆕 New Features (v0.1.0+)

### **Comprehensive Audio Minute Tracking**
- **Total audio minutes generated** - Complete lifetime statistics
- **Provider breakdown** - Minutes by Kokoro, MsEdge, OpenAI, Cartesia
- **Daily usage patterns** - Track usage trends over time
- **Real-time analytics** - Live statistics and insights

### **Multi-User Support**
- **Per-user tracking** - Independent analytics per user
- **User identification** - X-User-Id headers and JWT tokens
- **Session isolation** - No cross-user data mixing
- **Admin endpoints** - Monitor system-wide usage

---

## 🔧 Backend Implementation

### **1. Core Service** (`src/core/usage-tracking.ts`)

#### **Initialization**

```typescript
// Singleton instance created in server.ts
const usageTracker = getUsageTracker();

// Default configuration:
{
  enabled: true,
  maxEntries: 10000,         // Keep last 10,000 entries
  persistData: true,          // Save to disk
  persistencePath: './usage-data.json'
}
```

#### **Automatic Tracking**

Every TTS request is automatically tracked in `src/server.ts` (line 686):

```typescript
// After TTS synthesis
const result = await ttsService.synthesizeWithMetadata(text, { voiceId });

// Track usage automatically
usageTracker.trackUsage({
    provider: 'kokoro',              // TTS provider
    voiceId: 'am_adam',              // Voice ID
    text: 'Hello world',             // Text synthesized
    characterCount: 11,              // Length of text
    estimatedDurationSeconds: 1.5,  // Estimated audio duration
    actualDurationSeconds: 1.48,    // Actual audio duration (if available)
    cost: 0.000055,                  // Calculated cost
    metadata: {                      // Additional metadata
        format: 'wav',
        // ... other provider-specific data
    }
});
```

#### **Data Structure**

```typescript
interface TTSUsageEntry {
  id: string;                           // Unique ID (timestamp + random)
  timestamp: Date;                      // When the request occurred
  provider: string;                     // 'kokoro', 'msedge', 'openai', etc.
  voiceId: string;                      // Voice identifier
  text: string;                         // Text that was synthesized
  characterCount: number;               // Length of text
  estimatedDurationSeconds: number;     // Estimated audio duration
  actualDurationSeconds?: number;       // Actual duration (if measured)
  cost?: number;                        // Cost in USD
  metadata?: any;                       // Provider-specific metadata
}
```

---

## 🌐 API Endpoints

### **🆕 Audio Minute Tracking Endpoints**

#### **1. GET `/api/usage/audio-minutes`**

Get comprehensive audio minute statistics.

**Query Parameters**:
- `startDate` (optional) - Filter from date (ISO string)
- `endDate` (optional) - Filter to date (ISO string)

**Response**:
```json
{
  "message": "Audio minute tracking statistics",
  "audioStats": {
    "totalAudioMinutes": 93.07,
    "totalAudioHours": 1.55,
    "totalAudioSeconds": 5584.09,
    "estimatedMinutes": 93.07,
    "actualMinutes": 0,
    "totalAudioMinutesFormatted": "93.07 minutes",
    "totalAudioHoursFormatted": "1.55 hours",
    "byProvider": {
      "kokoro": { "estimatedMinutes": 53.85, "actualMinutes": 0, "requests": 447 },
      "msedge": { "estimatedMinutes": 39.22, "actualMinutes": 0, "requests": 380 }
    },
    "byDay": {
      "2025-10-12": { "estimatedMinutes": 0.13, "actualMinutes": 0, "requests": 1 }
    },
    "timeRange": { "start": "2025-01-01T00:00:00.000Z", "end": "2025-10-12T14:16:31.000Z" }
  }
}
```

#### **2. GET `/api/usage/audio-minutes/providers`**

Get audio minutes breakdown by provider.

**Response**:
```json
{
  "message": "Audio minutes by provider",
  "providerData": [
    {
      "provider": "kokoro",
      "estimatedMinutes": 53.85,
      "actualMinutes": 0,
      "requests": 447,
      "percentageOfTotal": 57.9
    },
    {
      "provider": "msedge", 
      "estimatedMinutes": 39.22,
      "actualMinutes": 0,
      "requests": 380,
      "percentageOfTotal": 42.1
    }
  ],
  "summary": {
    "totalProviders": 2,
    "totalAudioMinutes": 93.07
  }
}
```

#### **3. GET `/api/usage/audio-minutes/daily`**

Get daily audio usage for charts and analytics.

**Response**:
```json
{
  "message": "Daily audio minute tracking",
  "dailyData": [
    {
      "date": "2025-10-12",
      "estimatedMinutes": 0.13,
      "actualMinutes": 0,
      "requests": 1
    }
  ],
  "summary": {
    "totalDays": 1,
    "totalAudioMinutes": 0.13,
    "averageMinutesPerDay": "0.13"
  }
}
```

### **🆕 Multi-User Endpoints**

#### **4. GET `/api/admin/active-users`**

Get count of active users and their IDs.

**Response**:
```json
{
  "message": "Active users count",
  "activeUsers": 4,
  "userIds": ["user1", "user2", "anonymous", "test-user-123"]
}
```

#### **5. GET `/api/my-cast`**

Get current user's voice assignments (requires X-User-Id header).

**Response**:
```json
{
  "message": "Your current voice cast assignments",
  "userId": "user_dx09cewgy",
  "cast": [
    {
      "character": "Narrator",
      "voiceId": "bm_george",
      "provider": "kokoro",
      "gender": "male"
    }
  ],
  "totalCharacters": 1,
  "availableVoices": 29
}
```

### **Legacy Endpoints**

#### **6. GET `/api/usage/summary`**

Get a summary of usage for the **last 24 hours**.

**Request**:
```bash
GET http://localhost:8080/api/usage/summary
```

**Response**:
```json
{
  "message": "Usage summary retrieved successfully",
  "summary": {
    "totalRequests": 42,
    "totalEstimatedDurationSeconds": 256.8,
    "totalActualDurationSeconds": 254.2,
    "totalCost": 0.00126,
    "totalCharacters": 5234,
    "avgDurationPerRequest": 6.11,
    "avgCharactersPerRequest": 124.6,
    "timeRange": {
      "start": "2025-10-09T19:00:00.000Z",
      "end": "2025-10-10T19:00:00.000Z"
    },
    "byProvider": {
      "kokoro": {
        "requests": 35,
        "estimatedDurationSeconds": 210.5,
        "actualDurationSeconds": 208.1,
        "cost": 0.00026,
        "characters": 4200
      },
      "msedge": {
        "requests": 7,
        "estimatedDurationSeconds": 46.3,
        "actualDurationSeconds": 46.1,
        "cost": 0.00100,
        "characters": 1034
      }
    },
    "byVoice": {
      "kokoro:am_adam": {
        "requests": 18,
        "estimatedDurationSeconds": 105.2,
        "cost": 0.00013,
        "characters": 2100
      },
      "kokoro:bm_george": {
        "requests": 17,
        "estimatedDurationSeconds": 105.3,
        "cost": 0.00013,
        "characters": 2100
      },
      "msedge:en-US-BrianMultilingualNeural": {
        "requests": 7,
        "estimatedDurationSeconds": 46.3,
        "cost": 0.00100,
        "characters": 1034
      }
    }
  }
}
```

---

### **2. GET `/api/usage/stats?startDate=...&endDate=...`**

Get usage statistics for a **custom date range**.

**Request**:
```bash
GET http://localhost:8080/api/usage/stats?startDate=2025-10-01&endDate=2025-10-10
```

**Query Parameters**:
- `startDate` (optional): ISO date string (e.g., `2025-10-01`)
- `endDate` (optional): ISO date string (e.g., `2025-10-10`)
- If omitted, returns all-time stats

**Response**: Same structure as `/api/usage/summary`

---

### **3. GET `/api/usage/recent?limit=10`**

Get the most recent usage entries (for activity log).

**Request**:
```bash
GET http://localhost:8080/api/usage/recent?limit=10
```

**Query Parameters**:
- `limit` (optional): Number of entries to return (default: 100)

**Response**:
```json
{
  "message": "Recent usage entries retrieved successfully",
  "count": 10,
  "entries": [
    {
      "id": "1728493164000-x7k2m9p1q",
      "timestamp": "2025-10-09T19:39:24.000Z",
      "provider": "kokoro",
      "voiceId": "am_adam",
      "text": "Right! Now, is there any speck of Lukas Fehrwight still clinging to me?",
      "characterCount": 73,
      "estimatedDurationSeconds": 4.6,
      "actualDurationSeconds": 4.58,
      "cost": 0.000365,
      "metadata": {
        "format": "wav",
        "provider": "kokoro"
      }
    },
    {
      "id": "1728493166000-p3x8k1m7z",
      "timestamp": "2025-10-09T19:39:26.000Z",
      "provider": "kokoro",
      "voiceId": "bm_george",
      "text": "He stuck out his arms and twirled several times...",
      "characterCount": 139,
      "estimatedDurationSeconds": 8.7,
      "cost": 0.000695,
      "metadata": {
        "format": "wav"
      }
    }
    // ... 8 more entries
  ]
}
```

---

### **4. GET `/api/usage/by-provider?startDate=...&endDate=...`**

Get usage statistics **grouped by provider** (kokoro, msedge, openai, etc.).

**Request**:
```bash
GET http://localhost:8080/api/usage/by-provider
```

**Response**:
```json
{
  "message": "Usage by provider retrieved successfully",
  "byProvider": {
    "kokoro": {
      "requests": 35,
      "estimatedDurationSeconds": 210.5,
      "actualDurationSeconds": 208.1,
      "cost": 0.00026,
      "characters": 4200
    },
    "msedge": {
      "requests": 7,
      "estimatedDurationSeconds": 46.3,
      "cost": 0.00100,
      "characters": 1034
    }
  },
  "timeRange": {
    "start": "2025-10-09T00:00:00.000Z",
    "end": "2025-10-10T00:00:00.000Z"
  }
}
```

---

### **5. GET `/api/usage/by-voice?startDate=...&endDate=...`**

Get usage statistics **grouped by voice** (provider:voiceId pairs).

**Request**:
```bash
GET http://localhost:8080/api/usage/by-voice
```

**Response**:
```json
{
  "message": "Usage by voice retrieved successfully",
  "byVoice": {
    "kokoro:am_adam": {
      "requests": 18,
      "estimatedDurationSeconds": 105.2,
      "actualDurationSeconds": 104.8,
      "cost": 0.00013,
      "characters": 2100
    },
    "kokoro:bm_george": {
      "requests": 17,
      "estimatedDurationSeconds": 105.3,
      "cost": 0.00013,
      "characters": 2100
    },
    "msedge:en-US-BrianMultilingualNeural": {
      "requests": 7,
      "estimatedDurationSeconds": 46.3,
      "cost": 0.00100,
      "characters": 1034
    }
  },
  "timeRange": {
    "start": "2025-10-09T00:00:00.000Z",
    "end": "2025-10-10T00:00:00.000Z"
  }
}
```

---

### **6. GET `/api/usage/export`**

Export **all usage data** (for backup or analysis).

**Request**:
```bash
GET http://localhost:8080/api/usage/export
```

**Response**:
```json
{
  "message": "Usage data exported successfully",
  "count": 1523,
  "data": [
    {
      "id": "1728493164000-x7k2m9p1q",
      "timestamp": "2025-10-09T19:39:24.000Z",
      "provider": "kokoro",
      "voiceId": "am_adam",
      // ... full entry
    },
    // ... all 1523 entries
  ]
}
```

**Use Case**: Download as CSV, backup to cloud, or analyze in Excel/Python.

---

### **7. DELETE `/api/usage/clear`**

Clear **all usage data** (dangerous!).

**Request**:
```bash
DELETE http://localhost:8080/api/usage/clear
```

**Response**:
```json
{
  "message": "Usage data cleared successfully"
}
```

**Note**: This deletes both in-memory data and the persistent file (`usage-data.json`).

---

## 🎨 Frontend Integration

### **Current Implementation** (`public/index.html`)

The frontend includes a **Usage Tracking Dashboard** with:
- 📊 Summary cards (total requests, duration, cost, characters)
- 📝 Recent activity log (last 10 requests)
- 🎙️ Voice breakdown (usage per voice)
- 🗑️ Clear data button

#### **HTML Structure** (lines 311-363)

```html
<div id="usage-section" style="display: none;">
  <!-- Summary Cards -->
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
    <div class="usage-card">
      <div class="usage-label">Total Requests</div>
      <div id="total-requests" class="usage-value">0</div>
    </div>
    <div class="usage-card">
      <div class="usage-label">Total Duration</div>
      <div id="total-duration" class="usage-value">0s</div>
    </div>
    <div class="usage-card">
      <div class="usage-label">Total Cost</div>
      <div id="total-cost" class="usage-value">$0.00</div>
    </div>
    <div class="usage-card">
      <div class="usage-label">Total Characters</div>
      <div id="total-characters" class="usage-value">0</div>
    </div>
  </div>

  <!-- Recent Entries -->
  <h3>📝 Recent Activity</h3>
  <div id="recent-entries"></div>

  <!-- Voice Breakdown -->
  <h3>🎙️ Voice Breakdown</h3>
  <div id="voice-stats"></div>

  <!-- Actions -->
  <button id="clear-usage-button" class="action-button">🗑️ Clear Usage Data</button>
</div>
```

#### **JavaScript Implementation** (lines 932-1077)

##### **1. Load Usage Summary** (lines 933-969)

```javascript
async function loadUsageSummary() {
    try {
        const response = await fetch(API_BASE + '/api/usage/summary');
        if (!response.ok) throw new Error('Failed to fetch usage summary');
        
        const data = await response.json();
        const summary = data.summary;

        // Update main stats
        totalRequestsEl.textContent = summary.totalRequests;
        totalDurationEl.textContent = formatDuration(summary.totalEstimatedDurationSeconds);
        totalCostEl.textContent = formatCost(summary.totalCost);
        totalCharactersEl.textContent = summary.totalCharacters.toLocaleString();

        // Update averages
        avgDurationEl.textContent = formatDuration(summary.avgDurationPerRequest);
        avgCharactersEl.textContent = summary.avgCharactersPerRequest.toFixed(0);

        // Update provider stats
        const providerStatsHtml = Object.entries(summary.byProvider || {})
            .map(([provider, stats]) => `
                <div><strong>${provider}:</strong> ${stats.requests} requests, ${formatCost(stats.cost)}</div>
            `).join('');
        providerStatsEl.innerHTML = providerStatsHtml || '<div style="color: #6c757d;">No provider data</div>';

    } catch (error) {
        console.error('Error loading usage summary:', error);
    }
}
```

##### **2. Load Recent Entries** (lines 972-1003)

```javascript
async function loadRecentEntries() {
    try {
        const response = await fetch(API_BASE + '/api/usage/recent?limit=10');
        if (!response.ok) throw new Error('Failed to fetch recent entries');
        
        const data = await response.json();
        const entries = data.entries;

        recentEntriesEl.innerHTML = '';
        if (entries.length === 0) {
            recentEntriesEl.innerHTML = '<div style="color: #6c757d; font-style: italic;">No recent usage entries</div>';
            return;
        }

        entries.forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'entry-item';
            entryDiv.innerHTML = `
                <div><strong>${entry.provider}:${entry.voiceId}</strong></div>
                <div style="color: #6c757d; font-size: 0.9em;">${new Date(entry.timestamp).toLocaleString()}</div>
                <div style="margin-top: 5px;">${entry.text.substring(0, 100)}${entry.text.length > 100 ? '...' : ''}</div>
                <div style="margin-top: 5px; font-size: 0.9em;">
                    ${entry.characterCount} chars | ${formatDuration(entry.estimatedDurationSeconds)} | ${formatCost(entry.cost)}
                </div>
            `;
            recentEntriesEl.appendChild(entryDiv);
        });

    } catch (error) {
        console.error('Error loading recent entries:', error);
    }
}
```

##### **3. Load Voice Breakdown** (lines 1006-1044)

```javascript
async function loadVoiceBreakdown() {
    try {
        const response = await fetch(API_BASE + '/api/usage/by-voice');
        if (!response.ok) throw new Error('Failed to fetch voice breakdown');
        
        const data = await response.json();
        const byVoice = data.byVoice;

        voiceStatsEl.innerHTML = '';
        Object.entries(byVoice).forEach(([voice, stats]) => {
            const voiceDiv = document.createElement('div');
            voiceDiv.className = 'voice-item';
            voiceDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${voice}</strong>
                        <div style="color: #6c757d; font-size: 0.9em;">
                            ${stats.requests} requests | ${stats.characters.toLocaleString()} chars
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div>${formatDuration(stats.estimatedDurationSeconds)}</div>
                        <div style="color: #28a745; font-weight: bold;">${formatCost(stats.cost)}</div>
                    </div>
                </div>
            `;
            voiceStatsEl.appendChild(voiceDiv);
        });

        if (Object.keys(byVoice).length === 0) {
            voiceStatsEl.innerHTML = '<div style="color: #6c757d; font-style: italic;">No voice data</div>';
        }

    } catch (error) {
        console.error('Error loading voice breakdown:', error);
    }
}
```

##### **4. Clear Usage Data** (lines 1057-1077)

```javascript
clearUsageButton.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all usage data? This cannot be undone.')) {
        return;
    }
    
    try {
        clearUsageButton.disabled = true;
        clearUsageButton.textContent = '🗑️ Clearing...';
        
        const response = await fetch(API_BASE + '/api/usage/clear', { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to clear usage data');
        
        await loadUsageData();
        statusText.textContent = 'Usage data cleared successfully.';
        
    } catch (error) {
        console.error('Error clearing usage data:', error);
        statusText.textContent = `Error clearing usage data: ${error.message}`;
    } finally {
        clearUsageButton.disabled = false;
        clearUsageButton.textContent = '🗑️ Clear Usage Data';
    }
});
```

##### **5. Auto-Refresh** (lines 1047-1054)

```javascript
function loadUsageData() {
    loadUsageSummary();
    loadRecentEntries();
    loadVoiceBreakdown();
}

// Auto-refresh every 30 seconds
setInterval(loadUsageData, 30000);
```

---

## 🚀 Custom Frontend Integration Examples

### **Example 1: Simple Usage Display**

```html
<!DOCTYPE html>
<html>
<head>
    <title>TTS Usage Dashboard</title>
</head>
<body>
    <h1>TTS Usage Dashboard</h1>
    
    <div id="stats">
        <p>Total Requests: <span id="total-requests">Loading...</span></p>
        <p>Total Duration: <span id="total-duration">Loading...</span></p>
        <p>Total Cost: <span id="total-cost">Loading...</span></p>
    </div>

    <script>
        const API_BASE = 'http://localhost:8080';

        async function loadStats() {
            const response = await fetch(`${API_BASE}/api/usage/summary`);
            const data = await response.json();
            const summary = data.summary;

            document.getElementById('total-requests').textContent = summary.totalRequests;
            document.getElementById('total-duration').textContent = 
                `${summary.totalEstimatedDurationSeconds.toFixed(1)}s`;
            document.getElementById('total-cost').textContent = 
                `$${summary.totalCost.toFixed(4)}`;
        }

        // Load stats on page load
        loadStats();

        // Refresh every 10 seconds
        setInterval(loadStats, 10000);
    </script>
</body>
</html>
```

---

### **Example 2: Provider Comparison Chart**

```javascript
async function loadProviderComparison() {
    const response = await fetch('http://localhost:8080/api/usage/by-provider');
    const data = await response.json();
    const byProvider = data.byProvider;

    // Prepare data for charting library (e.g., Chart.js)
    const providers = Object.keys(byProvider);
    const requests = providers.map(p => byProvider[p].requests);
    const costs = providers.map(p => byProvider[p].cost);

    // Example: Create a bar chart comparing providers
    const chartData = {
        labels: providers,
        datasets: [
            {
                label: 'Requests',
                data: requests,
                backgroundColor: 'rgba(54, 162, 235, 0.5)'
            },
            {
                label: 'Cost (USD)',
                data: costs,
                backgroundColor: 'rgba(255, 99, 132, 0.5)'
            }
        ]
    };

    // Render chart using Chart.js or similar
    // new Chart(ctx, { type: 'bar', data: chartData });
}
```

---

### **Example 3: Export to CSV**

```javascript
async function exportToCSV() {
    const response = await fetch('http://localhost:8080/api/usage/export');
    const data = await response.json();
    const entries = data.data;

    // Convert to CSV
    const headers = ['Timestamp', 'Provider', 'Voice', 'Characters', 'Duration', 'Cost'];
    const rows = entries.map(entry => [
        new Date(entry.timestamp).toISOString(),
        entry.provider,
        entry.voiceId,
        entry.characterCount,
        entry.estimatedDurationSeconds,
        entry.cost || 0
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // Download as file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tts-usage-${Date.now()}.csv`;
    a.click();
}
```

---

### **Example 4: Real-Time Voice Usage Monitor**

```javascript
let previousVoiceStats = {};

async function monitorVoiceUsage() {
    const response = await fetch('http://localhost:8080/api/usage/by-voice');
    const data = await response.json();
    const byVoice = data.byVoice;

    // Compare with previous state
    Object.entries(byVoice).forEach(([voice, stats]) => {
        const previousRequests = previousVoiceStats[voice]?.requests || 0;
        const newRequests = stats.requests - previousRequests;

        if (newRequests > 0) {
            console.log(`🎙️ ${voice}: ${newRequests} new request(s)`);
            showNotification(`${voice} used ${newRequests} time(s)`);
        }
    });

    previousVoiceStats = byVoice;
}

// Poll every 5 seconds
setInterval(monitorVoiceUsage, 5000);
```

---

## 📈 Data Persistence

### **File Storage** (`usage-data.json`)

Usage data is automatically saved to disk (if `persistData: true`):

```json
[
  {
    "id": "1728493164000-x7k2m9p1q",
    "timestamp": "2025-10-09T19:39:24.000Z",
    "provider": "kokoro",
    "voiceId": "am_adam",
    "text": "Hello world",
    "characterCount": 11,
    "estimatedDurationSeconds": 0.7,
    "cost": 0.000055,
    "metadata": { "format": "wav" }
  }
  // ... more entries
]
```

**Location**: `./usage-data.json` (root of project)

**Max Entries**: 10,000 (oldest entries are automatically removed)

**Auto-Save**: Every new request triggers a save

---

## 🔒 Security Considerations

### **Important Notes**:

1. **No Authentication**: Current API endpoints have no authentication
   - ⚠️ Anyone can access usage data
   - ⚠️ Anyone can clear usage data

2. **Production Recommendations**:
   ```typescript
   // Add authentication middleware
   app.use('/api/usage/*', authenticateUser);
   
   // Or restrict to admin users
   app.delete('/api/usage/clear', requireAdmin, (req, res) => { ... });
   ```

3. **Sensitive Data**: Text content is stored in logs
   - Consider redacting or hashing sensitive text
   - Or disable text storage:
     ```typescript
     usageTracker.trackUsage({
         provider,
         voiceId,
         text: '[REDACTED]',  // Don't store actual text
         characterCount: text.length,
         // ...
     });
     ```

---

## 🎓 Summary

### **Backend**:
- ✅ Automatic tracking on every TTS request
- ✅ Persistent storage to `usage-data.json`
- ✅ 7 API endpoints for querying data
- ✅ Statistics by provider, voice, and time range

### **Frontend**:
- ✅ Dashboard with summary cards
- ✅ Recent activity log
- ✅ Voice breakdown
- ✅ Auto-refresh every 30 seconds
- ✅ Clear data functionality

### **Usage Flow**:
```
1. User requests TTS audio
   ↓
2. Server synthesizes audio
   ↓
3. usageTracker.trackUsage() called automatically
   ↓
4. Data stored in memory + disk
   ↓
5. Frontend polls /api/usage/summary every 30s
   ↓
6. Dashboard updates with latest stats
```

### **Key Endpoints**:
- `/api/usage/summary` → Last 24 hours overview
- `/api/usage/recent` → Activity log
- `/api/usage/by-voice` → Per-voice statistics
- `/api/usage/export` → Full data export
- `/api/usage/clear` → Delete all data

That's everything you need to use and customize the usage tracking system! 🎉

