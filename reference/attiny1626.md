---
layout: default
title: ATtiny1626
parent: Reference
nav_order: 1
---

# ATtiny1626

## PORT vs VPORT

Virtual PORTs map frequently used PORT registers such as OUT/DIR/IN into
the I/O memory space.
Either peripheral can be used to achieve the same functionality.

Two factors to consider when choosing between PORT and VPORT are:

- Efficiency
- Functionality

### Efficiency

**VPORT** registers are located in the first 64 bytes of the I/O memory
space (see [Table 8-1. Peripheral Address Map](https://ww1.microchip.com/downloads/aemDocuments/documents/MCU08/ProductDocuments/DataSheets/ATtiny1624-26-27-DataSheet-DS40002234B.pdf#page=62)),
that can be accessed using special single-cycle instructions such as
`in`/`out` and `sbi`/`cbi`.

- `in Rd, A` loads data from the I/O space to a register
- `out A, Rr` stores data from a register to the I/O space
- `sbi A, b` sets the specified bit in an I/O space register
- `cbi A, b` clears the specified bit in an I/O space register

These instructions can be executed in a single CPU cycle (hence the name
single-cycle I/O registers), because they can efficiently access memory
locations within the first 64 bytes of the I/O memory space.

**PORT** registers are also located in the I/O memory space, but beyond the
first 64 bytes. These registers must be accessed using `lds`/`sts`.

- `lds Rd, k` loads data from the data space to a register
- `sts k, Rr` stores data from a register to the data space

These instructions can access 64 kilobytes of the data space, and
therefore require 2 and 3 CPU cycles to execute, for `lds` and
`sts` respectively.

Note that `lds` and `sts` can still access VPORT registers, whereas
`in`/`out` and `sbi`/`cbi` are restricted to single-cycle I/O registers.

### Functionality

The VPORT peripheral maps *frequently used* PORT registers, not all. For
example, [strobe registers](#strobe-registers) and the `PINnCTRL`
registers are not available on VPORT. In these cases, the PORT registers
*must* be used.

For a list of all available registers see:

- [17.4 Register Summary - PORTx](https://ww1.microchip.com/downloads/aemDocuments/documents/MCU08/ProductDocuments/DataSheets/ATtiny1624-26-27-DataSheet-DS40002234B.pdf#page=153)
- [17.6 Register Summary - VPORTx](https://ww1.microchip.com/downloads/aemDocuments/documents/MCU08/ProductDocuments/DataSheets/ATtiny1624-26-27-DataSheet-DS40002234B.pdf#page=166)

### PORT vs VPORT Examples

Each of the following examples are functionally equivalent, but require
different numbers of CPU cycles to execute.

```avrasm
/* Reading from VPORTA.IN */

in r16, VPORTA_IN
; 1 CPU cycle

lds r16, VPORTA_IN
; 3 CPU cycles

lds r16, PORTA_IN
; 3 CPU cycles

/* Setting VPORTA.OUT to 0b0000_0001 */

ldi r16, 0b0000_0001
out VPORTA_OUT, r16
; 1+1 = 2 CPU cycles

ldi r16, 0b0000_0001
sts VPORTA_OUT, r16
; 1+3 = 4 CPU cycles

ldi r16, 0b0000_0001
sts PORTA_OUT, r16
; 1+3 = 4 CPU cycles

/* Setting VPORTA.DIR pin 0 without modifying other pins */

sbi VPORTA_DIR, 0
; 1 CPU cycle

ldi r16, 0b0000_0001
sts PORTA_DIRSET, r16
; 1+3 = 4 CPU cycles

/* Clearing VPORTA.DIR pin 4 without modifying other pins */

cbi VPORTA_DIR, 4
; 1 CPU cycle

ldi r16, 0b0001_0000
sts PORTA_DIRCLR, r16
; 1+3 = 4 CPU cycles
```

## PORT Registers

The I/O pins of the ATtiny1626 are controlled by instances of the PORT
peripheral registers. Each PORT instance has up to eight I/O pins.

### Data Registers

Each PORT pin has a corresponding bit in two **data registers**.

- The **direction register** (`PORTx.DIR`) controls the direction of the
  I/O pins. Setting a bit in the direction register configures the
  corresponding pin as an output, while clearing a bit configures the pin
  as an input.
- The **output register** (`PORTx.OUT`) controls the output state of the
  I/O pins. Setting a bit in the output register configures the
  corresponding pin as high, while clearing a bit configures the pin as
  low.

#### Data Output Register Example

**Operation:**

$$\mathsf{PORTA.OUT} \gets \mathsf{0b0010\ 1000}$$

**Outcome:**

Sets pins 3 and 5, and clears all other pins.

**Assembly code:**

```avrasm
ldi r16, 0b00101000
sts PORTA_OUT, r16
```

**C code:**

```c
PORTA.OUT = 0b00101000;
```

### Strobe Registers

The above data registers also have corresponding **strobe registers**
(also known as pin-specific registers), which are used to modify their
associated data registers in a single operation.

- `{DIR,OUT}SET` is used to **set** the direction/output state of an I/O pin.
- `{DIR,OUT}CLR` is used to **clear** the direction/output state of an I/O pin.
- `{DIR,OUT}TGL` is used to **toggle** the direction/output state of an I/O pin.

These registers are useful for modifying the direction/output state of
multiple pins simultaneously, while preserving the state of other pins.

Strobe registers are recommended for use in preference to data registers,
as they avoid accidental modification of the state of other pins, and
explain the intent of code more clearly.

#### OUTSET Example

**Operation:**

$$\mathsf{PORTA.OUT} \gets \mathsf{PORTA.OUT} \vee \mathsf{0b0010\ 1000}$$

**Outcome:**

Sets pins 3 and 5, and does not modify the state of any other pins.

**Assembly code:**

```avrasm
ldi r16, 0b00101000
sts PORTA_OUTSET, r16

; equivalent to
lds r16, PORTA_OUT
ori r16, 0b00101000
sts PORTA_OUT, r16
```

**C code:**

```c
PORTA.OUTSET = 0b00101000;

// equivalent to
PORTA.OUT |= 0b00101000;
PORTA.OUT = PORTA.OUT | 0b00101000;
```

#### OUTCLR Example

**Operation:**

$$\mathsf{PORTA.OUT} \gets \mathsf{PORTA.OUT} \wedge \sim \!\mathsf{0b0010\ 1000}$$

**Outcome:**

Clears pins 3 and 5, and does not modify the state of any other pins.

**Assembly code:**

```avrasm
ldi r16, 0b00101000
sts PORTA_OUTCLR, r16

; equivalent to
lds r16, PORTA_OUT
ldi r17, 0b00101000
com r17
andi r16, r17
sts PORTA_OUT, r16
```

**C code:**

```c
PORTA.OUTCLR = 0b00101000;

// equivalent to
PORTA.OUT &= ~0b00101000;
PORTA.OUT = PORTA.OUT & ~0b00101000;
```

#### OUTTGL Example

**Operation:**

$$\mathsf{PORTA.OUT} \gets \mathsf{PORTA.OUT} \oplus \mathsf{0b0010\ 1000}$$

**Outcome:**

Toggles pins 3 and 5, and does not modify the state of any other pins.

**Assembly code:**

```avrasm
ldi r16, 0b00101000
sts PORTA_OUTTGL, r16

; equivalent to
lds r16, PORTA_OUT
eor r16, 0b00101000
sts PORTA_OUT, r16
```

**C code:**

```c
PORTA.OUTTGL = 0b00101000;

// equivalent to
PORTA.OUT ^= 0b00101000;
PORTA.OUT = PORTA.OUT ^ 0b00101000;
```

#### Reading from Strobe Registers

Reading from a strobe register has the same effect as reading from its
corresponding data register. For example, each of the following lines of
code assign the same value to `PORTA_DIR_value`.

```c
uint8_t PORTA_DIR_value;

PORTA_DIR_value = PORTA.DIR;
PORTA_DIR_value = PORTA.DIRSET;
PORTA_DIR_value = PORTA.DIRCLR;
PORTA_DIR_value = PORTA.DIRTGL;
```

**Warning:** Strobe registers are designed to eliminate read-modify-write
operations and thus should never be assigned a value derived from their
corresponding data registers (i.e., through a compound assignment).
Failure to adhere to this warning may lead to semantic and logical
errors, while also resulting in wasted CPU cycles.

For example, the following code inadvertently modifies the state of
another pin due to the read from `PORTA.DIRCLR` (which is the same as
reading from `PORTA.DIR`):

```c
// PORTA.DIR = 0b00010010
// desired outcome: clear only pin 4 in PORTA.DIR

// incorrect usage (also clears pin 1)
PORTA.DIRCLR |= 0b00010000;

// equivalent to
PORTA.DIR = PORTA.DIR & ~(PORTA.DIRCLR | 0b00010000);
PORTA.DIR = PORTA.DIR & ~(PORTA.DIR | 0b00010000);

// correct usage
PORTA.DIRCLR = 0b00010000;

// equivalent to
PORTA.DIR = PORTA.DIR & ~0b00010000;
```

### Input Register

The **input register** (`PORTx.IN`) is used to read the state of the I/O
pins when the digital input buffer is enabled.

### Interrupt Flags Register

The **interrupt flags register** (`PORTx.INTFLAGS`) is used to read the
interrupt flags of the I/O pins. The interrupt flags are set when the
change or state of the I/O pin matches the pin's input/sense
configuration in the `PINnCTRL` register.

- Writing a `0` to a bit in the interrupt flags register has no effect
- Writing a `1` to a bit in the interrupt flags register clears the
  corresponding interrupt flag

### Control Registers

The **pin control registers** (`PORTx.PINnCTRL`) are used to configure
the inverted I/O mode, internal pull-up resistor, and input/sense
configuration of the I/O pins.
