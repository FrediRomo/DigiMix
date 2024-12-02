# ESP32 webserver for UI

Inside this directory we implemented all the frontend and backend for the UI. The UI allows users to modify and add filters by the integrated equalizers channels. 

- There are 4 channels implemented independent of each other.
- The maximum number of filters per channel is 5.

Websocket is implemented so users connected can visualize changes in real time. All data is sent in real-time via serial to the STM32 to make the calculations needed to modify de input audio.


# PID for motorized fader

Within this directory there is also a file responsible for the PID control of the actuator, which also receives and sends data via serial.
