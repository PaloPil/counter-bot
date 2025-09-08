#!/usr/bin/env node

/**
 * Health check script for the Counter Bot
 * Returns exit code 0 if healthy, 1 if unhealthy
 */

const path = require("node:path");
const fs = require("node:fs");

function checkEnvironmentVariables() {
  const required = ["DISCORD_TOKEN"];
  const missing = required.filter(env => !process.env[env]);

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
    return false;
  }

  console.log("✅ Environment variables are configured");
  return true;
}

function checkDirectoryStructure() {
  const requiredDirs = ["commands", "events", "lib"];
  const requiredFiles = [
    "index.js",
    "commands/setup.js",
    "events/ready.js",
    "events/messageCreate.js",
    "lib/utils.js"
  ];

  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      console.error(`❌ Missing required directory: ${dir}`);
      return false;
    }
  }

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`❌ Missing required file: ${file}`);
      return false;
    }
  }

  console.log("✅ Directory structure is valid");
  return true;
}

function checkSyntax() {
  const jsFiles = [
    "index.js",
    "commands/setup.js",
    "events/ready.js",
    "events/messageCreate.js",
    "events/messageDelete.js",
    "events/messageUpdate.js",
    "events/interactionCreate.js",
    "lib/utils.js"
  ];

  for (const file of jsFiles) {
    try {
      require(path.resolve(file));
    } catch (error) {
      console.error(`❌ Syntax error in ${file}: ${error.message}`);
      return false;
    }
  }

  console.log("✅ All JavaScript files have valid syntax");
  return true;
}

function main() {
  console.log("🔍 Running Counter Bot health check...\n");

  // Load environment variables
  require("dotenv").config();

  const checks = [
    checkEnvironmentVariables,
    checkDirectoryStructure,
    checkSyntax
  ];

  let allPassed = true;

  for (const check of checks) {
    if (!check()) {
      allPassed = false;
    }
    console.log("");
  }

  if (allPassed) {
    console.log("🎉 All health checks passed! Bot is ready to run.");
    process.exit(0);
  } else {
    console.log("❌ Health check failed. Please fix the issues above.");
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkEnvironmentVariables, checkDirectoryStructure, checkSyntax };
