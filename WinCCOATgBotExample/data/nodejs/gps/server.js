"use strict";

// The command line for the Node.js manager must contain the path to
// this file relative to data/nodejs, e. g.:
//
// template/singleScript.js

// require WinCC OA interface
const { WinccoaManager } = require("winccoa-manager");
const winccoa = new WinccoaManager();

async function createAndSetDp() {
  // Create the data point
  const dpName = "sofiane";
  const dpType = "ExampleDP_Int"; // Ensure this data point type exists

  let dpCreated = false;

  winccoa.dpCreate(dpName, dpType);
  console.info("DP 'sofiane' created - " + dpCreated);

  // Set values every second
  let value = 50;
  setInterval(async () => {
    try {
      await winccoa.dpSetTimed(
        new Date(),
        dpName + ".:_original.._value",
        value
      );
      console.info(`Value set to ${value}`);
      value = value === 50 ? 60 : 50; // Toggle between 50 and 60
    } catch (exc) {
      console.error(exc);
    }
  }, 1000);

  const mqtt = require("mqtt");
  const fs = require("fs");
  const topics = new Set();
  const client = mqtt.connect("mqtt://test.monstermq.com");

  client.on("connect", () => {
    console.log("Connected to broker");
    client.subscribe("proveit/#", (err) => {
      if (err) {
        console.error("Subscription error:", err);
      } else {
        console.log("Subscribed to proveit/#");
      }
    });
  });

  client.on("message", (topic, message) => {
    if (!topics.has(topic)) {
      topics.add(topic);
      console.log(`New topic discovered: ${topic}`);
      saveTopicToFile(topic);
    }
  });

  function saveTopicToFile(topic) {
    fs.appendFile("discovered_topics.txt", topic + "\n", (err) => {
      if (err) {
        console.error("Error writing to file:", err);
      }
    });
  }
}

createAndSetDp();
