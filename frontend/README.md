# Frontend - Multi-Step Form App

React + TypeScript frontend built with Vite.

## Setup

```bash
cd frontend
npm install
```

## Development

```bash
npm run dev
```

The app will run on http://localhost:3000

## Build

```bash
npm run build
```

## Testing

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## Linting & Formatting

```bash
# Check for linting errors
npm run lint

# Fix linting errors automatically
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

## Features

- Login page with JWT authentication
- Multi-step form with conditional questions
- Support for text, number, select, and boolean question types
- Client-side conditional evaluation (==, !=, in, >, <)
- Product creation and response submission
- Offline autosave with retry queue
- PDF generation with progress tracking
- Toast notifications for user feedback

## Environment Variables

- `VITE_API_BASE_URL` or `VITE_API_URL` - Backend API URL (default: http://localhost:4000)

## Authentication

The app uses JWT tokens stored in localStorage. Use the seeded backend user:

- **Email:** `admin@democo.io`
- **Password:** `Password123!`

## Debugging

### CORS Issues

If you encounter CORS errors:

1. Ensure the backend is running on the expected port (default: 4000)
2. Check that `VITE_API_BASE_URL` or `VITE_API_URL` matches your backend URL
3. Verify the backend CORS configuration allows your frontend origin
4. Check browser console for specific CORS error messages

### Token Issues

If authentication fails:

1. Check browser DevTools → Application → Local Storage for the `token` key
2. Verify the token hasn't expired (default: 7 days)
3. Check Network tab for 401 responses
4. Try logging out and logging back in
5. Clear localStorage if token appears corrupted

### Network Errors

- Check that the backend is running: `curl http://localhost:4000/health`
- Verify `VITE_API_BASE_URL` or `VITE_API_URL` is correct
- Check browser console for detailed error messages

## Offline Autosave

The app includes an offline autosave queue that:

- Automatically saves form answers every 2 seconds (debounced)
- Queues failed saves in localStorage when offline or on network errors
- Retries queued saves with exponential backoff (1s, 2s, 4s, 8s, 16s, max 60s)
- Automatically flushes queue when connection is restored
- Shows pending saves count in the header

### Inspecting Queued Jobs

To inspect queued autosave jobs:

1. Open browser DevTools → Application → Local Storage
2. Look for key: `autosave_queue`
3. The value is a JSON array of queued jobs with:
   - `id`: Unique job identifier
   - `productId`: Product ID
   - `payload`: Array of question/answer pairs
   - `attempts`: Number of retry attempts
   - `nextAttemptAt`: Timestamp for next retry (if waiting)

Example:
```json
[
  {
    "id": "uuid-here",
    "productId": "product-123",
    "payload": [
      { "questionKey": "q1", "answer": "value" }
    ],
    "attempts": 2,
    "nextAttemptAt": 1234567890
  }
]
```

### Manual Queue Management

- Click the "Retry" button in the header to manually flush the queue
- Failed jobs (after 5 attempts) remain in queue for debugging
- Clear localStorage to reset the queue (will lose pending saves)

