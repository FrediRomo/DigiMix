/**
 * @file server.ino
 * @author Alfredo Romo (frediromo@gmail.com)
 * @brief UI server that runs a websocket instance to communicate multiple mixer UI clients
 * @version 0.1
 * @date 2024-11-29
 * 
 * 
 */



#include <Arduino.h>
#include <WiFi.h>
#include <Arduino_JSON.h>
#include "LittleFS.h"
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>


#define UART_BUFFER_SIZE 64

// Network Credentials
const char* ssid = "DIGIMIX";
const char* password = "DIGIMIX";


// Variables to track debounce
unsigned long lastUpdateTime = 0;
const unsigned long debounceDelay = 300;  // Debounce delay in milliseconds


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
    Serial.println("AN ERROR HAS OCCURRED WHILE MOUNTING LITTLEFS");
  }
  Serial.println("LITTLEFS MOUNTED SUCCESSFULLY");
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
    Serial.println("ESP32 ACCESS POINT STARTED");
    Serial.print("IP ADDRESS: ");
    Serial.println(WiFi.softAPIP());
  } else
  {
    Serial.println("FAILED TO START AP");
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




void sendFormattedMessage(const char* format, ...)
{
  char buffer[UART_BUFFER_SIZE]; // default: 64 chars + null terminator
  va_list args;
  va_start(args, format);
  vsnprintf(buffer, sizeof(buffer), format, args);
  va_end(args);

  // Ensure the message is exactly 64 chars long
  int length = strlen(buffer);
  if (length < UART_BUFFER_SIZE) {
    for (int i = length; i < UART_BUFFER_SIZE; i++)
    {
      buffer[i] = ' '; // Padding with spaces
    }
    buffer[UART_BUFFER_SIZE-1] = '\0'; // Null terminator
  }

  Serial.println(buffer); // Send fixed-length message
}



void handleWebSocketMessage(void *arg, uint8_t *data, size_t len, AsyncWebSocketClient *client)
{

  //Debounce messages to avoid bottleneck

  unsigned long currentTime = millis();
  if(currentTime - lastUpdateTime >= debounceDelay)
  {
    lastUpdateTime = currentTime;

    AwsFrameInfo *info = (AwsFrameInfo *)arg;
  
    if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT)
    {
      // Convert the received data to a string
      String message = String((char *)data, len);
      //Serial.print("Received WebSocket message: ");
      //Serial.println(message);

      // Parse the JSON message using Arduino_JSON
      JSONVar jsonObj = JSON.parse(message);

      // Check if parsing succeeded
      if (JSON.typeof(jsonObj) == "undefined")
      {
        Serial.println("JSON PARSING FAILED!");
        return;
      }

      // Check if "ctrl" key exists
      if (!jsonObj.hasOwnProperty("ctrl"))
      {
        Serial.println("Missing 'ctrl' KEY IN JSON!");
        return;
      }

      // Extract specific values from the JSON object
      String ctrlChar = (const char *)jsonObj["ctrl"];  // Extract "ctrl" as a String
      //Serial.print("Control character: ");
      //Serial.println(ctrlChar);

      if (ctrlChar == "v") 
      {  
        if (!jsonObj.hasOwnProperty("channel") || !jsonObj.hasOwnProperty("value"))
        {
          Serial.println("MISSING 'CHANNEL' OR 'VALUE' KEYS!");
          return; 
        }

        int channel = (int)jsonObj["channel"];
        int value = (int)jsonObj["value"];
        // Send formatted 64-char message
        sendFormattedMessage("v,%d,%d", channel, value);
      } 
      else if (ctrlChar == "f")
      {
        if (JSON.typeof(jsonObj["channel"]) == "undefined" || JSON.typeof(jsonObj["filter_id"]) == "undefined" || JSON.typeof(jsonObj["frequency"]) == "undefined" ||  JSON.typeof(jsonObj["gain"]) == "undefined" || JSON.typeof(jsonObj["q"]) == "undefined")
          {
            Serial.println("MISSING OR INVALID KEYS!");
            return;
          }

        int channel = (int)jsonObj["channel"];
        int filter_id = (int)jsonObj["filter_id"];
        int frequency = (int)jsonObj["frequency"];
        double gain = (double)jsonObj["gain"];
        double q = (double)jsonObj["q"];

        // Send formatted 64-char message
        sendFormattedMessage("f,%d,%d,%d,%.1f,%.1f", channel, filter_id, frequency, gain, q);
      } 
      else
      {
        Serial.println("UNKNOWN CONTROL CHARACTER!");
      }

      // Broadcast message to other clients after successful processing
      broadcastToOthers(message, client->id());

    }
  }
}




void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len)
{
  switch (type)
  {
    case WS_EVT_CONNECT:
      //erial.printf("WEBSOCKET CLIENT #%u CONNECTED FROM %s\n", client->id(), client->remoteIP().toString().c_str());
      break;
    case WS_EVT_DISCONNECT:
      //Serial.printf("WEBSOCKET CLIENT #%u DISCONNECTED\n", client->id());
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
  //Serial.println("\n==== INITIALIZING WEBSOCKETS SERVER =====");
  ws.onEvent(onEvent);
  server.addHandler(&ws);
  Serial.println("WEBSOCKETS INITIALIZED SUCCESSFULLY");
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
    //Serial.println("/ Requested");
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