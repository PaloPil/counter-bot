const fs = require("node:fs").promises;
const fsSync = require("node:fs");
const path = require("node:path");

const guilds_dir = path.join(__dirname, "..", "guilds");

// Ensure guilds directory exists
if (!fsSync.existsSync(guilds_dir)) {
  fsSync.mkdirSync(guilds_dir, { recursive: true });
}

const calculate_url = process.env.MATHEVAL_URL
  ? `http://${process.env.MATHEVAL_URL}/calculate`
  : null;

/**
 * Detects potentially malicious or resource-intensive input
 * @param {string} str - Input string to check
 * @returns {boolean} - True if input is suspicious
 */
function suspect_input(str) {
  if (typeof str !== "string") return true;

  return (str.split("|").length > 100) ||
         (str.split("*").length > 100) ||
         (str.split("_").length > 100) ||
         (str.split("`").length > 100) ||
         (str.split("~").length > 100) ||
         (str.length > 1000) ||
         /[<>{}[\]\\]/.test(str); // Additional suspicious characters
}


// Cache for active timeouts to prevent memory leaks
const activeTimeouts = new Map();

/**
 * Mutes a member by adding a role for a specified time
 * @param {GuildMember} member - The member to mute
 * @param {number} time - Time in minutes
 * @param {string} roleId - ID of the timeout role
 */
function mute(member, time, roleId) {
  if (!member || !member.roles) {
    console.error("Invalid member object for muting");
    return;
  }

  // Clear any existing timeout for this member
  const existingTimeout = activeTimeouts.get(member.id);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  member.roles.add(roleId)
    .then(() => {
      console.log(`Muted ${member.user.tag} for ${time} minutes`);

      const timeoutId = setTimeout(() => {
        member.roles.remove(roleId)
          .then(() => {
            console.log(`Unmuted ${member.user.tag}`);
            activeTimeouts.delete(member.id);
          })
          .catch(error => {
            console.error(`Failed to unmute ${member.user.tag}:`, error.message);
            activeTimeouts.delete(member.id);
          });
      }, time * 60 * 1000);

      activeTimeouts.set(member.id, timeoutId);
    })
    .catch(error => {
      console.error(`Failed to mute ${member.user.tag}:`, error.message);
    });
}

/**
 * Stores the current number and user ID for a guild
 * @param {string} guildId - Guild ID
 * @param {number} num - Current number
 * @param {string} userId - User ID who sent the correct number
 */
async function store_number(guildId, num, userId) {
  try {
    const filePath = path.join(guilds_dir, `${guildId}.txt`);

    // Check if file exists before reading
    if (!fsSync.existsSync(filePath)) {
      console.error(`Configuration file not found for guild ${guildId}`);
      return;
    }

    const data = await fs.readFile(filePath, "utf-8");
    const lines = data.split("\n");

    lines[0] = num.toString();
    lines[1] = userId;

    await fs.writeFile(filePath, lines.join("\n"), "utf-8");
  } catch (error) {
    console.error(`Failed to store number for guild ${guildId}:`, error.message);
  }
}

// Cache for server configurations to avoid repeated file reads
const configCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

/**
 * Gets server configuration data for a guild
 * @param {string} guildId - Guild ID
 * @returns {object} - Server configuration object
 */
function get_server_data(guildId) {
  try {
    // Check cache first
    const cached = configCache.get(guildId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const filePath = path.join(guilds_dir, `${guildId}.txt`);

    if (!fsSync.existsSync(filePath)) {
      return { num: null };
    }

    const data = fsSync.readFileSync(filePath, "utf-8").split("\n");

    // Validate data format
    if (data.length < 6) {
      console.error(`Invalid configuration format for guild ${guildId}`);
      return { num: null };
    }

    const num = parseInt(data[0], 10);
    const userId = data[1];
    const channelId = data[2];
    const time = parseInt(data[3], 10);
    const roleId = data[4];
    const emoji = data[5] ? data[5].trim() : "✅";

    // Validate parsed data
    if (isNaN(num) || isNaN(time)) {
      console.error(`Invalid number format in configuration for guild ${guildId}`);
      return { num: null };
    }

    const result = { num, userId, channelId, time, roleId, emoji };

    // Cache the result
    configCache.set(guildId, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    console.error(`Failed to read server data for guild ${guildId}:`, error.message);
    return { num: null };
  }
}

/**
 * Parses a mathematical expression or simple number
 * @param {string} str - Input string to parse
 * @returns {Promise<number>} - Parsed number or NaN if invalid
 */
async function parse(str) {
  if (suspect_input(str)) {
    console.log("===== SUSPECT INPUT DETECTED =====\n" +
                 str +
                "\n==================================");
    return NaN;
  }

  // Remove Discord spoiler tags
  str = str.replace(/(\|\|.*?\|\|)/g, "");

  // Try simple number parsing first
  const simpleNumber = parseFloat(str.trim());
  if (!isNaN(simpleNumber) && isFinite(simpleNumber)) {
    return Math.floor(simpleNumber); // Ensure integer for counting
  }

  // Only use external math evaluation if URL is configured
  if (!calculate_url) {
    return NaN;
  }

  try {
    const response = await fetch(calculate_url, {
      method: "POST",
      body: JSON.stringify({
        expression: str,
        variables: {}
      }),
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "counter-bot/1.0.0"
      },
      timeout: 5000 // 5 second timeout
    });

    if (!response.ok) {
      console.error(`Math evaluation service returned ${response.status}`);
      return NaN;
    }

    const data = await response.json();

    if (data.error) {
      return NaN;
    }

    const result = parseFloat(data.result);
    return isNaN(result) || !isFinite(result) ? NaN : Math.floor(result);
  } catch (error) {
    console.error("Math evaluation error:", error.message);
    return NaN;
  }
}

/**
 * Clears configuration cache for a guild
 * @param {string} guildId - Guild ID
 */
function clear_cache(guildId) {
  configCache.delete(guildId);
}


module.exports = {
  mute,
  store_number,
  get_server_data,
  parse,
  clear_cache
};
