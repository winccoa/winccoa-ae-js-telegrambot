"use strict";
/**
  @file $relPath
  @copyright $copyright
  @author Sofiane Boukhezzar
*/

const { WinccoaManager } = require("winccoa-manager");
const winccoa = new WinccoaManager();

const mqtt = require("mqtt");
const fs = require("fs");
const topics = new Set();
const topicTree = {}; // Object to store topics in a hierarchical format

// File paths for saving topics and topic tree
let paths = winccoa.getPaths();
const topicFilePath = paths[0] + "/source/discovered_topics.txt";
const jsonFilePath = paths[0] + "/source/topics_tree.json";

// Load existing topics from the file at startup
fs.readFile(topicFilePath, "utf8", (err, data) => {
  if (err && err.code !== "ENOENT") {
    console.error("Error reading topic file:", err);
    return;
  }

  if (data) {
    const existingTopics = data.split("\n").filter(Boolean);
    existingTopics.forEach((topic) => {
      topics.add(topic);
      addToTopicTree(topic); // Build the JSON tree with existing topics
    });
  }

  // Write the initial tree to the JSON file after loading existing topics
  updateJsonFile();

  // Connect to the MQTT broker after initializing topics
  connectToBroker();
});

function connectToBroker() {
  // Connect to the MQTT broker
  const client = mqtt.connect("mqtt:proveit.virtualfactory.online:1883", {
    username: "siemens",
    password: "vendor0199",
  });

  client.on("connect", () => {
    console.log("Connected to broker");
    client.subscribe("Enterprise/#", (err) => {
      if (err) {
        console.error("Subscription error:", err);
      } else {
        console.log("Subscribed to Enterprise/#");
      }
    });
  });

  let bTrigger = false;

  client.on("message", (topic, message) => {
    if (!topics.has(topic)) {
      topics.add(topic);
      console.log(`New topic discovered under 'proveit': ${topic}`);

      winccoa.dpSetTimed(
        new Date(),
        "updateTrigger.:_original.._value",
        !bTrigger
      );

      const dataType = determineDataType(message);
      saveTopicToFile(topic, dataType);
      addToTopicTree(topic); // Add the topic to the JSON tree structure
      updateJsonFile(); // Write the updated tree to the JSON file
    }
  });
}

// Function to determine the data type of the MQTT message value
function determineDataType(value) {
  try {
    const parsedValue = JSON.parse(value);

    if (Array.isArray(parsedValue)) {
      return "Array";
    } else if (typeof parsedValue === "object" && parsedValue !== null) {
      return "Object";
    } else {
      return typeof parsedValue;
    }
  } catch (error) {
    // If JSON parsing fails, treat as a string
    return "string";
  }
}

// Function to save a new topic and its data type to the text file
function saveTopicToFile(topic, dataType) {
  const entry = `${topic}\t${dataType}\n`;
  fs.appendFile(topicFilePath, entry, (err) => {
    if (err) {
      console.error("Error writing to topic file:", err);
    }
  });
}

// Function to add a topic to the hierarchical JSON tree structure
function addToTopicTree(topic) {
  const levels = topic.split("/"); // Split topic by "/"
  let currentLevel = topicTree; // Start from the root of the tree

  levels.forEach((level) => {
    if (!currentLevel[level]) {
      currentLevel[level] = {}; // Create nested objects for each level
    }
    currentLevel = currentLevel[level]; // Move deeper into the tree
  });
}

// Function to update the JSON file with the hierarchical topic tree
function updateJsonFile() {
  fs.writeFile(jsonFilePath, JSON.stringify(topicTree, null, 2), (err) => {
    if (err) {
      console.error("Error writing to JSON file:", err);
    } else {
      console.log(`Updated JSON tree saved to: ${jsonFilePath}`);
    }
  });
}
