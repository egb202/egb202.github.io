---
layout: default
title: Programming
nav_order: 5
---

# Programming with the QUTy Development Board
{: .no_toc }

The QUTy development board supports two modes through its USB-C interface:
{: .fs-5 .fw-300 }

- Programming through the Unified Program and Debug Interface (UPDI)
- Serial communication through the Universal Asynchronous Receiver/Transmitter (UART)
{: .fs-5 .fw-300 }

UPDI is used for programming and debugging the ATtiny1626
microcontroller. It allows direct access to SRAM, registers, flash,
EEPROM, USERROW, SIGROW, and other fuses.
{: .fs-5 .fw-300 }

UART facilitates serial communication between the QUTy board and a host
machine, enabling data exchange during program execution.
{: .fs-5 .fw-300 }

# Tables of Contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Programming through UPDI

Upon successfully building a project using PlatformIO, the
QUTy platform emits a `firmware.hex` file to the `.pio/build/QUTy/`
directory. This file can be uploaded to the ATtiny1626 using the UPDI
interface on the QUTy board.

This can be done in one of two ways:

- Using the PlatformIO interface
- Using the `pymcuprog` utility

### Uploading Firmware using PlatformIO

1. Connect the QUTy board to the host machine using a USB-C cable.
2. Place the slide switch **S6** on the QUTy board in the UPDI position (left).
3. Upload the firmware using the PlatformIO interface.

A successful upload will result in the following output:

```txt
Configuring upload protocol...
AVAILABLE: updi
CURRENT: upload_protocol = updi
Looking for upload port...
Auto-detected: COM3
Forcing reset using 1200bps open/close on port COM3
Uploading .pio/build/QUTy/firmware.hex
Connecting to SerialUPDI
Pinging device...
Ping response: 1E9429
Erasing device before writing from hex file...
Writing from hex file...
Writing flash...
Done.
======================= [SUCCESS] Took x seconds =======================
```

### Uploading Firmware using `pymcuprog`

1. Connect the QUTy board to the host machine using a USB-C cable.
2. Place the slide switch **S6** on the QUTy board in the UPDI position (left).
3. Execute the following command to erase the device:

   ```txt
   # pymcuprog erase -t uart -u <device-port> -d attiny1626
   ```

   A successful erase will result in the following output:

   ```txt
   Connecting to SerialUPDI
   Pinging device...
   Ping response: 1E9429
   Chip/Bulk erase:
   - Memory type eeprom is conditionally erased (depending upon EESAVE fuse setting)
   - Memory type flash is always erased
   - Memory type lockbits is always erased
   Erased.
   Done.
   ```

4. Execute the following command to upload the firmware:

   ```txt
   # pymcuprog write -t uart -u <device-port> -d attiny1626 -f .pio/build/QUTy/firmware.hex
   ```

   A successful upload will result in the following output:

   ```txt
   Connecting to SerialUPDI
   Pinging device...
   Ping response: 1E9429
   Writing from hex file...
   Writing flash...
   Done.
   ```

## Serial Communication through UART

*Ensure firmware has been uploaded to the QUTy board before reading this section.*

To allow serial communication between the QUTy board and the host
machine:

1. Connect the QUTy board to the host machine using a USB-C cable.
2. Place the slide switch **S6** on the QUTy board in the UART position (right).
3. Open the serial monitor in PlatformIO or use a serial terminal program
   to communicate with the QUTy board, ensuring the UART protocol is
   configured appropriately. By default, the ATtiny1626 uses 9600&mdash;8N1:

   - Baud rate: 9600 bps
   - Data bits: 8 bits
   - Parity: None
   - Stop bits: 1 bit
4. Restart the QUTy board using pushbutton **S5** to restart program
   execution, allowing transmitted data to be received by the host
   machine.
