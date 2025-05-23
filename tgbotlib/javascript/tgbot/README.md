**1. Installation**
1.  Clone or copy this repository locally.

2.  Integrate this directory as a sub-project of a WinCC OA project.

3.  Use the ASCII manager to import dplist/tgchannel.dpl.

4.  Open a command prompt in the directory javascript/tgchannel

5.  Call the following command to install required modules

```> npm install```
**2. Telegram Bot Registration**

To register and configure a new Telegram bot for use with the WinCC OA
system:

1.  Open Telegram and Access \@BotFather:

    -   Start a chat with \@BotFather, the official bot management
        interface in Telegram.

2.  Create a New Bot:

    -   Use the command /newbot.

    -   Follow the instructions to assign a name and username to your
        bot.

    -   Upon successful creation, you will receive a unique API Key.
        Copy this key, as it will be required for integration.

3.  Adjust Privacy Settings:

    -   Use the command /setprivacy in \@BotFather.

    -   Set privacy to \"Disabled\" to allow the bot to receive messages
        from both private and group chats.

**3. WinCC OA Configuration**

3.1. API Key Configuration

1.  Open the TgBotPanel.pnl in your WinCC OA project.

2.  Paste the Telegram API Key into the designated field under the API
    Key section.

3.  Click the Set API Key button to store the key in the system.

3.2. Starting the Bot Backend

1.  Start the bot service by launching the JavaScript Manager configured
    for the script tgbot/index.js.

**4. Initial Bot Usage**

1.  Initiate Communication:

    -   Start a chat with your bot in Telegram. Alternatively, create a
        new group and add the bot as a member.

    -   Note: If the bot is added to a group, the corresponding Chat ID
        will be a negative value.

2.  Link Users/Groups to Chat IDs:

    -   In the TgBotPanel.pnl, assign a user or user group to the Chat
        ID obtained from Telegram.

    -   This links the bot to the user or group in the WinCC OA system.

**5. Configuring Data Points and Alerts**

The TgBotPanel.pnl provides several configuration fields for mapping
data points and alerts. Use a semicolon (;) as a delimiter when entering
multiple values.

**5.1. DPEs for Writing**

Define data points (DPEs) that users can set values for. Example:

> System1:Enterprise/Dallas/Press/Press_103/Line/OEE/OEE_Availability.;System1:Enterprise/Dallas/Press/Press_103/Line/OEE/OEE_Performance.;System1:Enterprise/Dallas/Press/Press_103/Line/OEE/OEE_Quality.;

**5.2. DPEs for Trends**

Specify data points for monitoring and visualizing trends. Example:

> System1:Enterprise/Dallas/Press/Press_103/Line/OEE/OEE_Availability.;System1:Enterprise/Dallas/Press/Press_103/Line/OEE/OEE_Performance.;System1:Enterprise/Dallas/Press/Press_103/Line/OEE/OEE_Quality.;

**5.3. Alert Queries**

Define SQL-style queries for monitoring alerts. Example:

> SELECT ALERT \'\_alert_hdl..\_value\', \'\_alert_hdl..\_text\',
> \'\_alert_hdl..\_act_state\' FROM
> \'System1:Enterprise/Dallas/Press/Press_103/Line/OEE/OEE\_\*\';

**5.4. DPEs for Acknowledgment**

List data points that users can acknowledge via Telegram. Example:

> System1:Enterprise/Dallas/Press/Press_103/Line/OEE/OEE_Availability.;System1:Enterprise/Dallas/Press/Press_103/Line/OEE/OEE_Performance.;System1:Enterprise/Dallas/Press/Press_103/Line/OEE/OEE_Quality.;

**6. Summary of Key Actions in TgBotPanel.pnl**

-   Assign Users/Groups: Link Telegram Chat IDs with specific users or
    groups in the WinCC OA system.

-   Set API Key: Store the bot\'s API Key for seamless communication.

-   Assign Data Points:

    -   DPEs for Writing: Data points users can set.

    -   DPEs for Trends: Data points for trend monitoring.

    -   DPEs for Acknowledgment: Data points users can acknowledge.

-   Alert Queries: Configure SQL-style queries to monitor specific
    alerts.

> **❗ ❗ ❗ Important note**: For every chat every field must be filled
> (If empty values are needed ";" should be used, for alarm query should
> be used valid query, which returns empty result)

**7. Telegram Menu Structure and Button Functionality**

**Main Menu**

-   **📈 Trends:** Opens the trends menu, allowing users to analyze data
    trends.

-   **🚨 Alarms:** Provides alarm-related features.

-   **⚙️ Configs:** Opens a submenu with configuration options.

-   **🔧 Parameters:** Enables interaction with system parameters.

-   **🏠 Home:** Returns to the main menu.

**Submenus**

**Configs Menu**

-   **Alarm subscriptions:** Manages alarm subscriptions.

-   **Trends conf:** Configures trend analysis.

-   **🏠 Home:** Returns to the main menu.

**Trends Time Ranges Menu**

-   **1 Hour:** Displays trends for the past hour.

-   **12 Hours:** Displays trends for the past 12 hours.

-   **24 Hours:** Displays trends for the past 24 hours.

-   **🏠 Home:** Returns to the main menu.

**Trends Conf Menu**

-   **➕ Add trend:** Adds a new trend.

-   **➖ Delete trend:** Deletes an existing trend.

-   **⚙️ Edit trend:** Edits trend configuration.

-   **🏠 Home:** Returns to the main menu.

**7.1. Functional Descriptions**

**📈 Trends**

-   **Purpose:** Displays trends for specified time ranges.

-   **User Interaction:** User selects a preconfigured trend and a time
    range, and the bot retrieves trend data.

**🚨 Alarms**

-   **Purpose:** Displays current alarms list.

-   **User Interaction:** Users interact with alarms, acknowledging them
    as needed.

**⚙️ Configs**

-   **Purpose:** Provides configuration options for alarms and trends.

-   **User Interaction:** User navigates through options to create,
    delete, edit trenda or to mute/unmute alarms.

**🔧 Parameters**

-   **Purpose:** Allows users to set available for writing datapoints.

-   **User Interaction:** User uses inline buttons for setting new
    values.
