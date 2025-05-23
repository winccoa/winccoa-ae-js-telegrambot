"use strict";
/**
  @file $relPath
  @copyright $copyright
  @author Sofiane Boukhezzar
*/
// The command line for the Node.js manager must contain the path to
// this file relative to data/nodejs, e. g.:
//
// template/singleScript.js

// require WinCC OA interface
const { WinccoaManager } = require("winccoa-manager");
const winccoa = new WinccoaManager();

const mqtt = require("mqtt");
const fs = require("fs");
const topics = new Set();

// File path where topics will be saved  C:\WinCC_OA_Proj\WCCOA_3_20\ProveIt_In_Dallas\source
let paths = winccoa.getPaths();
const filePath = paths[0] + "/source/discovered_topics.txt";

// Load existing topics from the file into the Set at the start
fs.readFile(filePath, "utf8", (err, data) => {
  if (err && err.code !== "ENOENT") {
    console.error("Error reading file:", err);
    return;
  }

  // If the file contains topics, add them to the set without printing
  if (data) {
    const existingTopics = data.split("\n").filter(Boolean); // Remove any empty lines
    existingTopics.forEach((topic) => topics.add(topic));
  }

  // Connect to the MQTT broker after loading existing topics
  connectToBroker();
});

function connectToBroker() {
  // Connect to the MQTT broker
  //const client = mqtt.connect("mqtt://test.monstermq.com");
  const client = mqtt.connect("mqtt://99.56.151.218:1883", {
    username: "proveitreadonly",
    password: "proveitreadonlypassword",
  });

  // When the client connects, subscribe to the 'proveit/#' topic
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
  //let sDirection = "/2";
  // When a message is received, check if the topic is new
  client.on("message", (topic, message) => {
    let itype = 16;
    let iDriverNum = 3;
    let sConnection = "_ProveIt";
    let interee;
    if (!topics.has(topic)) {
      // New topic that isn't in the Set or file
      topics.add(topic); // Add the new topic to the set
      console.log(`New topic discovered under 'proveit': ${topic}`);

      // Trigger the control script in WinCC OA to update the DPs by setting a dummy value.
      winccoa.dpSetTimed(
        new Date(),
        "updateTrigger.:_original.._value",
        !bTrigger
      );
      // Set the _address configuration for subscription mode
      saveTopicToFile(topic); // Save the new topic to the file
    }
  });
}

// Function to save a new topic to the file
function saveTopicToFile(topic) {
  fs.appendFile(filePath, topic + "\n", (err) => {
    if (err) {
      console.error("Error writing to file:", err);
    }
  });
}
