/**
 * Portable launcher for Full Cast TTS server
 * Handles command-line arguments for port configuration
 */

const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let port = 4001;
let configPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--config' && args[i + 1]) {
    configPath = args[i + 1];
    i++;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log('Usage: node portable-launcher.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --port <number>    Port to run server on (default: 4001)');
    console.log('  --config <path>    Path to .env config file');
    console.log('  --help, -h         Show this help message');
    process.exit(0);
  }
}

// Set environment variables
process.env.FULL_CAST_TTS_PORT = port.toString();

// Detect if running in pkg bundle (pkg sets process.pkg)
if (process.pkg) {
  // Running as packaged executable - disable pino-pretty (pkg can't handle dynamic transports)
  console.log(`[Launcher] Running as packaged executable (pkg)`);
  // Disable pino-pretty transport which doesn't work in pkg bundles
  process.env.PINO_PRETTY = 'false';
  // Set NODE_ENV to production if not already set to disable pretty printing
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }
}

if (configPath) {
  process.env.DOTENV_CONFIG_PATH = path.resolve(configPath);
  require('dotenv').config({ path: configPath });
} else {
  // Try to load .env from executable directory when running in pkg bundle
  if (process.pkg) {
    // In pkg bundles, use process.execPath to get the executable directory
    const execDir = path.dirname(process.execPath);
    const envPath = path.join(execDir, '.env');
    if (require('fs').existsSync(envPath)) {
      console.log(`[Launcher] Loading .env from executable directory: ${envPath}`);
      require('dotenv').config({ path: envPath });
    } else {
      console.log(`[Launcher] No .env file found at: ${envPath}`);
      console.log(`[Launcher] Please create a .env file in the same directory as the executable with your API keys.`);
    }
  } else {
    // Try to load .env from server directory (development mode)
    const serverDir = __dirname;
    const envPath = path.join(serverDir, '.env');
    if (require('fs').existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
    }
  }
}

console.log(`[Launcher] Starting Full Cast TTS server on port ${port}`);

// Detect if running in pkg bundle (pkg sets process.pkg)
// In pkg bundles, __dirname points to snapshot path which doesn't exist as real directory
if (process.pkg) {
  // Running as packaged executable - don't chdir, paths are relative to executable
  // The server.cjs will handle paths using __dirname which works in pkg
} else {
  // Running as regular Node.js script - can chdir for relative paths
  console.log(`[Launcher] Server directory: ${__dirname}`);
  try {
    process.chdir(__dirname);
  } catch (err) {
    console.warn(`[Launcher] Could not chdir to ${__dirname}: ${err.message}`);
    // Continue anyway - server should handle paths relative to __dirname
  }
}

// Load and run the actual server
// The server.cjs will read PORT from process.env.FULL_CAST_TTS_PORT
require('./server.cjs');

