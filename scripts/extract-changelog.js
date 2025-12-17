#!/usr/bin/env node

/**
 * Extract changelog section for a specific version
 * Usage: node extract-changelog.js <version>
 *
 * Reads CHANGELOG.md and extracts the section for the given version.
 * The section starts with "## {version}" and ends before the next "##" heading.
 * Outputs the content to stdout and also sets it as a GitHub Actions output.
 */

const fs = require('fs');
const path = require('path');

function extractChangelogSection(version) {
  const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');

  if (!fs.existsSync(changelogPath)) {
    console.error('CHANGELOG.md not found');
    process.exit(1);
  }

  const changelog = fs.readFileSync(changelogPath, 'utf-8');
  const lines = changelog.split('\n');

  // Find the version heading (e.g., "## 0.18.0" or "## 0.18.0 (2025-11-22)")
  const versionPattern = new RegExp(`^## ${version.replace(/\./g, '\\.')}(?:\\s|$)`);
  let startIndex = -1;
  let endIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (versionPattern.test(lines[i])) {
      startIndex = i;
      // Find the next version heading
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('## ')) {
          endIndex = j;
          break;
        }
      }
      if (endIndex === -1) {
        endIndex = lines.length;
      }
      break;
    }
  }

  if (startIndex === -1) {
    console.error(`Version ${version} not found in CHANGELOG.md`);
    process.exit(1);
  }

  // Extract the section (excluding the version heading itself)
  const sectionLines = lines.slice(startIndex + 1, endIndex);

  // Trim leading and trailing empty lines
  while (sectionLines.length > 0 && sectionLines[0].trim() === '') {
    sectionLines.shift();
  }
  while (sectionLines.length > 0 && sectionLines[sectionLines.length - 1].trim() === '') {
    sectionLines.pop();
  }

  const content = sectionLines.join('\n');

  // Output for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    // Escape content for GitHub Actions multiline output
    const delimiter = 'EOF';
    const output = `content<<${delimiter}\n${content}\n${delimiter}\n`;
    fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
  }

  // Also output to stdout for debugging
  console.log(content);

  return content;
}

// Main execution
const version = process.argv[2];

if (!version) {
  console.error('Usage: node extract-changelog.js <version>');
  process.exit(1);
}

extractChangelogSection(version);
