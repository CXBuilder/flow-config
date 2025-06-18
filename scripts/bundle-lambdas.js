#!/usr/bin/env node

const esbuild = require('esbuild');
const { readdirSync, statSync, mkdirSync } = require('fs');
const { resolve, relative, join } = require('path');

async function bundleLambdas() {
  console.log('🚀 Bundling Lambda functions...');
  
  // Find all TypeScript files at the root of backend directory using fs
  const backendDir = resolve('./backend');
  console.log('Scanning backend directory:', backendDir);
  
  let handlerFiles = [];
  try {
    const files = readdirSync(backendDir);
    handlerFiles = files
      .filter(file => {
        const fullPath = join(backendDir, file);
        const isFile = statSync(fullPath).isFile();
        const isTsFile = file.endsWith('.ts');
        return isFile && isTsFile;
      })
      .map(file => resolve(backendDir, file));
  } catch (error) {
    console.error('Error reading backend directory:', error);
    return;
  }
  
  console.log('Found handler files:', handlerFiles);
  
  if (!handlerFiles || handlerFiles.length === 0) {
    console.log('No TypeScript files found in backend/ directory');
    return;
  }
  
  for (const handlerFile of handlerFiles) {
    const relativePath = relative(process.cwd(), handlerFile);
    const fileName = require('path').basename(handlerFile, '.ts');
    const outputDir = resolve('dist/backend', fileName);
    const outputFile = resolve(outputDir, 'index.js');
    
    console.log(`📦 Bundling ${relativePath} -> ${relative(process.cwd(), outputFile)}`);
    
    // Ensure output directory exists
    mkdirSync(outputDir, { recursive: true });
    
    try {
      // Bundle with esbuild
      await esbuild.build({
        entryPoints: [handlerFile],
        bundle: true,
        platform: 'node',
        target: 'node22',
        format: 'cjs',
        outfile: outputFile,
        external: [
          // AWS SDK v3 is provided by Lambda runtime
          '@aws-sdk/*',
          // Lambda Powertools is provided by AWS layer
          '@aws-lambda-powertools/*'
        ],
        sourcemap: true,
        minify: false, // Keep readable for debugging
        keepNames: true,
      });
      
      console.log(`✅ Successfully bundled ${relativePath}`);
    } catch (error) {
      console.error(`❌ Failed to bundle ${relativePath}:`, error);
      process.exit(1);
    }
  }
  
  console.log('🎉 All Lambda functions bundled successfully!');
}

bundleLambdas().catch((error) => {
  console.error('❌ Lambda bundling failed:', error);
  process.exit(1);
});