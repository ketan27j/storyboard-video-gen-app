# ChatGPT Image Generation Automation

This document explains how to use the new ChatGPT browser automation feature for image generation in the Storyboard Video Generation App.

## Overview

The application now supports browser automation using Playwright to interact with ChatGPT's image generation feature. Instead of calling APIs directly, the system will:

1. Open a browser window and navigate to ChatGPT
2. Navigate to the Images tab
3. Upload reference images (if provided)
4. Submit the prompt for image generation
5. Download the generated image to the project directory

## Configuration

### Environment Variables

Update your `.env` file to use ChatGPT for image generation:

```bash
# Image generation
IMAGE_GEN_PROVIDER=chatgpt
```

Other relevant environment variables:
```bash
# Browser automation settings
HEADLESS_BROWSER=false                    # Set to true for production
IMAGE_GEN_TIMEOUT=120000                  # Timeout in milliseconds (2 minutes)
```

### Required Dependencies

Playwright is already included in the project dependencies. If you need to install browsers:

```bash
cd backend
npm install
npx playwright install
```

## Usage

### 1. Start the Backend

```bash
cd backend
npm run start:dev
```

### 2. Login to ChatGPT

When the application starts and you trigger the first image generation:

1. A browser window will open automatically
2. Navigate to https://chat.openai.com and login with your credentials
3. The system will wait for you to login (up to 2 minutes)
4. Once logged in, the automation will proceed

**Note:** You only need to login once per browser session. The browser will remain open for subsequent image generations.

### 3. Generate Images

Use the application as normal:

1. Go to the Storyboard page in the frontend
2. Click "Generate Image" on any image prompt card
3. The system will:
   - Open ChatGPT (if not already open)
   - Navigate to the Images tab
   - Upload any reference images
   - Submit your prompt
   - Download the generated image
   - Display it in the application

## Testing

### Run the Test Script

You can test the ChatGPT automation independently:

```bash
cd backend
npm run test:chatgpt
```

This will:
- Initialize the browser
- Navigate to ChatGPT
- Prompt you to login manually
- Generate a test image
- Save it to the output directory
- Display the file path

### Manual Testing

1. Start the backend server
2. Start the frontend server (`npm run dev` in frontend/)
3. Open http://localhost:5173
4. Create a new storyboard
5. Click "Generate Image" on any scene
6. Follow the browser automation steps

## File Locations

### Generated Images

Images are saved to:
```
backend/output/images/chatgpt/
```

The application will automatically serve these images through the API.

### Test Script

The test script is located at:
```
backend/test-chatgpt.ts
```

## Error Handling

The system includes comprehensive error handling for:

- **Login failures**: Will prompt user to login manually
- **Navigation failures**: Will try alternative selectors for ChatGPT interface elements
- **Upload failures**: Will skip reference images if upload buttons aren't found
- **Generation failures**: Will retry and provide detailed error messages
- **Download failures**: Will handle download path issues and file copying

## Browser Automation Details

### What the Automation Does

1. **Initialize Browser**: Launches Chromium with appropriate settings
2. **Navigate to ChatGPT**: Goes to https://chat.openai.com
3. **Login Check**: Verifies if user is already logged in
4. **Manual Login**: Waits for user to login if needed (2-minute timeout)
5. **Navigate to Images**: Finds and clicks the Images tab
6. **Upload Images**: Uploads reference images if provided
7. **Submit Prompt**: Enters the prompt and clicks generate
8. **Wait for Generation**: Waits for the image to be generated
9. **Download Image**: Downloads the generated image
10. **Cleanup**: Copies file to final location and maintains browser session

### Browser Settings

- **Headless Mode**: Controlled by `HEADLESS_BROWSER` environment variable
- **Viewport**: 1280x720 pixels
- **Timeouts**: Configurable via environment variables
- **Downloads**: Automatically handled by Playwright

## Troubleshooting

### Common Issues

1. **Browser won't launch**
   - Ensure Playwright browsers are installed: `npx playwright install`
   - Check system requirements for Chromium

2. **Login timeout**
   - Make sure to login within 2 minutes
   - Check that ChatGPT is accessible from your location

3. **Images tab not found**
   - ChatGPT interface may have changed
   - The system tries multiple selectors, but may need updates

4. **Upload failures**
   - Reference images must exist at the provided paths
   - ChatGPT may have changed upload interface

5. **Download failures**
   - Check that output directory is writable
   - Ensure sufficient disk space

### Debug Mode

Set `HEADLESS_BROWSER=false` to see the browser automation in action, which helps with debugging interface changes.

## Integration with Existing System

The ChatGPT automation integrates seamlessly with the existing architecture:

- **Frontend**: No changes required - same "Generate Image" button
- **Backend API**: Same `/api/pipeline/:id/generate-image` endpoint
- **Queue System**: Uses the same Bull queue for image generation
- **Storage**: Images are saved and served the same way
- **Real-time Updates**: WebSocket updates work the same way

## Performance Considerations

- **Browser Overhead**: Browser automation is slower than API calls
- **Manual Steps**: Requires user login for the first session
- **Resource Usage**: Browser consumes more memory than API calls
- **Timeouts**: Generation may take longer than API-based approaches

## Future Improvements

Potential enhancements:
- **Auto-login**: Store credentials securely for automatic login
- **Better Error Recovery**: More robust handling of interface changes
- **Parallel Generation**: Multiple browser instances for concurrent generation
- **Caching**: Cache generated images to avoid regeneration
- **Progress Tracking**: Better progress indicators during generation

## Security Notes

- **Credentials**: Currently requires manual login for security
- **Browser Data**: Browser session is maintained between generations
- **File Access**: Images are saved to the project directory with appropriate permissions
- **Network**: Only connects to chat.openai.com for image generation