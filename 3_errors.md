# 3. Common Errors

## PlatformIO Errors

### Undefined Reference to `main`

This error occurs when a `main` function is not defined in source code.
Assembly exercises in this unit do not utilise this memory section, and
must ignore certain library files.

**Code to reproduce:**

```ini
# platformio.ini
[env:QUTy]
platform = quty
board = QUTy
```

**Error:**

```txt
~/.platformio/packages/toolchain-atmelavr/bin/../lib/gcc/avr/7.3.0/../../../../avr/lib/avrxmega3/crtattiny1626.o:../../../../crt1/gcrt1.S:314: undefined reference to `main'
collect2: error: ld returned 1 exit status
*** [.pio/build/QUTy/firmware.elf] Error 1
```

**Solution:**

Add the following key to `platformio.ini`:

```ini
custom_link_flags =
    -nostartfiles
    -nodefaultlibs
```

### No Upload Port Specified

This error occurs when an upload port is unable to be detected
automatically or when an invalid port is specified in `platformio.ini`.

**Error:**

```txt
Error: Please specify `upload_port` for environment or use global `--upload-port` option.
For some development platforms it can be a USB flash drive (i.e. /media/<user>/<device name>)
*** [upload] Explicit exit, status 1
```

**Solution:**

Ensure that the VCP drivers have been correctly installed on the host
machine, and that the QUTy board is connected to a USB port.

Windows users should download the "CP210x VCP Windows" driver from
[Silicon Labs - CP210x VCP Windows](https://www.silabs.com/documents/public/software/CP210x_VCP_Windows.zip).

## UPDI Initialisation Failed

This error occurs when the UPDI interface is unable to communicate with
the ATtiny1626.

**Error:**

```txt
Configuring upload protocol...
AVAILABLE: updi
CURRENT: upload_protocol = updi
Looking for upload port...
Auto-detected: COM3
Forcing reset using 1200bps open/close on port COM3
Uploading .pio/build/QUTy/firmware.hex
Connecting to SerialUPDI
pymcuprog.pymcuprog - ERROR - Operation failed with PymcuprogSerialUpdiError: UPDI initialisation failed
*** [upload] Error 1
======================= [FAILED] Took x seconds =======================
```

**Solution:**

Ensure that the QUTy board is in programming mode (see [Programming through UPDI](1_3_quty.md#programming-through-updi)).

If the error persists, ensure that the VCP drivers have been correctly
installed on the host machine.

## Assembly Errors

### Undefined Reference to Rr

This error occurs when a register is used in place of a non-register
operand.

**Code to reproduce:**

```avrasm
; src/main.S
.section .init0

; Unexpected use of register as second operand
ldi r16, r16
ldi r17, r17
```

**Error:**

```txt
.pio/build/QUTy/src/main.o:(.init0+0x0):
undefined reference to `r16'
.pio/build/QUTy/src/main.o:(.init0+0x2):
undefined reference to `r17'
collect2: error: ld returned 1 exit status
*** [.pio/build/QUTy/firmware.elf] Error 1
```

**Solution:**

Determine the location of the error using the offset from `.init0`, with
the pattern: `.init0+offset`. In the above example:

- `.init0+0x0` refers to the instruction immediately after `.init0`.
- `.init0+0x2` refers to the instruction 2 bytes after `.init0`.

Note that the offset is a count of bytes (8 bits), whereas instructions
are translated into 16-bit/32-bit OP codes.
