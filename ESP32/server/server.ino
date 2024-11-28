#include <Arduino.h>
#include <WiFi.h>
#include <Arduino_JSON.h>
#include "LittleFS.h"
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>

// Network Credentials
const char* ssid = "DIGIMIX";
const char* password = "DIGIMIX";

// Create server object on port 8765
AsyncWebServer server(80);

// Create websocket object
AsyncWebSocket ws("/ws");


// INITIALIZE littleFS //
void initLittleFS()
{
  Serial.println("\n==== INITIALIZING littleFS =====");

  if (!LittleFS.begin(true))
  {
    Serial.println("An error has occurred while mounting LittleFS");
  }
  Serial.println("LittleFS mounted successfully");
}

// Initialize WiFi
void initWiFi()
{
  Serial.println("\n==== INITIALIZING WIFI ACCESS POINT =====");
  WiFi.disconnect(true);  // Clear old settings
  delay(1000);

  WiFi.mode(WIFI_AP);

  bool result = WiFi.softAP("DIGIMIX", "algobien");  // Updated SSID

  if(result)
  {
    Serial.println("ESP32 Access Point started");
    Serial.print("IP address: ");
    Serial.println(WiFi.softAPIP());
  } else
  {
    Serial.println("Failed to start AP");
  }
}



void broadcastToOthers(const String &message, uint32_t excludeClientId)
{
  // Iterate through all connected clients
  for (AsyncWebSocketClient *c : ws.getClients()) {
    if (c->id() != excludeClientId) {  // Skip the sender
      c->text(message);
    }
  }
}




void handleWebSocketMessage(void *arg, uint8_t *data, size_t len, AsyncWebSocketClient *client) {
  AwsFrameInfo *info = (AwsFrameInfo *)arg;
  
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    // Convert the received data to a string
    String message = String((char *)data, len);
    Serial.print("Received WebSocket message: ");
    Serial.println(message);

    // Parse the JSON message using Arduino_JSON
    JSONVar jsonObj = JSON.parse(message);

    // Check if parsing succeeded
    if (JSON.typeof(jsonObj) == "undefined")
    {
      Serial.println("JSON parsing failed!");
      return;
    }

    // Check if "ctrl" key exists
    if (!jsonObj.hasOwnProperty("ctrl"))
    {
      Serial.println("Missing 'ctrl' key in JSON!");
      return;
    }

    // Extract specific values from the JSON object
    String ctrlChar = (const char *)jsonObj["ctrl"];  // Extract "ctrl" as a String
    Serial.print("Control character: ");
    Serial.println(ctrlChar);

    if (ctrlChar == "v")
    {  
      // Handle volume-related messages
      // Check if "channel" and "value" keys exist
      if (!jsonObj.hasOwnProperty("channel") || !jsonObj.hasOwnProperty("value"))
      {
        Serial.println("Missing 'channel' or 'value' keys!");
        return; 
      }

      int channel = (int)jsonObj["channel"];  // Convert to integer
      int value = (int)jsonObj["value"];  // Extract "value" as a String

      // Print extracted values
      Serial.print("c:");
      Serial.print(channel);
      Serial.print("v:");
      Serial.println(value);
    } 

    else if (ctrlChar == "f") {  // Handle filter-related messages
  // Check if required keys exist and are of the expected type
  if (JSON.typeof(jsonObj["channel"]) == "undefined" ||
      JSON.typeof(jsonObj["filter_id"]) == "undefined" ||
      JSON.typeof(jsonObj["frequency"]) == "undefined" ||
      JSON.typeof(jsonObj["gain"]) == "undefined" ||
      JSON.typeof(jsonObj["q"]) == "undefined")
  {
    Serial.println("Missing or invalid 'channel', 'filter_id', 'frequency', 'gain', or 'q' keys!");
    return;
  }

  // Extract and cast values from the JSON object
  int channel = (int)jsonObj["channel"];
  int filter_id = (int)jsonObj["filter_id"];
  int frequency = (int)jsonObj["frequency"];
  double gain = (double)jsonObj["gain"];
  double q = (double)jsonObj["q"];

  // Print extracted values for debugging
  Serial.print("Channel:");
  Serial.print(channel);
  Serial.print(",Filter ID:");
  Serial.print(filter_id);
  Serial.print(",Frequency:");
  Serial.print(frequency);
  Serial.print(",Gain:");
  Serial.print(gain , 1);
  Serial.print(",Q:");
  Serial.println(q, 1);


  } 
  else
  {
    Serial.println("Unknown control character!");
  }

  // Broadcast message to other clients after successful processing
  broadcastToOthers(message, client->id());
  
  }
}




void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len)
{
  switch (type)
  {
    case WS_EVT_CONNECT:
      Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
      break;
    case WS_EVT_DISCONNECT:
      Serial.printf("WebSocket client #%u disconnected\n", client->id());
      break;
    case WS_EVT_DATA:
      handleWebSocketMessage(arg, data, len, client);
      break;
    case WS_EVT_PONG:
    case WS_EVT_ERROR:
      break;
  }
}



void initWebSocket()
{
  Serial.println("\n==== INITIALIZING WEBSOCKETS SERVER =====");
  ws.onEvent(onEvent);
  server.addHandler(&ws);
  Serial.println("Websockets initialized successfully");
}



void setup()
{
  Serial.begin(115200);

  initWiFi();
  initLittleFS();
  initWebSocket();
  Serial.println("\n");


    // Web Server Root URL
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(LittleFS, "/index.html", "text/html");
    Serial.println("/ Requested");
  });

  server.serveStatic("/", LittleFS, "/");

  // Start server
  server.begin();

}




void loop()
{
  // Do nothing for now, all is handled on server begin
  ws.cleanupClients();

}