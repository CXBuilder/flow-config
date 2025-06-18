import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';

// Static assets will be bundled with the Lambda function
const STATIC_DIR = path.join(__dirname, 'static');

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse the requested path
    let requestedPath = event.path || '/';
    
    // Remove leading slash and query parameters
    if (requestedPath.startsWith('/')) {
      requestedPath = requestedPath.substring(1);
    }
    
    // Default to index.html for root path or paths without extensions
    if (requestedPath === '' || !path.extname(requestedPath)) {
      requestedPath = 'index.html';
    }
    
    // Construct the full file path
    const filePath = path.join(STATIC_DIR, requestedPath);
    
    // Security check: ensure the file is within the static directory
    if (!filePath.startsWith(STATIC_DIR)) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'text/plain'
        },
        body: 'Forbidden'
      };
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // For SPA routing, return index.html for non-existent routes
      if (requestedPath !== 'index.html') {
        const indexPath = path.join(STATIC_DIR, 'index.html');
        if (fs.existsSync(indexPath)) {
          const indexContent = fs.readFileSync(indexPath);
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'text/html',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            body: indexContent.toString(),
            isBase64Encoded: false
          };
        }
      }
      
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'text/plain'
        },
        body: 'Not Found'
      };
    }
    
    // Read the file
    const fileContent = fs.readFileSync(filePath);
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    
    // Determine if content should be base64 encoded
    const isBase64 = !mimeType.startsWith('text/') && 
                     !mimeType.includes('javascript') && 
                     !mimeType.includes('json') &&
                     !mimeType.includes('css');
    
    // Set appropriate cache headers
    const cacheControl = mimeType.startsWith('text/html') 
      ? 'no-cache, no-store, must-revalidate'
      : 'public, max-age=31536000'; // 1 year for static assets
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': cacheControl,
        'Content-Length': fileContent.length.toString()
      },
      body: isBase64 ? fileContent.toString('base64') : fileContent.toString(),
      isBase64Encoded: isBase64
    };
    
  } catch (error) {
    console.error('Error serving static file:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/plain'
      },
      body: 'Internal Server Error'
    };
  }
};