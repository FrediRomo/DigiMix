#!/bin/bash

/home/fredi/.arduino15/packages/esp32/tools/mklittlefs/3.0.0-gnu12-dc7f933/mklittlefs -c /home/fredi/Documents/DigiMix/ESP32/server/data -p 256 -b 4096 -s 1441792 /tmp/tmp-9284-rqyVdxr5XVLB-.littlefs.bin

python3 /home/fredi/.arduino15/packages/esp32/tools/esptool_py/4.6/esptool.py --chip esp32 --port /dev/ttyUSB0 --baud 921600 --before default_reset --after hard_reset write_flash -z --flash_mode dio --flash_freq 80m --flash_size detect 2686976 /tmp/tmp-9284-rqyVdxr5XVLB-.littlefs.bin