#include <Arduino.h>
#include <WiFi.h>
#include <Arduino_JSON.h>
#include "LittleFS.h"
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>

// Network Credentials
const char* ssid = "DIGIMIX";
const char* password = "DIGIMIX";

// Create server object on port 80
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




void notifyClients(String message)
{
  ws.textAll(message);
}

void handleWebSocketMessage(void *arg, uint8_t *data, size_t len)
{
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT)
  {
    // Convert the received data to a string
    String message = String((char*)data, len);
    
    // Print the received message
    Serial.print("Received WebSocket message: ");
    Serial.println(message);
    
    // Optionally, send a response (you can modify this as needed)
    notifyClients("Hola a todos");
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
      handleWebSocketMessage(arg, data, len);
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

}