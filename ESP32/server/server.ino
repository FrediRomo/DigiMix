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




#include <Arduino_JSON.h>  // Include Arduino_JSON library

void handleWebSocketMessage(void *arg, uint8_t *data, size_t len, AsyncWebSocketClient *client)
{
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT)
  {
    // Convert the received data to a string
    String message = String((char*)data, len);
    
    // Print the received message
    Serial.print("Received WebSocket message: ");
    Serial.println(message);

    // Parse the JSON message using Arduino_JSON
    JSONVar jsonObj = JSON.parse(message);

    // Check if parsing succeeded
    if (JSON.typeof(jsonObj) == "undefined") {
      Serial.println("JSON parsing failed!");
      return;
    }

    // Extract specific values from the JSON object
    int channel = int(jsonObj["channel"]);  // Convert to integer
    String value = (const char*) jsonObj["value"]; // Extract "value" as a String

    // Print extracted values
    Serial.print("Channel: ");
    Serial.println(channel);
    Serial.print("Value: ");
    Serial.println(value);

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